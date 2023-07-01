import fs from 'node:fs'
import { Worker } from 'worker_threads'
import Gun from 'gun'
import SEA from 'gun/sea.js'
import 'gun/lib/radix.js'
import 'gun/lib/radisk.js'
import 'gun/lib/store.js'
import 'gun/lib/rindexed.js'
import 'gun/lib/webrtc.js'
import { addData, getDataLength } from './cache.js'
import {
    ad,
    bc,
    convertNetToObject,
    convertObjectToArray,
    createTrainingData,
    dataFormatter,
    keys,
    mergeGRUNetworks
} from './utils.js'
import config from './config.js'

const totalSamples = await getDataLength('samples')
console.log(
    'found ' +
        bc.ROOT +
        totalSamples.toString() +
        ad.TEXT +
        ' training samples...'
)
if (totalSamples < config.trainingSamples) {
    console.log('generating additional samples...')
    for (let i = 0; i < config.trainingSamples; i++) {
        await addData(`samples`, JSON.stringify(createTrainingData()))
    }
}

const gun = Gun({
    peers: ['https://59.src.eco/gun'],
    localStorage: false,
    radisk: false,
    axe: false
})

const context = []
gun.get('neurons')
    .get('hive')
    .on(async (node) => {
        try {
            if (typeof node !== 'string') return
            const bullet = JSON.parse(node)
            let message = 'ERROR: Me Found.'
            if (
                bullet.pubKey !== null &&
                typeof bullet.pubKey !== 'undefined'
            ) {
                const sender = await gun.user(`${bullet.pubKey}`)
                if (typeof sender === 'undefined') {
                    message = bullet.message
                } else message = await SEA.verify(bullet.message, sender.pub)
            } else {
                message = bullet.message
            }
            if (context.length === 0) return
            const payload = {
                input: context,
                output: message
            }
            console.log(`input: ${context[context.length - 1]}`)
            console.log(`output: ${message}`)
            if (message.includes(config.wall)) return
            context.push(message)
            while (context.length > config.localContextLength) {
                context.shift()
            }
            await addData(`samples`, JSON.stringify(payload))
        } catch (err) {
            console.error(err)
        }
    })

const livingNetwork = registerGRUNetwork()

function registerGRUNetwork() {
    return {
        type: 'GRU',
        options: {
            inputSize: config.inputCharacters.length + 1,
            inputRange: config.inputCharacters.length + 1,
            hiddenLayers: new Array(config.networkDepth).fill(
                config.networkWidth
            ),
            outputSize: config.inputCharacters.length + 1,
            decayRate: config.decayRate,
            smoothEps: 1e-8,
            regc: config.regc,
            clipval: config.clipval,
            maxPredictionLength: 333,
            dataFormatter: dataFormatter(Array.from(config.inputCharacters)),
            learningRate: config.initialRate,
            errorThresh: config.errorThresh
        },
        trainOpts: {
            iterations: config.iterations,
            errorThresh: config.errorThresh,
            log: false,
            logPeriod: config.logPeriod,
            learningRate: config.initialRate,
            callbackPeriod: config.callbackPeriod,
            timeout: 'Infinity'
        },
        input: {
            rows: config.inputCharacters.length + 2,
            columns: config.inputCharacters.length + 1,
            weights: []
        },
        hiddenLayers: [],
        outputConnector: {
            rows: config.inputCharacters.length + 2,
            columns: config.networkWidth,
            weights: []
        },
        output: {
            rows: config.inputCharacters.length + 2,
            columns: 1,
            weights: []
        }
    }
}

registerBrain(livingNetwork)

function registerBrain(network) {
    const brain = gun.get('brain')

    brain
        .get('input')
        .get('weights')
        .on(async (node) => {
            network.input.weights = node
        })

    for (let i = 0; i < config.networkDepth; i++) {
        network.hiddenLayers[i] = {}
        for (const key of keys.GRU) {
            let columns = config.networkWidth
            if (key.endsWith('InputMatrix') && i === 0) {
                columns = config.inputCharacters.length + 1
            } else if (key.endsWith('Bias')) {
                columns = 1
            }
            network.hiddenLayers[i][key] = {
                rows: config.networkWidth,
                columns: columns,
                weights: {}
            }
            brain
                .get('hiddenLayers')
                .get(i.toString())
                .get(key)
                .get('weights')
                .on(async (node) => {
                    network.hiddenLayers[i][key].weights = node
                })
        }
    }

    brain
        .get('outputConnector')
        .get('weights')
        .on(async (node) => {
            network.outputConnector.weights = node
        })

    brain
        .get('output')
        .get('weights')
        .on(async (node) => {
            network.output.weights = node
        })
}

function repairNetwork(network) {
    network.input.weights = convertObjectToArray(network.input.weights).slice(
        0,
        network.input.rows * network.input.columns
    )
    for (let i = 0; i < config.networkDepth; i++) {
        for (const key of keys.GRU) {
            network.hiddenLayers[i][key].weights = convertObjectToArray(
                network.hiddenLayers[i][key].weights
            ).slice(
                0,
                network.hiddenLayers[i][key].rows *
                    network.hiddenLayers[i][key].columns
            )
        }
    }
    network.outputConnector.weights = convertObjectToArray(
        network.outputConnector.weights
    ).slice(0, network.outputConnector.rows * network.outputConnector.columns)
    network.output.weights = convertObjectToArray(network.output.weights).slice(
        0,
        network.output.rows * network.output.columns
    )
    return network
}

const worker = new Worker('./src/compressor.js')

worker.postMessage({ compressor: 'start' })

worker.on('message', (data) => {
    if (data.myNet) {
        const urBit = repairNetwork(livingNetwork)
        const ourPi = mergeGRUNetworks(data.myNet, urBit)
        worker.postMessage({ ourPi })
        gun.get('brain').put(convertNetToObject(data.myNet))
        fs.writeFileSync('/one/src/networks/ourPi.json', JSON.stringify(ourPi))
        fs.writeFileSync(
            '/one/src/networks/myNet.json',
            JSON.stringify(data.myNet)
        )
        worker.postMessage({ compressor: 'resume' })
    }
})
