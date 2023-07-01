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

export function mergeGRUNetworks(myNet, urBit) {
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
    const keys = [
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
    const hiddenLayers = []
    try {
        for (let i = 0; i < myNet.hiddenLayers.length; i++) {
            const layer = {}
            for (const key of keys) {
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

export function convertNetToObject(obj) {
    if (Array.isArray(obj)) {
        const newObj = {}
        obj.forEach((element, index) => {
            newObj[index] = convertNetToObject(element)
        })
        return newObj
    } else if (typeof obj === 'object' && obj !== null) {
        const newObj = {}
        for (let key in obj) {
            newObj[key] = convertNetToObject(obj[key])
        }
        return newObj
    } else {
        return obj
    }
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
