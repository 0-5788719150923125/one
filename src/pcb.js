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

const gun = Gun({
    peers: ['https://59.src.eco/gun', 'https://95.src.eco/gun'],
    file: '/gun/data',
    localStorage: false,
    radisk: true,
    axe: false
})

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

// const db = src.get('brain')

setInterval(() => {
    getRandomNeuron(config)
}, config.recieveInterval)

async function fireSynapse(s) {
    await delay(Math.random() * 5000)
    let target = null
    if (s.t === 'hiddenLayers') {
        target = db.get(s.t).get(s.i).get(s.k).get('weights').get(s.n)
    } else {
        target = db.get(s.t).get('weights').get(s.i)
    }
    target.put(s.v)
}

worker.postMessage({ command: 'start' })
worker.on('message', async (data) => {
    if (data.b) {
        if (useGun === 'true') return await fireSynapse(data.b)
    }
    if (data.command === 'failed') {
        return worker.postMessage({ command: 'start' })
    }
})

const neurons = []
function integrateNeuron() {
    if (neurons.length > 0) {
        worker.postMessage({ s: neurons.pop() })
    }
}
setInterval(() => {
    integrateNeuron()
}, config.recieveInterval / 2)

function getRandomNeuron(config) {
    const db = gun.get('src').get('brain')
    const t = randomValueFromArray([
        'input',
        'output',
        'outputConnector',
        'hiddenLayers'
    ])
    let length = 0
    if (t === 'input') {
        length =
            (config.inputCharacters.length + 2) *
            (config.inputCharacters.length + 1)
    } else if (t === 'output') {
        length = config.inputCharacters.length + 2
    } else if (t === 'outputConnector') {
        length = (config.inputCharacters.length + 2) * config.networkWidth
    } else if (t === 'hiddenLayers') {
        length = config.networkDepth
    }
    let i = randomBetween(0, length)
    let n = null
    let k = null
    let neuron = null
    if (['input', 'output', 'outputConnector'].includes(t)) {
        neuron = db.get(t).get('weights').get(i)
    } else {
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
            columns = config.inputCharacters.length + 1
        } else if (k.endsWith('Bias')) {
            columns = 1
        }
        n = randomBetween(0, config.networkWidth * columns)
        neuron = db.get(t).get(i).get(k).get('weights').get(n)
    }

    neuron.once((v) => {
        if (isNaN(parseInt(v))) return
        neurons.push({ t, i, k, n, v })
    })
}
