import fs from 'fs'
import { parentPort } from 'worker_threads'
import { recurrent, utilities } from 'brain.js'
import { TrainStream } from 'train-stream'
import { getRandomData } from './cache.js'
import {
    ad,
    bc,
    randomMask,
    elapsedTimeGenerator,
    getRandomSection,
    randomItemFromArray
} from './utils.js'
import config from './config.js'

const net_name = process.env.NAME || 'brain'
const networkType = 'resistor'

const wall = config.wall

let currentRate = config.initialRate

let decayRate = calculateDecayRate(config.networkWidth, 64, 768, 0.666, 0.99)

const net = new recurrent.GRU({
    hiddenLayers: new Array(config.networkDepth).fill(config.networkWidth),
    learningRate: config.initialRate,
    decayRate: decayRate,
    clipval: config.clipval,
    errorThresh: config.errorThresh,
    regc: config.regc,
    smoothEps: config.smoothEps,
    maxPredictionLength: 333,
    dataFormatter: new utilities.DataFormatter([
        ...Array.from(config.inputCharacters)
    ])
})

parentPort.on('message', async (data) => {
    if (data.bullet) {
        const b = data.bullet
        try {
            if (b.t === 'hiddenLayers') {
                if (b.k === 'resetGateBias' || b.k === 'updateGateBias') {
                    return
                }
                net.model.hiddenLayers[b.l][b.k].weights[b.i] =
                    (b.v + net.model.hiddenLayers[b.l][b.k].weights[b.i]) / 2
            } else {
                net.model[b.t].weights[b.i] =
                    (b.v + net.model[b.t].weights[b.i]) / 2
            }
        } catch {}
        return
    }
    if (data.command !== 'start') return
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
                { temperature: 0.7 },
                { temperature: 1.1 },
                { temperature: 1.23 }
            ]

            for (const test of tests) {
                const question = `What is your name?${wall}`
                const sample = test.temperature === 0 ? false : true

                let text = net.run(question, sample, test.temperature)

                let append = null
                if (text.length > 0 && !text.startsWith(' ')) {
                    append = net.run(question + text, sample, test.temperature)
                }

                text = bc.ROOT + text + ad.TEXT
                if (append) text = text + bc.FOLD + append + ad.TEXT

                console.log(
                    `generating text at temperature of ${test.temperature.toString()}`
                )
                console.log(text)
            }
            if (details.iterations === 0) return
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
                    config.callbackPeriod * config.cbMultiplier
                )
                step = schedule.next()
                step.value = config.errorThresh
            }
            // currentRate = step.value
            currentRate = config.initialRate
            net.updateTrainingOptions({
                learningRate: currentRate,
                iterations: config.iterations,
                errorThresh: config.errorThresh,
                logPeriod: config.logPeriod,
                callbackPeriod: config.callbackPeriod
            })
            await fireBullets(net)
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
            parentPort.postMessage({ command: 'failed' })
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
})

async function fireBullets(net) {
    const input = randomItemFromArray(net.model.input.weights)
    parentPort.postMessage({
        bullet: { t: 'input', i: input.key, v: input.value }
    })
    const output = randomItemFromArray(net.model.output.weights)
    parentPort.postMessage({
        bullet: { t: 'output', i: output.key, v: output.value }
    })
    const outputConnector = randomItemFromArray(
        net.model.outputConnector.weights
    )
    parentPort.postMessage({
        bullet: {
            t: 'outputConnector',
            i: outputConnector.key,
            v: outputConnector.value
        }
    })
    for (let i = 0; i < net.model.hiddenLayers.length; i++) {
        for (const key of Object.keys(net.model.hiddenLayers[i])) {
            const item = randomItemFromArray(
                net.model.hiddenLayers[i][key].weights
            )
            parentPort.postMessage({
                bullet: {
                    t: 'hiddenLayers',
                    l: i,
                    k: key,
                    i: item.key,
                    v: item.value
                }
            })
        }
    }
}

async function createBatch(batchSize) {
    const batch = await getRandomData('samples', batchSize)
    const batched = batch.map((string) => {
        const value = JSON.parse(string)
        const maxLength =
            Math.floor(Math.random() * config.trainContextLength - 2) + 2

        while (value.input.length > maxLength) {
            value.input.shift()
        }

        let data = `${value.input.join(wall)}${wall}${value.output}${wall}`

        return getRandomSection(data)
    })
    return batched
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
