import { faker } from '@faker-js/faker'

export const bc = {
    FOLD: '\x1b[34m',
    ROOT: '\x1b[32m',
    CORE: '\x1b[31m'
}

export const ad = {
    TEXT: '\x1b[0m'
}

export const keys = {
    GRU: [
        'updateGateInputMatrix',
        'updateGateHiddenMatrix',
        'updateGateBias',
        'resetGateInputMatrix',
        'resetGateHiddenMatrix',
        'resetGateBias',
        'cellWriteInputMatrix',
        'cellWriteHiddenMatrix',
        'cellWriteBias'
    ]
}

export const delay = (ms) => new Promise((res) => setTimeout(res, ms))

export function randomItemFromArray(array) {
    const key = Math.floor(Math.random() * array.length)
    const value = array[key]
    return { key, value }
}

export function createTrainingData() {
    return {
        input: [faker.hacker.phrase()],
        output: faker.hacker.phrase()
    }
}

export function* elapsedTimeGenerator() {
    let previousTime = new Date()

    while (true) {
        const currentTime = new Date()
        const elapsedTime = currentTime - previousTime
        previousTime = currentTime

        yield elapsedTime
    }
}

export function getRandomIdentity() {
    const length = Math.random() < 0.5 ? 18 : 19

    let randomNumber = (Math.floor(Math.random() * 9) + 1).toString()
    while (randomNumber.length < length) {
        randomNumber = randomNumber + Math.floor(Math.random() * 10).toString()
    }
    return randomNumber
}

export function convertObjectToArray(obj) {
    const arr = []
    for (let key in obj) {
        arr[key] = obj[key]
    }
    return arr
}

export function averageArrays(arr1, arr2) {
    const maxLength = Math.max(arr1.length, arr2.length)
    const averagedArray = []

    for (let i = 0; i < maxLength; i++) {
        const value1 = arr1[i] !== undefined ? arr1[i] : arr2[i]
        const value2 = arr2[i] !== undefined ? arr2[i] : arr1[i]
        const average = (value1 + value2) / 2
        averagedArray.push(average)
    }

    return averagedArray
}

export async function accumulateGradients(myNet, urBit) {
    return {
        type: myNet.type,
        options: {
            inputSize: myNet.options.inputSize,
            inputRange: myNet.options.inputRange,
            hiddenLayers: myNet.options.hiddenLayers,
            outputSize: myNet.options.outputSize,
            decayRate: myNet.options.decayRate,
            smoothEps: myNet.options.smoothEps,
            regc: myNet.options.regc,
            clipval: myNet.options.clipval,
            maxPredictionLength: myNet.options.maxPredictionLength,
            dataFormatter: {
                indexTable: myNet.options.dataFormatter.indexTable,
                characterTable: myNet.options.dataFormatter.characterTable,
                values: myNet.options.dataFormatter.values,
                characters: myNet.options.dataFormatter.characters,
                specialIndexes: myNet.options.dataFormatter.specialIndexes
            },
            learningRate: 0.001,
            errorThresh: 0.000001
        },
        trainOpts: {
            iterations: myNet.trainOpts.iterations,
            errorThresh: myNet.trainOpts.errorThresh,
            log: myNet.trainOpts.log,
            logPeriod: myNet.trainOpts.logPeriod,
            learningRate: myNet.trainOpts.learningRate,
            callbackPeriod: myNet.trainOpts.callbackPeriod,
            timeout: myNet.trainOpts.timeout
        },
        input: {
            rows: myNet.input.rows,
            columns: myNet.input.columns,
            weights: averageArrays(
                myNet.input.weights,
                urBit.input.weights
            ).slice(0, myNet.input.rows * myNet.input.columns)
        },
        hiddenLayers: mergeHiddenLayers(myNet, urBit),
        outputConnector: {
            rows: myNet.outputConnector.rows,
            columns: myNet.outputConnector.columns,
            weights: averageArrays(
                myNet.outputConnector.weights,
                urBit.outputConnector.weights
            ).slice(
                0,
                myNet.outputConnector.rows * myNet.outputConnector.columns
            )
        },
        output: {
            rows: myNet.output.rows,
            columns: myNet.output.columns,
            weights: averageArrays(
                myNet.output.weights,
                urBit.output.weights
            ).slice(0, myNet.output.rows * myNet.output.columns)
        }
    }
}

function mergeHiddenLayers(myNet, urBit) {
    const hiddenLayers = []
    try {
        for (let i = 0; i < myNet.hiddenLayers.length; i++) {
            const layer = {}
            for (const key of keys.GRU) {
                layer[key] = {
                    rows: myNet.hiddenLayers[i][key].rows,
                    columns: myNet.hiddenLayers[i][key].columns,
                    weights: averageArrays(
                        myNet.hiddenLayers[i][key].weights,
                        urBit.hiddenLayers[i][key].weights
                    ).slice(
                        0,
                        myNet.hiddenLayers[i][key].rows *
                            myNet.hiddenLayers[i][key].columns
                    )
                }
            }
            hiddenLayers.push(layer)
        }
    } catch {
        // pass
    }
    return hiddenLayers
}

