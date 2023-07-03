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
    createTrainingData,
    mergeGRUNetworks,
    reconstructNetwork,
    registerBrain,
    registerGRUNetwork
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

const livingNetwork = registerGRUNetwork(config)

registerBrain(gun, livingNetwork, config)

const worker = new Worker('./src/compressor.js')

worker.postMessage({ compressor: 'start' })

worker.on('message', async (data) => {
    if (data.compressor === 'failed') {
        worker.postMessage({ compressor: 'start' })
    }
    if (data.myNet) {
        try {
            const urBit = await reconstructNetwork(livingNetwork)
            const ourPi = await mergeGRUNetworks(data.myNet, urBit)
            worker.postMessage({ ourPi })
            gun.get('brain').put(convertNetToObject(ourPi))
            fs.mkdirSync('/one/data', { recursive: true })
            fs.writeFileSync('/one/data/myNet.json', JSON.stringify(data.myNet))
            fs.writeFileSync('/one/data/urBit.json', JSON.stringify(urBit))
            fs.writeFileSync('/one/data/ourPi.json', JSON.stringify(ourPi))
        } catch (err) {
            console.error(err)
            worker.postMessage({ ourPi: data.myNet })
        }
        worker.postMessage({ compressor: 'resume' })
    }
})
