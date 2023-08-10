import fs from 'fs'
import { parentPort } from 'worker_threads'
import { recurrent, utilities } from 'brain.js'
import { TrainStream } from 'train-stream'
import { getRandomData } from './cache.js'
import {
    ad,
    bc,
    maskTokens,
    elapsedTimeGenerator,
    getRandomSection,
    randomItemFromArray
} from './utils.js'
import config from './config.js'

const net_name = process.env.NAME || 'brain'
const networkType = 'resistor'
const useGun = process.env.USE_GUN || 'false'

const wall = config.wall

let currentRate = config.initialRate

const decayRate = Number(process.env.DECAY_RATE) || 0.999
const sectionSize = Number(process.env.SECTION_SIZE) || 23
const maskChance = Number(process.env.MASK_CHANCE) || 0.0

const net = new recurrent.GRU({
    hiddenLayers: new Array(config.networkDepth).fill(config.networkWidth),
    learningRate: config.initialRate,
    decayRate: decayRate,
    clipval: config.clipval,
    errorThresh: config.errorThresh,
    regc: config.regc,
    smoothEps: config.smoothEps,
    maxPredictionLength: Number(process.env.PREDICTION_LENGTH) || 333,
    dataFormatter: new utilities.DataFormatter([
        ...Array.from(config.inputCharacters)
    ])
})

parentPort.on('message', async (data) => {
    if (data.b) {
        const b = data.b
        try {
            if (b.t === 'hiddenLayers') {
                net.model.hiddenLayers[b.i][b.k].weights[b.n] =
                    (b.v + net.model.hiddenLayers[b.i][b.k].weights[b.n]) / 2
            } else {
                net.model[b.t].weights[b.i] =
                    (b.v + net.model[b.t].weights[b.i]) / 2
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

            for (const test of tests) {
                const question = `What is your name?${wall}`.toLowerCase()
                const sample = test.temperature === 0 ? false : true

                console.log(
                    `generating text at temperature of ${test.temperature.toString()}`
                )

                let text = net.run(question, sample, test.temperature)

                let append = null
                if (text.length > 0 && text.startsWith(' ') !== true) {
                    let count = 0
                    while (count < 10) {
                        count++
                        append = net.run(
                            question + text,
                            sample,
                            test.temperature
                        )
                        if (append && append !== ' ') count = 10
                    }
                }

                text = bc.ROOT + text + ad.TEXT
                if (append) text = text + bc.FOLD + append + ad.TEXT

                console.log(text)
            }
            if (details.iterations === 0) return
            if (useGun === 'true') await fireBullets(net)
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
        b: { t: 'input', i: input.key, v: input.value }
    })
    const output = randomItemFromArray(net.model.output.weights)
    parentPort.postMessage({
        b: { t: 'output', i: output.key, v: output.value }
    })
    const outputConnector = randomItemFromArray(
        net.model.outputConnector.weights
    )
    parentPort.postMessage({
        b: {
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
                b: {
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

        return maskTokens(
            getRandomSection(data, sectionSize),
            maskChance,
            '2'
        ).toLowerCase()
    })
    return batched
}