export function dataFormatter(allowedChars) {
    const obj = {
        indexTable: {},
        characterTable: {},
        values: [...allowedChars],
        characters: [...allowedChars],
        specialIndexes: [allowedChars.length]
    }
    obj.characters.push('unrecognized')
    for (let i = 0; i < allowedChars.length; i++) {
        obj.indexTable[allowedChars[i]] = i
        obj.characterTable[i] = allowedChars[i]
    }
    obj.indexTable.unrecognized = allowedChars.length
    obj.characterTable[allowedChars.length] = null
    return obj
}

export async function reconstructNetwork(network) {
    network.input.weights = convertObjectToArray(network.input.weights).slice(
        0,
        network.input.rows * network.input.columns
    )
    for (let i = 0; i < network.options.hiddenLayers.length; i++) {
        for (const key of keys.GRU) {
            network.hiddenLayers[i][key].weights = convertObjectToArray(
                network.hiddenLayers[i][key].weights
            ).slice(
                0,
                network.hiddenLayers[i][key].rows *
                    network.hiddenLayers[i][key].columns
            )
        }
    }
    network.outputConnector.weights = convertObjectToArray(
        network.outputConnector.weights
    ).slice(0, network.outputConnector.rows * network.outputConnector.columns)
    network.output.weights = convertObjectToArray(network.output.weights).slice(
        0,
        network.output.rows * network.output.columns
    )
    return network
}

export function instantiateGRUNetwork(config) {
    return {
        type: 'GRU',
        options: {
            inputSize: config.inputCharacters.length + 1,
            inputRange: config.inputCharacters.length + 1,
            hiddenLayers: new Array(config.networkDepth).fill(
                config.networkWidth
            ),
            outputSize: config.inputCharacters.length + 1,
            decayRate: config.decayRate,
            smoothEps: 1e-8,
            regc: config.regc,
            clipval: config.clipval,
            maxPredictionLength: 333,
            dataFormatter: dataFormatter(Array.from(config.inputCharacters)),
            learningRate: config.initialRate,
            errorThresh: config.errorThresh
        },
        trainOpts: {
            iterations: config.iterations,
            errorThresh: config.errorThresh,
            log: false,
            logPeriod: config.logPeriod,
            learningRate: config.initialRate,
            callbackPeriod: config.callbackPeriod,
            timeout: 'Infinity'
        },
        input: {
            rows: config.inputCharacters.length + 2,
            columns: config.inputCharacters.length + 1,
            weights: []
        },
        hiddenLayers: [],
        outputConnector: {
            rows: config.inputCharacters.length + 2,
            columns: config.networkWidth,
            weights: []
        },
        output: {
            rows: config.inputCharacters.length + 2,
            columns: 1,
            weights: []
        }
    }
}

export function registerListeners(db, network, config) {
    db.get('input')
        .get('weights')
        .on(
            async (data) => {
                network.input.weights[data.i] = data.v
            },
            { change: true }
        )

    const layers = db.get('hiddenLayers')
    for (let i = 0; i < config.networkDepth; i++) {
        const layer = layers.get(i)
        network.hiddenLayers[i] = {}
        for (const j of keys.GRU) {
            const key = layer.get(j)
            let columns = config.networkWidth
            if (j.endsWith('InputMatrix') && i === 0) {
                columns = config.inputCharacters.length + 1
            } else if (j.endsWith('Bias')) {
                columns = 1
            }
            network.hiddenLayers[i][j] = {
                rows: config.networkWidth,
                columns: columns,
                weights: {}
            }

            key.get('weights').on(
                async (data) => {
                    network.hiddenLayers[i][j].weights[data.i] = data.v
                },
                { change: true }
            )
        }
    }

    db.get('output')
        .get('weights')
        .on(
            async (data) => {
                network.output.weights[data.i] = data.v
            },
            { change: true }
        )

    db.get('outputConnector')
        .get('weights')
        .on(
            async (data) => {
                network.outputConnector.weights[data.i] = data.v
            },
            { change: true }
        )
}

export function featherLayer(array) {
    let reversed = false

    for (let i = 1; i < array.length; i++) {
        if (typeof array[i] !== 'number') {
            array[i] = Math.random()
        }

        if (array[i] < array[i - 1]) {
            let temp = array[i]
            array[i] = array[i - 1]
            array[i - 1] = temp
            reversed = true
            break
        }
    }

    return array
}
