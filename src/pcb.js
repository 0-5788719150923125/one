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
    let neuron = null
    if (s.t === 'hiddenLayers') {
        neuron = brain.get(s.t).get(s.i).get(s.k).get('weights').get(s.n)
    } else {
        neuron = brain.get(s.t).get('weights').get(s.i)
    }
    neuron.put(s.v)
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
    let synapses = []
    let totalFired = 0
    const layerTypes = ['input', 'output', 'outputConnector', 'hiddenLayers']
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
                    let synapse = brain
                        .get(t)
                        .get(i)
                        .get(k)
                        .get('weights')
                        .map((value, key) => {
                            totalFired++
                            if (isNaN(parseInt(key))) return
                            if (key > maxLength) return
                            if (isNaN(parseInt(value))) return
                            integrateNeuron({ t, i, k, n: key, v: value })
                        })
                    synapses.push(synapse)
                }
            }
        } else {
            let synapse = brain
                .get(t)
                .get('weights')
                .map((value, key) => {
                    totalFired++
                    if (isNaN(parseInt(key))) return
                    if (key > length) return
                    if (isNaN(parseInt(value))) return
                    integrateNeuron({ t, i: key, k: null, n: null, v: value })
                })
            synapses.push(synapse)
        }
    }
    while (totalFired < config.synapseResetThreshold) {
        await delay(5000)
    }
    for (let i = 0; i < synapses.length; i++) {
        synapses[i].off()
        synapses[i] = null
    }
    synapses = null
    registerSynapses(config)
}

async function integrateNeuron(s) {
    worker.postMessage({ s })
}

if (useGun) registerSynapses(config)
