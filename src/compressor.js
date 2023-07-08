import { parentPort } from 'worker_threads'
import { recurrent, utilities } from 'brain.js'
import { TrainStream } from 'train-stream'
import { getRandomData } from './cache.js'
import { ad, bc, elapsedTimeGenerator, randomItemFromArray } from './utils.js'
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

parentPort.on('message', async (data) => {
    if (data.neuron) {
        try {
            if (data.neuron.t === 'hiddenLayers') {
                net.model.hiddenLayers[data.neuron.l][data.neuron.k].weights[
                    data.neuron.i
                ] =
                    (data.neuron.v +
                        net.model.hiddenLayers[data.neuron.l][data.neuron.k]
                            .weights[data.neuron.i]) /
                    2
            } else {
                net.model[data.neuron.t].weights[data.neuron.i] =
                    (data.neuron.v +
                        net.model[data.neuron.t].weights[data.neuron.i]) /
                    2
            }
        } catch (err) {
            console.log(err)
        }
        return
    }
    if (data.compressor !== 'start') return
    let schedule = null
    const timer = elapsedTimeGenerator()

    let lastError = 0

    net.updateTrainingOptions({ errorThresh: config.errorThresh })
    const trainStream = new TrainStream({
        neuralNetwork: net,
        learningRate: config.initialRate,
        errorThresh: config.errorThresh,
        logPeriod: config.logPeriod,
        iterations: config.iterations,
        callbackPeriod: config.callbackPeriod,
        callback: async () => {
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
                    `What is your name?${config.wall}`,
                    test.sample,
                    test.temperature
                )
                console.log(bc.ROOT + text + ad.TEXT)
            }
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
            await fireSynapses(net)
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
            if (isNaN(details.error)) {
                parentPort.postMessage({ compressor: 'failed' })
            }
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

async function fireSynapses(net) {
    const input = randomItemFromArray(net.model.input.weights)
    parentPort.postMessage({
        synapse: { t: 'input', i: input.key, v: input.value }
    })
    const output = randomItemFromArray(net.model.output.weights)
    parentPort.postMessage({
        synapse: { t: 'output', i: output.key, v: output.value }
    })
    const outputConnector = randomItemFromArray(
        net.model.outputConnector.weights
    )
    parentPort.postMessage({
        synapse: {
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
                synapse: {
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
