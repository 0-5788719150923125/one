import { Worker } from 'worker_threads'
import Gun from 'gun'
import SEA from 'gun/sea.js'
import 'gun/lib/radix.js'
import 'gun/lib/radisk.js'
import 'gun/lib/store.js'
import 'gun/lib/rindexed.js'
import 'gun/lib/webrtc.js'
import 'gun/lib/yson.js'
import { addData, getDataLength } from './cache.js'
import {
    ad,
    bc,
    createTrainingData,
    delay,
    keys,
    accumulateGradients,
    reconstructNetwork,
    registerListeners,
    instantiateGRUNetwork,
    randomItemFromArray,
    featherLayer
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
    file: './data/gun',
    localStorage: false,
    radisk: true,
    axe: false
})

const context = []
gun.get('neurons')
    .get(config.focus)
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
            if (message.includes(config.wall)) return
            const payload = {
                input: context,
                output: message
            }
            console.log(`input: ${message}`)
            context.push(message)
            if (context.length <= 1) return
            while (context.length > config.attentionLength) {
                context.shift()
            }
            await addData(`samples`, JSON.stringify(payload))
        } catch (err) {
            console.error(err)
        }
    })

let network = instantiateGRUNetwork(config)
let ourPi = network

const db = gun.get('vector')
registerListeners(db, network, config)

inputResistor(db.get('input').get('weights'), 33.3)
outputResistor(db.get('output').get('weights'), 33.3)
outputConnectorResistor(db.get('outputConnector').get('weights'), 33.3)

for (let i = 0; i < config.networkDepth; i++) {
    const layer = db.get('hiddenLayers').get(i)
    network.hiddenLayers[i] = {}
    for (const j of keys.GRU) {
        const weights = layer.get(j).get('weights')
        let columns = config.networkWidth
        if (j.endsWith('InputMatrix') && i === 0) {
            columns = config.inputCharacters.length + 1
        } else if (j.endsWith('Bias')) {
            columns = 1
        }
        if (!network.hiddenLayers[i][j]) {
            network.hiddenLayers[i][j] = {
                rows: config.networkWidth,
                columns: columns,
                weights: {}
            }
        }
        hiddenLayerResistor(weights, 11.1, i, j)
    }
}

const worker = new Worker('./src/compressor.js')

worker.postMessage({ compressor: 'start' })
worker.on('message', async (data) => {
    if (data.compressor === 'failed' || !data.myNet) {
        return worker.postMessage({ compressor: 'start' })
    }
    try {
        const urBit = await reconstructNetwork(network)
        ourPi = await accumulateGradients(data.myNet, urBit)
        ourPi.input.weights = featherLayer(ourPi.input.weights)
        ourPi.output.weights = featherLayer(ourPi.output.weights)
        ourPi.outputConnector.weights = featherLayer(
            ourPi.outputConnector.weights
        )
        for (let i = 0; i < config.networkDepth; i++) {
            for (const j of keys.GRU) {
                ourPi.hiddenLayers[i][j].weights = featherLayer(
                    ourPi.hiddenLayers[i][j].weights
                )
                // if (Math.random() < 0.5)
                //     ourPi.hiddenLayers[i][j].weights.reverse()
            }
        }
        worker.postMessage({ ourPi })
    } catch (err) {
        console.error(err)
        worker.postMessage({ ourPi: data.myNet })
    }
    worker.postMessage({ compressor: 'resume' })
})

export async function inputResistor(weights, frequency) {
    while (true) {
        await delay(60000 / frequency + Math.random() * 1000)
        const neuron = randomItemFromArray(ourPi.input.weights)
        if (typeof neuron.value !== 'undefined') {
            weights.put({ i: neuron.key, v: neuron.value })
        }
    }
}

export async function outputResistor(weights, frequency) {
    while (true) {
        await delay(60000 / frequency + Math.random() * 1000)
        const neuron = randomItemFromArray(ourPi.output.weights)
        if (typeof neuron.value !== 'undefined') {
            weights.put({ i: neuron.key, v: neuron.value })
        }
    }
}

export async function outputConnectorResistor(weights, frequency) {
    while (true) {
        await delay(60000 / frequency + Math.random() * 1000)
        const neuron = randomItemFromArray(ourPi.outputConnector.weights)
        if (typeof neuron.value !== 'undefined') {
            weights.put({ i: neuron.key, v: neuron.value })
        }
    }
}

export async function hiddenLayerResistor(weights, frequency, i, j) {
    while (true) {
        await delay(60000 / frequency + Math.random() * 1000)
        const neuron = randomItemFromArray(ourPi.hiddenLayers[i][j].weights)
        if (typeof neuron.value !== 'undefined') {
            weights.put({ i: neuron.key, v: neuron.value })
        }
    }
}
