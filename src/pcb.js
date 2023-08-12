import { Worker } from 'worker_threads'
import Gun from 'gun'
import SEA from 'gun/sea.js'
import { addData, getDataLength } from './cache.js'
import {
    ad,
    bc,
    createTrainingData,
    delay,
    randomBetween,
    randomValueFromArray
} from './utils.js'
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
    radisk: true,
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

const context = []
gun.get('src')
    .get('bullets')
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

async function fireSynapse(s) {
    await delay(Math.random() * 5000)
    let neuron = null
    if (s.t === 'hiddenLayers') {
        neuron = gun
            .get('src')
            .get('brain')
            .get(s.t)
            .get(s.i)
            .get(s.k)
            .get('weights')
            .get(s.n)
    } else {
        neuron = gun.get('src').get('brain').get(s.t).get('weights').get(s.i)
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

async function getRandomNeuron() {
    const t = randomValueFromArray([
        'input',
        'output',
        'outputConnector',
        'hiddenLayers'
    ])
    let length = 0
    if (t === 'input') {
        length = (config.charSet.length + 2) * (config.charSet.length + 1)
    } else if (t === 'output') {
        length = config.charSet.length + 2
    } else if (t === 'outputConnector') {
        length = (config.charSet.length + 2) * config.networkWidth
    } else if (t === 'hiddenLayers') {
        length = config.networkDepth
    } else return
    let i = randomBetween(0, length)
    let n = null
    let k = null
    let neuron = null
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
        k = randomValueFromArray(keys)
        let columns = config.networkWidth
        if (k.endsWith('InputMatrix') && i === 0) {
            columns = config.charSet.length + 1
        } else if (k.endsWith('Bias')) {
            columns = 1
        }
        n = randomBetween(0, config.networkWidth * columns)
        neuron = gun
            .get('src')
            .get('brain')
            .get(t)
            .get(i)
            .get(k)
            .get('weights')
            .get(n)
    } else {
        neuron = gun.get('src').get('brain').get(t).get('weights').get(i)
    }
    neuron.once((v) => {
        if (isNaN(parseInt(v))) return
        integrateNeuron({ t, i, k, n, v })
    })
    setTimeout(getRandomNeuron, config.synapseInterval)
}

getRandomNeuron()

async function integrateNeuron(s) {
    worker.postMessage({ s })
}
