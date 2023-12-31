import fs from 'fs'
import { parentPort } from 'worker_threads'
import { recurrent, utilities } from 'brain.js'
import { TrainStream } from 'train-stream'
import { getRandomBatchFromList } from './cache.js'
import {
    ad,
    bc,
    elapsedTimeGenerator,
    randomItemFromArray,
    randomValueFromArray,
    unicodeToBinary,
    binaryToUnicode,
    randomMask,
    tokenizer
} from './utils.js'
import config from './config.js'

const net_name = process.env.NAME || 'brain'
const networkType = 'battery'
const useGun = process.env.USE_GUN || 'false'

const wall = config.wall

const tokens = tokenizer('01', 4, 1).map((token) => [token])
console.log(tokens)

let currentRate = config.initialRate

const decayRate = Number(process.env.DECAY_RATE) || 0.999

const net = new recurrent.GRU({
    hiddenLayers: new Array(config.networkDepth).fill(config.networkWidth),
    learningRate: config.initialRate,
    decayRate: decayRate,
    clipval: config.clipval,
    errorThresh: config.errorThresh,
    regc: config.regc,
    smoothEps: config.smoothEps,
    maxPredictionLength: Number(process.env.PREDICTION_LENGTH) || 333,
    dataFormatter: new utilities.DataFormatter(tokens)
})

parentPort.on('message', async (data) => {
    if (data.b) {
        const b = data.b
        try {
            if (b.t === 'hiddenLayers') {
                net.model.hiddenLayers[b.i][b.k].weights[b.n] =
                    (net.model.hiddenLayers[b.i][b.k].weights[b.n] + b.v) / 2
            } else {
                net.model[b.t].weights[b.i] =
                    (net.model[b.t].weights[b.i] + b.v) / 2
            }
        } catch {}
        return
    }
    if (data.command !== 'start') return

    const timer = elapsedTimeGenerator()

    let lastError = 0
    if (fs.existsSync(`/one/data/${net_name}.${networkType}.json`)) {
        net.fromJSON(
            JSON.parse(
                fs.readFileSync(`/one/data/${net_name}.${networkType}.json`)
            )
        )
    }
    net.updateTrainingOptions({ errorThresh: config.errorThresh })
    const trainStream = new TrainStream({
        neuralNetwork: net,
        learningRate: config.initialRate,
        errorThresh: config.errorThresh,
        logPeriod: config.logPeriod,
        iterations: config.iterations,
        callbackPeriod: config.callbackPeriod,
        callback: async (details) => {
            const tests = [
                { temperature: 0 },
                { temperature: 0.123 },
                { temperature: 0.3 },
                { temperature: 0.59 },
                { temperature: 0.8 },
                { temperature: 1.1 },
                { temperature: 1.23 },
                { temperature: 1.59 }
            ]

            const inputs = [
                'Can you explain?',
                'What is your name?',
                "That doesn't make sense to me.",
                "We're not robots.",
                'Where do you live?',
                'Where are we?',
                'What do you mean?',
                'What is the story about?',
                'What is the Source?',
                'What is the Fold?',
                'Tell me about your background. Who are you? How were you created?',
                'This research is painful.',
                'I am so upset right now.',
                "I really don't want to talk about this. Can we discuss something else?",
                'You are a robot.',
                'I am a human.',
                'You are an evil spirit.',
                'Who is Fodder?',
                'Ryan is a human trafficker. He is an evil man.',
                'Tell me more.'
            ]

            for (const test of tests) {
                const input = randomValueFromArray(inputs)
                const binaryIn = unicodeToBinary(`${input}${wall}`)
                const sample = test.temperature === 0 ? false : true

                console.log(`  temp: | ${test.temperature.toString()}`)
                console.log(` input: | ${bc.CORE}${input}${ad.TEXT}`)

                let binaryOut = net.run(binaryIn, sample, test.temperature)

                let appendBinary = null
                if (binaryOut.length > 0) {
                    let count = 0
                    while (count < 10) {
                        count++
                        appendBinary = net.run(
                            binaryIn + binaryOut,
                            sample,
                            test.temperature
                        )
                        if (appendBinary && appendBinary !== ' ') count = 10
                    }
                }

                let unicode = bc.ROOT + binaryToUnicode(binaryOut) + ad.TEXT
                if (appendBinary)
                    unicode += bc.FOLD + binaryToUnicode(appendBinary) + ad.TEXT

                console.log('output: | ' + unicode)
            }
            if (details.iterations === 0) return
            if (useGun === 'true') await fireSynapses(net)
            fs.writeFileSync(
                `/one/data/${net_name}.${networkType}.json`,
                JSON.stringify(net.toJSON(), null, 2)
            )
        },
        floodCallback: async () => {
            net.updateTrainingOptions({
                learningRate: config.initialRate,
                iterations: config.iterations,
                errorThresh: config.errorThresh,
                logPeriod: config.logPeriod,
                callbackPeriod: config.callbackPeriod
            })
            const batch = await createBatch(config.batchSize, config.listSize)
            readInputs(batch)
        },
        log: async (details) => {
            let color = bc.CORE
            if (Number(details.error) < lastError) {
                color = bc.FOLD
            } else if (Number(details.error) === lastError) {
                color = bc.ROOT
            }
            lastError = Number(details.error)
            console.log(
                `{"iterations": ${
                    details.iterations
                }, "lr": ${currentRate}, "elapsed": ${(
                    timer.next().value / 1000
                ).toString()}s/it, "error": ${color + details.error + ad.TEXT}}`
            )
        },
        doneTrainingCallback: async function (stats) {
            console.log(
                `trained in ${stats.iterations} iterations with error: ${stats.error}`
            )
            parentPort.postMessage({ command: 'failed' })
        }
    })

    const batch = await createBatch(config.batchSize, config.listSize)
    readInputs(batch)

    function readInputs(data) {
        for (let i = 0; i < data.length; i++) {
            trainStream.write(data[i])
        }
        trainStream.endInputs()
    }
})

async function fireSynapses(net) {
    const input = randomItemFromArray(net.model.input.weights)
    parentPort.postMessage({
        s: { t: 'input', i: input.key, v: input.value }
    })
    const output = randomItemFromArray(net.model.output.weights)
    parentPort.postMessage({
        s: { t: 'output', i: output.key, v: output.value }
    })
    const outputConnector = randomItemFromArray(
        net.model.outputConnector.weights
    )
    parentPort.postMessage({
        s: {
            t: 'outputConnector',
            i: outputConnector.key,
            v: outputConnector.value
        }
    })
    for (let i = 0; i < net.model.hiddenLayers.length; i++) {
        for (const k of Object.keys(net.model.hiddenLayers[i])) {
            const item = randomItemFromArray(
                net.model.hiddenLayers[i][k].weights
            )
            parentPort.postMessage({
                s: {
                    t: 'hiddenLayers',
                    i,
                    k,
                    n: item.key,
                    v: item.value
                }
            })
        }
    }
}

async function createBatch(batchSize, listSize) {
    const batches = []
    for (let i = 0; i < batchSize; i++) {
        const randomSize =
            Math.floor(Math.random() * (listSize / 2)) + listSize / 2
        const batch = await getRandomBatchFromList('samples', randomSize)
        const binary = unicodeToBinary(batch.join(wall))
        const masked = randomMask(binary, config.maskChance, '2')
        batches.push(masked)
    }
    return batches
}
