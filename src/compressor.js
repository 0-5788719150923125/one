import fs from 'node:fs'
import { parentPort } from 'worker_threads'
import { recurrent, utilities } from 'brain.js'
import { TrainStream } from 'train-stream'
import { getRandomData } from './cache.js'
import { ad, bc, getRandomIdentity, wall } from './utils.js'

const batchSize = process.env.BATCH_SIZE || 23
const initialRate = 0.001
let currentRate = null
const initialDecay = 0.999
const regc = 0.0001
const clipval = 23
const errorThresh = 0.000001
const logPeriod = 1
const callbackPeriod = 100
const allowedCharacters = `¶abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 ,;:.?!()[]"'\`$@#%^&*-=+-{}\\/`

const net = new recurrent.GRU({
    hiddenLayers: new Array(4).fill(128),
    decayRate: initialDecay,
    learningRate: initialRate,
    clipval,
    errorThresh,
    regc,
    maxPredictionLength: 333,
    dataFormatter: new utilities.DataFormatter(Array.from(allowedCharacters))
})

parentPort.on('message', async (data) => {
    if (data.encoder !== 'start') return

    let lrSchedule = null

    let i = 0
    let latest = '/one/src/networks/encoder.0.json'
    while (fs.existsSync(latest)) {
        i = i + 1
        if (fs.existsSync(`/one/src/networks/encoder.${i.toString()}.json`)) {
            latest = `/one/src/networks/encoder.${i.toString()}.json`
            continue
        }
        console.log('loading saved encoder state...')
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
            console.log('generating text from random id...')
            const text = net.run(`${getRandomIdentity()}${wall}`, false)
            console.log(bc.ROOT + text + ad.TEXT)

            console.log('generating id from previous text...')
            const id = net.run(`${text}${wall}`, false)
            console.log(bc.ROOT + id + ad.TEXT)

            console.log('validation text from generated id...')
            const validation = net.run(`${id}${wall}`, false)
            console.log(bc.ROOT + validation + ad.TEXT)

            if (details.iterations === 0) return

            let i = 0
            let latest = '/one/src/networks/encoder.0.json'
            while (fs.existsSync(latest)) {
                i = i + 1
                latest = `/one/src/networks/encoder.${i.toString()}.json`
            }
            fs.writeFileSync(latest, JSON.stringify(await net.toJSON()))
        },
        floodCallback: async () => {
            let lrStep = lrSchedule?.next()
            if (lrSchedule === null || lrStep.done === true) {
                lrSchedule = cosineScheduler(
                    errorThresh,
                    initialRate,
                    callbackPeriod * 10
                )
                lrStep = lrSchedule.next()
            }
            currentRate = lrStep.value
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
                }, "lr": ${currentRate}, "dr": ${initialDecay}, "error": ${
                    color + details.error + ad.TEXT
                }}`
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
    const batch = await getRandomData('encoder', batchSize)
    return batch.map((string) => {
        const value = JSON.parse(string)
        if (Math.random() < 0.5) {
            return `${value.input}${wall}${getRandomIdentity()}`
        } else {
            return `${getRandomIdentity()}${wall}${value.output}`
        }
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
