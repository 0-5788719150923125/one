import fs from 'node:fs'
import { parentPort } from 'worker_threads'
import { recurrent, utilities } from 'brain.js'
import { TrainStream } from 'train-stream'
import { getRandomData } from './cache.js'
import { ad, bc, contextLength, elapsedTimeGenerator, wall } from './utils.js'

const batchSize = process.env.BATCH_SIZE || 23
const initialRate = 0.001
let currentRate = initialRate
const initialDecay = 0.999
const regc = 0.00001
const clipval = 5
const errorThresh = 0.000001
const logPeriod = 1
const callbackPeriod = 100
const allowedCharacters = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 ,;:.?!()[]"'\`$@#%^&*-=+-{}\\/¶`

const net = new recurrent.GRU({
    hiddenLayers: new Array(9).fill(96),
    decayRate: initialDecay,
    learningRate: initialRate,
    clipval,
    errorThresh,
    regc,
    maxPredictionLength: 333,
    dataFormatter: new utilities.DataFormatter(Array.from(allowedCharacters))
})

parentPort.on('message', async (data) => {
    if (data.compressor !== 'start') return

    let schedule = null
    const timer = elapsedTimeGenerator()

    let i = 0
    let latest = '/one/src/networks/compressor.0.json'
    while (fs.existsSync(latest)) {
        i = i + 1
        if (
            fs.existsSync(`/one/src/networks/compressor.${i.toString()}.json`)
        ) {
            latest = `/one/src/networks/compressor.${i.toString()}.json`
            continue
        }
        console.log('loading saved compressor state...')
        console.log(bc.ROOT + latest + ad.TEXT)
        net.fromJSON(JSON.parse(fs.readFileSync(latest)))
        break
    }

    let lastError = 0

    net.updateTrainingOptions({ errorThresh })
    const trainStream = new TrainStream({
        neuralNetwork: net,
        learningRate: initialRate,
        errorThresh,
        logPeriod,
        iterations: Infinity,
        callbackPeriod,
        callback: async (details) => {
            console.log('generating text...')
            const text = net.run(`What is your name?${wall}`, false)
            console.log(bc.ROOT + text + ad.TEXT)

            if (details.iterations === 0) return

            let i = 0
            let latest = '/one/src/networks/compressor.0.json'
            fs.mkdirSync('/one/src/networks', { recursive: true })
            while (fs.existsSync(latest)) {
                i = i + 1
                latest = `/one/src/networks/compressor.${i.toString()}.json`
            }
            fs.writeFileSync(latest, JSON.stringify(await net.toJSON()))
        },
        floodCallback: async () => {
            let step = schedule?.next()
            if (schedule === null || step.done === true) {
                schedule = cosineScheduler(
                    errorThresh,
                    initialRate,
                    callbackPeriod * 2
                )
                step = schedule.next()
            }
            currentRate = step.value
            net.updateTrainingOptions({
                learningRate: currentRate
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
})

async function createBatch(batchSize) {
    const batch = await getRandomData('samples', batchSize)
    return batch.map((string) => {
        const value = JSON.parse(string)
        const maxLength = Math.floor(Math.random() * contextLength) + 1
        while (value.input.length > maxLength) {
            value.input.shift()
        }
        return `${value.input.join(' ')}${wall}${value.output}`
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
