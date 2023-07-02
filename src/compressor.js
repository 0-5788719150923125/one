import fs from 'node:fs'
import { parentPort } from 'worker_threads'
import { recurrent, utilities } from 'brain.js'
import { TrainStream } from 'train-stream'
import { getRandomData } from './cache.js'
import { ad, bc, delay, elapsedTimeGenerator } from './utils.js'
import config from './config.js'

let currentRate = config.initialRate

const net = new recurrent.GRU({
    hiddenLayers: new Array(config.networkDepth).fill(config.networkWidth),
    learningRate: config.initialRate,
    decayRate: config.decayRate,
    clipval: config.clipval,
    errorThresh: config.errorThresh,
    regc: config.regc,
    maxPredictionLength: 333,
    dataFormatter: new utilities.DataFormatter(
        Array.from(config.inputCharacters)
    )
})

let pause = false
let ourPi = null
parentPort.on('message', async (data) => {
    if (data.ourPi) ourPi = data.ourPi
    if (data.compressor === 'resume') pause = false
    if (data.compressor !== 'start') return
    let schedule = null
    const timer = elapsedTimeGenerator()

    let i = 0
    let latest = '/one/data/compressor.0.json'
    while (fs.existsSync(latest)) {
        i = i + 1
        if (fs.existsSync(`/one/data/compressor.${i.toString()}.json`)) {
            latest = `/one/data/compressor.${i.toString()}.json`
            continue
        }
        console.log('loading saved compressor state...')
        console.log(bc.ROOT + latest + ad.TEXT)
        net.fromJSON(JSON.parse(fs.readFileSync(latest)))
        break
    }

    let lastError = 0

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
                { sample: false, temperature: 0.0 },
                { sample: true, temperature: 0.023 },
                { sample: true, temperature: 0.3 },
                { sample: true, temperature: 0.7 }
            ]

            for (const test of tests) {
                console.log(
                    `generating text at temperature of ${test.temperature.toString()}`
                )
                const text = net.run(
                    `What is your name?${config.wall}`,
                    test.sample,
                    test.temperature
                )
                console.log(bc.ROOT + text + ad.TEXT)
            }

            if (details.iterations === 0) return

            parentPort.postMessage({ myNet: net.toJSON() })

            pause = true
            while (pause === true) {
                await delay(10000)
            }

            let i = 0
            let latest = '/one/data/compressor.0.json'
            fs.mkdirSync('/one/data', { recursive: true })
            while (fs.existsSync(latest)) {
                i = i + 1
                latest = `/one/data/compressor.${i.toString()}.json`
            }
            fs.writeFileSync(latest, JSON.stringify(net.toJSON()))
            if (i >= 3) {
                console.log('truncating nets')
                fs.unlinkSync('/one/data/compressor.0.json')
                fs.renameSync(
                    `/one/data/compressor.1.json`,
                    `/one/data/compressor.0.json`
                )
                fs.renameSync(
                    `/one/data/compressor.2.json`,
                    `/one/data/compressor.1.json`
                )
                fs.renameSync(
                    `/one/data/compressor.3.json`,
                    `/one/data/compressor.2.json`
                )
            }
        },
        floodCallback: async () => {
            while (pause === true) {
                console.log('awaiting permission to continue')
                await delay(1000)
            }

            if (ourPi) net.fromJSON(ourPi)

            let step = schedule?.next()
            if (schedule === null || step.done === true) {
                schedule = cosineScheduler(
                    config.errorThresh,
                    config.initialRate,
                    config.callbackPeriod * 2
                )
                step = schedule.next()
            }
            currentRate = step.value
            net.updateTrainingOptions({
                learningRate: currentRate,
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

async function createBatch(batchSize) {
    const batch = await getRandomData('samples', batchSize)
    return batch.map((string) => {
        const value = JSON.parse(string)
        const maxLength =
            Math.floor(Math.random() * config.trainingContextLength) + 1
        while (value.input.length > maxLength) {
            value.input.shift()
        }
        return `${value.input.join(config.wall)}${config.wall}${value.output}`
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
