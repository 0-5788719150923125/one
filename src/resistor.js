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
import { ad, bc, createTrainingData, delay, keys } from './utils.js'
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
    peers: ['https://59.src.eco/gun', 'https://95.src.eco/gun'],
    file: './data/gun',
    localStorage: false,
    radisk: true,
    axe: false
})

const context = []
gun.get('domain')
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

const worker = new Worker('./src/compressor.js')

const db = gun.get('neuron')

registerListeners(db, config)

async function fireBullet(bullet) {
    try {
        await delay(Math.random() * 5000)
        let target = null
        if (bullet.t === 'hiddenLayers') {
            target = db.get(bullet.t).get(bullet.l).get(bullet.k)
        } else {
            target = db.get(bullet.t)
        }
        target.get('weights').put(JSON.stringify({ i: bullet.i, v: bullet.v }))
    } catch {}
}

worker.postMessage({ command: 'start' })
worker.on('message', async (data) => {
    if (data.bullet) {
        return await fireBullet(data.bullet)
    }
    if (data.command === 'failed') {
        return worker.postMessage({ command: 'start' })
    }
})

function isBullet(data) {
    return typeof data.i === 'number' && typeof data.v === 'number'
}

function registerListeners(db, config) {
    const maxInputLength =
        (config.inputCharacters.length + 2) *
        (config.inputCharacters.length + 1)
    db.get('input')
        .get('weights')
        .on(async (data) => {
            try {
                const bullet = JSON.parse(data)
                if (!isBullet(bullet)) return
                if (bullet.i > maxInputLength) return
                worker.postMessage({
                    bullet: { t: 'input', i: bullet.i, v: bullet.v }
                })
            } catch {}
        })

    const layers = db.get('hiddenLayers')
    for (let i = 0; i < config.networkDepth; i++) {
        const layer = layers.get(i)
        for (const j of keys.GRU) {
            const key = layer.get(j)
            let columns = config.networkWidth
            if (j.endsWith('InputMatrix') && i === 0) {
                columns = config.inputCharacters.length + 1
            } else if (j.endsWith('Bias')) {
                columns = 1
            }
            const maxLayerLength = config.networkWidth * columns
            key.get('weights').on(async (data) => {
                try {
                    const bullet = JSON.parse(data)
                    if (!isBullet(bullet)) return
                    if (bullet.i > maxLayerLength) return
                    worker.postMessage({
                        bullet: {
                            t: 'hiddenLayers',
                            l: i,
                            k: j,
                            i: bullet.i,
                            v: bullet.v
                        }
                    })
                } catch {}
            })
        }
    }

    const maxOutputLength = config.inputCharacters.length + 2
    db.get('output')
        .get('weights')
        .on(async (data) => {
            try {
                const bullet = JSON.parse(data)
                if (!isBullet(bullet)) return
                if (bullet.i > maxOutputLength) return
                worker.postMessage({
                    bullet: { t: 'output', i: bullet.i, v: bullet.v }
                })
            } catch {}
        })

    const maxOutputConnectorLength =
        (config.inputCharacters.length + 2) * config.networkWidth
    db.get('outputConnector')
        .get('weights')
        .on(async (data) => {
            try {
                const bullet = JSON.parse(data)
                if (!isBullet(bullet)) return
                if (bullet.i > maxOutputConnectorLength) return
                worker.postMessage({
                    bullet: { t: 'outputConnector', i: bullet.i, v: bullet.v }
                })
            } catch {}
        })
}
