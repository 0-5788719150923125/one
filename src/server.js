import { Worker } from 'worker_threads'
import Gun from 'gun'
import SEA from 'gun/sea.js'
import 'gun/lib/radix.js'
import 'gun/lib/radisk.js'
import 'gun/lib/store.js'
import 'gun/lib/rindexed.js'
import 'gun/lib/webrtc.js'
import { faker } from '@faker-js/faker'
import { addData, getDataLength } from './cache.js'
import { ad, bc, contextLength, wall } from './utils.js'

const trainingSamples = process.env.TRAINING_SAMPLES || 1000
const totalSamples = await getDataLength('samples')
console.log(
    'found ' +
        bc.ROOT +
        totalSamples.toString() +
        ad.TEXT +
        ' training samples...'
)
if (totalSamples < trainingSamples) {
    console.log('generating additional samples...')
    for (let i = 0; i < trainingSamples; i++) {
        await addData(`samples`, JSON.stringify(createTrainingData()))
    }
}

const gun = Gun({
    peers: ['https://59.src.eco/gun'],
    localStorage: false,
    radisk: false,
    axe: false
})

const context = [faker.hacker.phrase()]
const hive = gun
    .get('neurons')
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
            const payload = {
                input: context,
                output: message
            }
            console.log(`input: ${context[context.length - 1]}`)
            console.log(`output: ${message}`)
            if (message.includes(wall)) return
            context.push(message)
            while (context.length > contextLength) {
                context.shift()
            }
            await addData(`samples`, JSON.stringify(payload))
        } catch (err) {
            console.error(err)
        }
    })

function createTrainingData() {
    return {
        input: [faker.hacker.phrase()],
        output: faker.hacker.phrase()
    }
}

const worker = new Worker('./src/compressor.js')

worker.postMessage({ compressor: 'start' })

worker.on('message', (message) => {
    console.log(message)
})
