import fs from 'node:fs'
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
    convertNetToObject,
    createTrainingData,
    keys,
    mergeGRUNetworks,
    reconstructNetwork,
    registerBrain,
    instantiateGRUNetwork
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
            while (context.length > config.localContextLength) {
                context.shift()
            }
            await addData(`samples`, JSON.stringify(payload))
        } catch (err) {
            console.error(err)
        }
    })

const network = instantiateGRUNetwork(config)

registerBrain(gun, network, config)

const worker = new Worker('./src/compressor.js')

worker.postMessage({ compressor: 'start' })

worker.on('message', async (data) => {
    if (data.compressor === 'failed') {
        worker.postMessage({ compressor: 'start' })
    }
    if (data.myNet) {
        try {
            const urBit = await reconstructNetwork(network)
            const ourPi = await mergeGRUNetworks(data.myNet, urBit)
            worker.postMessage({ ourPi })
            const objectified = convertNetToObject(ourPi)
            // const net = gun.get('vector').put(objectified.input.weights)
            // console.log(objectified.input.weights)
            // gun.get('things').put(null)
            gun.get('vectors')
                .get('input')
                .get('weights')
                .set(objectified.input.weights)
            gun.get('vectors')
                .get('output')
                .get('weights')
                .set(objectified.output.weights)
            gun.get('vectors')
                .get('outputConnector')
                .get('weights')
                .set(objectified.outputConnector.weights)
            for (let i = 0; i < config.networkDepth; i++) {
                network.hiddenLayers[i] = {}
                for (const ki of keys.GRU) {
                    let columns = config.networkWidth
                    if (ki.endsWith('InputMatrix') && i === 0) {
                        columns = config.inputCharacters.length + 1
                    } else if (ki.endsWith('Bias')) {
                        columns = 1
                    }
                    network.hiddenLayers[i][ki] = {
                        rows: config.networkWidth,
                        columns: columns,
                        weights: {}
                    }
                    gun.get('vectors')
                        .get('hiddenLayers')
                        .get(i.toString())
                        .get(ki)
                        .get('weights')
                        .set(objectified.hiddenLayers[i][ki].weights)
                }
            }
            // gun.get('state1')
            //     .get('input')
            //     .get('weights')
            //     .put(objectified.input.weights)
            // fs.mkdirSync('/one/data', { recursive: true })
            // fs.writeFileSync(
            //     '/one/data/object.json',
            //     JSON.stringify(convertNetToObject(ourPi))
            // )
            // fs.writeFileSync('/one/data/myNet.json', JSON.stringify(data.myNet))
            // fs.writeFileSync('/one/data/urBit.json', JSON.stringify(urBit))
            // fs.writeFileSync('/one/data/ourPi.json', JSON.stringify(ourPi))
        } catch (err) {
            console.error(err)
            worker.postMessage({ ourPi: data.myNet })
        }
        worker.postMessage({ compressor: 'resume' })
    }
})
