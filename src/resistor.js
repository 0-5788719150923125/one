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
    delay,
    keys,
    accumulateGradients,
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

const db = gun.get('vector')
worker.on('message', async (data) => {
    if (data.compressor === 'failed') {
        worker.postMessage({ compressor: 'start' })
    }
    if (data.myNet) {
        try {
            const urBit = await reconstructNetwork(network)
            const ourPi = await accumulateGradients(data.myNet, urBit)
            worker.postMessage({ ourPi })
            const inputs = db.get('input').get('weights')
            for (let i = 0; i < ourPi.input.weights.length; i++) {
                if (Math.random() > 0.001) continue
                inputs.put({ i: i, v: ourPi.input.weights[i] })
            }
            const outputs = db.get('output').get('weights')
            for (let i = 0; i < ourPi.output.weights.length; i++) {
                if (Math.random() > 0.001) continue
                outputs.put({ i: i, v: ourPi.output.weights[i] })
            }
            const connectors = db.get('outputConnector').get('weights')
            for (let i = 0; i < ourPi.outputConnector.weights.length; i++) {
                if (Math.random() > 0.001) continue
                connectors.put({ i: i, v: ourPi.outputConnector.weights[i] })
            }
            for (let i = 0; i < config.networkDepth; i++) {
                const layer = db.get('hiddenLayers').get(i)
                if (!network.hiddenLayers[i]) network.hiddenLayers[i] = {}
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
                    for (
                        let k = 0;
                        k < ourPi.hiddenLayers[i][j].weights.length;
                        k++
                    ) {
                        if (Math.random() > 0.001) continue
                        weights.put({
                            i: k,
                            v: ourPi.hiddenLayers[i][j].weights[k]
                        })
                    }
                }
            }
        } catch (err) {
            console.error(err)
            worker.postMessage({ ourPi: data.myNet })
        }
        worker.postMessage({ compressor: 'resume' })
    }
})
