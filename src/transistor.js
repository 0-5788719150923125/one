import fs from 'fs'
import { parentPort } from 'worker_threads'
import { recurrent, utilities } from 'brain.js'
import { TrainStream } from 'train-stream'
import { getRandomData } from './cache.js'
import {
    ad,
    bc,
    dropout,
    elapsedTimeGenerator,
    featherLayer,
    binaryToUnicode,
    unicodeToBinary
} from './utils.js'
import config from './config.js'

const net_name = process.env.NAME || 'brain1'

let currentRate = config.initialRate

let decayRate = calculateDecayRate(config.networkWidth, 64, 768, 0.111, 0.999)

async function trainNetwork() {
    const net = new recurrent.RNN({
        hiddenLayers: [64, 64, 64],
        learningRate: config.initialRate,
        decayRate: decayRate,
        clipval: config.clipval,
        errorThresh: config.errorThresh,
        regc: config.regc,
        smoothEps: 1e-11,
        maxPredictionLength: 999,
        dataFormatter: new utilities.DataFormatter(Array.from('01'))
    })

    let schedule = null
    const timer = elapsedTimeGenerator()

    let lastError = 0
    if (fs.existsSync(`/one/data/${net_name}-RNN.json`)) {
        net.fromJSON(
            JSON.parse(fs.readFileSync(`/one/data/${net_name}-RNN.json`))
        )
    }
    net.updateTrainingOptions({
        errorThresh: config.errorThresh
    })
    const trainStream = new TrainStream({
        neuralNetwork: net,
        learningRate: config.initialRate,
        errorThresh: config.errorThresh,
        logPeriod: config.logPeriod,
        iterations: config.iterations,
        callbackPeriod: config.callbackPeriod,
        callback: async (details) => {
            const tests = [
                { sample: false, temperature: 0.0 },
                { sample: true, temperature: 0.023 },
                { sample: true, temperature: 0.123 },
                { sample: true, temperature: 0.3 },
                { sample: true, temperature: 0.7 }
            ]

            for (const test of tests) {
                console.log(
                    `generating text at temperature of ${test.temperature.toString()}`
                )
                const text = net.run(
                    unicodeToBinary(
                        `Who are you?${config.wall}2${config.wall}Where are you from?${config.wall}2${config.wall}What is your name?${config.wall}1${config.wall}`
                    ),
                    test.sample,
                    test.temperature
                )
                console.log(bc.ROOT + binaryToUnicode(text) + ad.TEXT)
            }
            if (details.iterations === 0) return
            fs.writeFileSync(
                `/one/data/${net_name}-RNN.json`,
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
            // net.model.input.weights = featherLayer(net.model.input.weights)
            // for (let i = 0; i < config.networkDepth; i++) {
            //     net.model.hiddenLayers[i].weight.weights = featherLayer(
            //         net.model.hiddenLayers[i].weight.weights
            //     )
            //     net.model.hiddenLayers[i].bias.weights = featherLayer(
            //         net.model.hiddenLayers[i].bias.weights
            //     )
            //     net.model.hiddenLayers[i].transition.weights = featherLayer(
            //         net.model.hiddenLayers[i].transition.weights
            //     )
            // }
            // net.model.outputConnector.weights = featherLayer(
            //     net.model.outputConnector.weights
            // )
            // net.model.output.weights = featherLayer(net.model.output.weights)
            const batch = await createBatch(config.batchSize)
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

    const batch = await createBatch(config.batchSize)
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
        const maxLength =
            Math.floor(Math.random() * config.maxTrainingContextLength - 2) + 2
        while (value.input.length > maxLength) {
            value.input.shift()
        }
        return dropout(
            unicodeToBinary(
                `${value.input.join(config.wall + '2' + config.wall)}${
                    config.wall + '1' + config.wall
                }${value.output}${config.wall}`
            ),
            0.1
        )
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
