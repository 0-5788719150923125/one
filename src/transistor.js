import fs from 'fs'
import { NeuralNetwork, recurrent, utilities } from 'brain.js'
import { TrainStream } from 'train-stream'
import { getRandomData } from './cache.js'
import {
    ad,
    bc,
    binaryToUnicode,
    chunkString,
    dropout,
    elapsedTimeGenerator,
    generateRandomBinaryString,
    getRandomLowNumber,
    getRandomSubset,
    unicodeToBinary,
    padArray
} from './utils.js'
import config from './config.js'

const net_name = process.env.NAME || 'brain'
const networkType = 'transistor'

let currentRate = config.initialRate

let batchSize = 32

async function trainNetwork() {
    const net = new NeuralNetwork({
        hiddenLayers: new Array(128).fill(128),
        binaryThresh: 0.5
    })

    let schedule = null
    const timer = elapsedTimeGenerator()

    let lastError = 0
    if (fs.existsSync(`/one/data/${net_name}.${networkType}.json`)) {
        net.fromJSON(
            JSON.parse(
                fs.readFileSync(`/one/data/${net_name}.${networkType}.json`)
            )
        )
    }
    net.updateTrainingOptions({
        errorThresh: config.errorThresh
    })
    const trainStream = new TrainStream({
        neuralNetwork: net,
        learningRate: config.initialRate,
        momentum: 0.1,
        errorThresh: config.errorThresh,
        logPeriod: config.logPeriod,
        iterations: config.iterations,
        callbackPeriod: config.callbackPeriod,
        activation: 'tanh',
        praxis: 'adam',
        callback: async (details) => {
            const input = padArray(
                unicodeToBinary(
                    `Who are you?${config.wall}2${config.wall}Where are you from?${config.wall}2${config.wall}What is your name?${config.wall}1${config.wall}`
                )
                    .split('')
                    .map((char) => {
                        if (char === '1') return 1
                        if (char === '0') return -1
                    }),
                'both'
            )
            const output = Array.from(net.run(input))
            const text = output.map((val) => {
                if (val > 0) return '1'
                else if (val < 0) return '0'
                else return '010000100100000101000100'
            })
            fs.writeFileSync(
                '/one/data/query.json',
                JSON.stringify(text, null, 2)
            )
            console.log(binaryToUnicode(text.join('')))
            fs.writeFileSync(
                `/one/data/${net_name}.${networkType}.json`,
                JSON.stringify(net.toJSON(), null, 2)
            )
        },
        floodCallback: async () => {
            let step = schedule?.next()
            if (schedule === null || step.done === true) {
                schedule = cosineScheduler(
                    config.errorThresh,
                    config.initialRate,
                    config.callbackPeriod * 2
                )
                step = schedule.next()
                step.value = config.errorThresh
            }
            currentRate = step.value
            net.updateTrainingOptions({
                learningRate: currentRate,
                iterations: config.iterations,
                errorThresh: config.errorThresh,
                logPeriod: config.logPeriod,
                callbackPeriod: config.callbackPeriod
            })
            const batch = await createBatch(batchSize)
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
                ).toString()}/s, "error": ${color + details.error + ad.TEXT}}`
            )
        },
        doneTrainingCallback: async function (stats) {
            console.log(
                `trained in ${stats.iterations} iterations with error: ${stats.error}`
            )
            await trainNetwork()
        }
    })

    const batch = await createBatch(batchSize)
    readInputs(batch)

    function readInputs(data) {
        for (let i = 0; i < data.length; i++) {
            trainStream.write(data[i])
        }
        trainStream.endInputs()
    }
}

async function createBatch(batchSize) {
    const batch = await getRandomData('samples', batchSize)
    return batch.map((string) => {
        const value = JSON.parse(string)
        const maxLength = Math.floor(Math.random() * 3) + 2
        while (value.input.length > maxLength) {
            value.input.shift()
        }
        const input = padArray(
            dropout(
                unicodeToBinary(
                    `${value.input.join(config.wall + '2' + config.wall)}${
                        config.wall
                    }1${config.wall}`
                ),
                0.1
            )
                .split('')
                .map((char) => {
                    if (char === '1') return 1
                    if (char === '0') return -1
                    if (char === '2') return 0
                }),
            'both'
        )
        const output = padArray(
            unicodeToBinary(`${value.output}${config.wall}`)
                .split('')
                .map((char) => {
                    if (char === '1') return 1
                    if (char === '0') return -1
                }),
            'right'
        )
        fs.writeFileSync('/one/data/input.json', JSON.stringify(input, null, 2))
        fs.writeFileSync(
            '/one/data/output.json',
            JSON.stringify(output, null, 2)
        )
        return { input, output }
    })
}

function* cosineScheduler(max, min, iterations) {
    const range = max - min
    const halfIterations = iterations / 2

    for (let i = 0; i < iterations; i++) {
        const cosValue = Math.cos((Math.PI * i) / halfIterations)
        const currentValue = min + 0.5 * range * (1 + cosValue)
        yield currentValue
    }
}

function calculateDecayRate(integerValue, minInt, maxInt, min, max) {
    if (integerValue <= minInt) {
        return max
    } else if (integerValue >= maxInt) {
        return min
    } else {
        const slope = (max - min) / (minInt - maxInt)
        const intercept = max - slope * minInt
        return slope * integerValue + intercept
    }
}

await trainNetwork()
