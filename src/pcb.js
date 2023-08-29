import { Worker } from 'worker_threads'
import Gun from 'gun'
import SEA from 'gun/sea.js'
import { addData, getDataLength } from './cache.js'
import { ad, bc, createTrainingData, delay } from './utils.js'
import config from './config.js'

const networkType = process.env.NETWORK_TYPE || 'resistor'
const useGun = process.env.USE_GUN || 'false'

const totalSamples = await getDataLength('samples')
console.log(
    'found ' +
        bc.ROOT +
        totalSamples.toString() +
        ad.TEXT +
        ' training samples...'
)
console.log('training ' + bc.ROOT + networkType + ad.TEXT + ' network')
if (totalSamples < config.trainingSamples) {
    console.log('generating additional samples...')
    for (let i = 0; i < config.trainingSamples; i++) {
        await addData(`samples`, JSON.stringify(createTrainingData()))
    }
}

const bootstrapPeers = config.bootstrapPeers

const gun = Gun({
    peers: bootstrapPeers,
    file: './gun',
    localStorage: false,
    radisk: false,
    axe: false
})

async function managePeers() {
    const peers = gun.back('opt.peers')
    for (const i of bootstrapPeers) {
        const state = peers[i]?.wire?.readyState
        if (state === 0 || state === null || typeof state === 'undefined') {
            gun.opt({ peers: [...bootstrapPeers] })
        }
    }
    setTimeout(managePeers, 15000)
}

managePeers()

const src = gun.get('src')

const context = []
src.get('bullets')
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

const worker = new Worker(`./src/${networkType}.js`)

const brain = src.get('brain')

async function fireSynapse(s) {
    await delay(Math.random() * 5000)
    if (s.t === 'hiddenLayers') {
        brain
            .get(s.t)
            .get(s.i)
            .get(s.k)
            .get('weights')
            .put(JSON.stringify({ i: s.n, v: s.v }))
    } else {
        brain
            .get(s.t)
            .get('weights')
            .put(JSON.stringify({ i: s.i, v: s.v }))
    }
}

worker.postMessage({ command: 'start' })
worker.on('message', async (data) => {
    if (data.s) {
        if (useGun === 'true') return await fireSynapse(data.s)
    }
    if (data.command === 'failed') {
        return worker.postMessage({ command: 'start' })
    }
})

async function registerSynapses(config) {
    const layerTypes = [
        'input',
        // 'output',
        'outputConnector',
        'hiddenLayers'
    ]
    for (const t of layerTypes) {
        let length = 0
        if (t === 'input') {
            length = (config.charSet.length + 2) * (config.charSet.length + 1)
        } else if (t === 'output') {
            length = config.charSet.length + 2
        } else if (t === 'outputConnector') {
            length = (config.charSet.length + 2) * config.networkWidth
        } else if (t === 'hiddenLayers') {
            length = config.networkDepth
        }
        if (t === 'hiddenLayers') {
            const keys = [
                'updateGateInputMatrix',
                'updateGateHiddenMatrix',
                // 'updateGateBias',
                'resetGateInputMatrix',
                'resetGateHiddenMatrix',
                // 'resetGateBias',
                'cellWriteInputMatrix',
                'cellWriteHiddenMatrix',
                'cellWriteBias'
            ]
            for (let i = 0; i < length; i++) {
                for (const k of keys) {
                    const rows = config.networkWidth
                    let columns = config.networkWidth
                    if (k.endsWith('InputMatrix') && i === 0) {
                        columns = config.charSet.length + 1
                    } else if (k.endsWith('Bias')) {
                        columns = 1
                    }
                    const maxLength = rows * columns
                    brain
                        .get(t)
                        .get(i)
                        .get(k)
                        .get('weights')
                        .on((data) => {
                            try {
                                const s = JSON.parse(data)
                                if (isNaN(parseInt(s.i))) return
                                if (s.i > maxLength) return
                                if (isNaN(parseInt(s.v))) return
                                integrateNeuron({ t, i, k, n: s.i, v: s.v })
                            } catch {}
                        })
                }
            }
        } else {
            brain
                .get(t)
                .get('weights')
                .on((data) => {
                    try {
                        const s = JSON.parse(data)
                        if (isNaN(parseInt(s.i))) return
                        if (s.i > length) return
                        if (isNaN(parseInt(s.v))) return
                        integrateNeuron({ t, i: s.i, k: null, n: null, v: s.v })
                    } catch {}
                })
        }
    }
}

async function integrateNeuron(s) {
    worker.postMessage({ s })
}

if (useGun === 'true') registerSynapses(config)
