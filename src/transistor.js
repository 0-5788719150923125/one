import fs from 'fs'
import { NeuralNetwork, recurrent, utilities } from 'brain.js'
import { TrainStream } from 'train-stream'
import { getRandomData } from './cache.js'
import { ad, bc, elapsedTimeGenerator } from './utils.js'
import config from './config.js'
import {
    getEmptyBookContent,
    getRandomCharsBookContent
} from 'babel/src/search.js'
import { ALPHA, CHARS } from 'babel/src/constants.js'
import dfd from 'danfojs-node'
let df = new dfd.DataFrame({ chars: Array.from(ALPHA) })
let encode = new dfd.OneHotEncoder()
encode.fit(df['chars'])

const net_name = process.env.NAME || 'brain'
const networkType = 'transistor'

let currentRate = config.initialRate

let batchSize = config.batchSize

async function trainNetwork() {
    const net = new NeuralNetwork({
        hiddenLayers: new Array(config.networkDepth).fill(config.networkWidth),
        binaryThresh: 0.5
    })

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
        momentum: config.momentum,
        errorThresh: config.errorThresh,
        logPeriod: config.logPeriod,
        iterations: config.iterations,
        callbackPeriod: config.callbackPeriod,
        activation: 'tanh',
        praxis: 'adam',
        callback: async (details) => {
            const input = encode.transform(
                Array.from(`What is your name?${config.wall}`.toLowerCase())
            )
            // const output = net.run(input)
            // const text = output.map((val) => {
            //     print(val)
            //     // if (val > 0) return '1'
            //     // else if (val < 0) return '0'
            //     // else return '010000100100000101000100'
            // })
            // fs.writeFileSync(
            //     '/one/data/query.json',
            //     JSON.stringify(text, null, 2)
            // )
            // console.log(binaryToUnicode(text.join('')))
            // fs.writeFileSync(
            //     `/one/data/${net_name}.${networkType}.json`,
            //     JSON.stringify(net.toJSON(), null, 2)
            // )
        },
        floodCallback: async () => {
            net.updateTrainingOptions({
                learningRate: config.initialRate,
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
        const input = value.input
        // console.log(value)
        const output = value.input.join(config.wall) + config.wall
        const truncateLength =
            Math.floor(Math.random() * config.trainContextLength) + 2
        while (input.length > truncateLength) {
            input.pop()
        }
        const book = getRandomCharsBookContent(input.join(config.wall)).book
        // console.log(input)
        // fs.writeFileSync(
        //     '/one/data/input.txt',
        //     JSON.stringify(getRandomCharsBookContent(input.join(config.wall)))
        // )
        return {
            input: encode.transform(Array.from(book)),
            output: encode.transform(Array.from(output))
        }
    })
}

await trainNetwork()
