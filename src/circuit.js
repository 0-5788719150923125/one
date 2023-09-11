import fs from 'fs'
import { parentPort } from 'worker_threads'
import { recurrent, utilities } from 'brain.js'
import { TrainStream } from 'train-stream'
import { getRandomBatchFromList, getListLength } from './cache.js'
import {
    ad,
    bc,
    buildBytePairVocabulary,
    buildWordLevelTokenizer,
    getIdentity,
    getRandomFloat,
    getRandomSubset,
    elapsedTimeGenerator,
    randomItemFromArray,
    randomValueFromArray,
    roundUpToNearestWhole,
    tokenizer
} from './utils.js'
import config from './config.js'

const net_name = process.env.NAME || 'brain'
const networkType = 'circuit'
const useGun = process.env.USE_GUN || 'false'

const wall = config.wall

let currentRate = config.initialRate

// const length = await getListLength('samples')
// const trainingData = await getRandomBatchFromList('samples', length)
// const tokens = buildWordLevelTokenizer(trainingData, 1000)
// console.log(tokens)
// fs.writeFileSync('./data/tokens.json', JSON.stringify(tokens, null, 2))

// const hashed = {}
// const reversed = {}
// tokens.map((token) => {
//     const identity = Number(getIdentity(token))
//     hashed[token] = identity
//     reversed[identity] = token
// })
// fs.writeFileSync('./data/hashed.json', JSON.stringify(hashed, null, 2))

const vocab = config.charSet.split('')

const decayRate = Number(process.env.DECAY_RATE) || 0.999

// const net = new recurrent.LSTMTimeStep({
//     inputSize: 1,
//     hiddenLayers: [10],
//     outputSize: 1,
//     clipval: getIdentity()
// })

// net.train([
//     [1, 2, 3],
//     [4, 5, 6],
//     [7, 8, 9]
// ])

// const output = net.run([7, 2, 3])

// console.log(output)
// fs.writeFileSync('./data/net.json', JSON.stringify(net.toJSON(), null, 2))

const net = new recurrent.GRUTimeStep({
    hiddenLayers: new Array(config.networkDepth).fill(config.networkWidth),
    learningRate: config.initialRate,
    decayRate: decayRate,
    clipval: Number.MAX_SAFE_INTEGER,
    errorThresh: config.errorThresh,
    regc: config.regc,
    smoothEps: config.smoothEps,
    maxPredictionLength: Number(process.env.PREDICTION_LENGTH) || 333
    // inputSize: 1,
    // inputRange: 1,
    // outputSize: 1
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
                const normalized = `${input}${wall}`.toLowerCase() + wall
                // const tokens = buildWordLevelTokenizer(input, 1000)
                const tokenized = Array.from(normalized).map((token) => {
                    // return Number(getIdentity(token))
                    if (vocab.includes(token)) {
                        return vocab.indexOf(token)
                    } else return -1
                })
                // console.log([tokenized])
                const sample = test.temperature === 0 ? false : true

                console.log(`  temp: | ${test.temperature.toString()}`)
                console.log(` input: | ${bc.CORE}${input}${ad.TEXT}`)
                let converted = ''
                for (let i = 0; i < 23; i++) {
                    let result = net.run(tokenized, sample, test.temperature)
                    let rounded = roundUpToNearestWhole(result)
                    let char = vocab[rounded]
                    if (typeof char === 'undefined') continue
                    converted += char
                    tokenized.shift()
                    tokenized.push(rounded)
                }
                console.log('output: | ' + bc.FOLD + converted + ad.TEXT)

                // let append = null
                // if (result.length > 0) {
                //     let count = 0
                //     while (count < 10) {
                //         count++
                //         append = net.run(
                //             [...tokenized, ...result],
                //             sample,
                //             test.temperature
                //         )
                //         if (append && append.length > 0) count = 10
                //     }
                // }

                // if (!result) continue
                // console.log(result)
                // let text = result
                //     .map((identity) => {
                //         return reversed[identity] || '[REDACTED]'
                //     })
                //     .join(' ')
                // text = bc.ROOT + text + ad.TEXT
                // if (append) {
                //     let extra = append
                //         .map((identity) => {
                //             return reversed[identity] || '[REDACTED]'
                //         })
                //         .join(' ')
                //     text = text + bc.FOLD + extra + ad.TEXT
                // }

                // console.log('output: | ' + text)
            }
            if (details.iterations === 0) return
            if (useGun === 'true') await fireSynapses(net)
            fs.writeFileSync(
                `/one/data/${net_name}.${networkType}.json`,
                JSON.stringify(net.toJSON(), null, 2)
            )
        },
        floodCallback: async () => {
            // currentRate = getRandomFloat(0.00001, 0.01)
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
        const batch = await getRandomBatchFromList('samples', listSize)
        const normalized = batch.join(wall).toLowerCase()
        const chunked = getRandomSubset(normalized, listSize, listSize)
        const tokenized = Array.from(chunked).map((token) => {
            if (vocab.includes(token)) {
                return vocab.indexOf(token)
            } else return -1
        })
        batches.push(tokenized)
    }
    return batches
}
