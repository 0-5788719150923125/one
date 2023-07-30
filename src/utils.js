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

const zero = 0n
const shift = 8n
const bigShift = 16n
const byte = 255n

export function unicodeToBinary(str) {
    const encoder = new TextEncoder()
    const encodedData = encoder.encode(str)
    let binary = ''

    for (let i = 0; i < encodedData.length; i++) {
        const charBinary = encodedData[i].toString(2).padStart(8, '0')
        binary += charBinary
    }

    return binary
}

export function binaryToUnicode(binary) {
    const decoder = new TextDecoder('utf-8')
    const byteArray = []

    for (let i = 0; i < binary.length; i += 8) {
        const byte = parseInt(binary.substr(i, 8), 2)
        byteArray.push(byte)
    }

    const encodedData = new Uint8Array(byteArray)
    const decodedString = decoder.decode(encodedData)

    return decodedString
}

export function padArray(
    arr,
    paddingType = 'left',
    desiredLength = 2048,
    padToken = 0
) {
    const currentLength = arr.length

    if (currentLength >= desiredLength) {
        // Truncate from the start (left) if the array is too long
        return arr.slice(currentLength - desiredLength)
    } else {
        const paddingLength = desiredLength - currentLength

        if (paddingType === 'left') {
            const paddedArray = new Array(paddingLength)
                .fill(padToken)
                .concat(arr)
            return paddedArray
        } else if (paddingType === 'right') {
            const paddedArray = arr.concat(
                new Array(paddingLength).fill(padToken)
            )
            return paddedArray
        } else if (paddingType === 'both') {
            const leftPaddingLength = Math.floor(paddingLength / 2)
            const rightPaddingLength = paddingLength - leftPaddingLength
            const paddedArray = new Array(leftPaddingLength)
                .fill(padToken)
                .concat(arr, new Array(rightPaddingLength).fill(padToken))
            return paddedArray
        } else {
            throw new Error(
                'Invalid paddingType. Use "left", "right", or "both".'
            )
        }
    }
}

export function getRandomSection(str, length = 23) {
    // Check if the provided length is greater than the string length
    if (length > str.length) {
        return str
    }

    // Generate a random index within the valid range
    const maxIndex = str.length - length
    const randomIndex = Math.floor(Math.random() * (maxIndex + 1))

    // Extract the random section from the string
    const randomSection = str.substr(randomIndex, length)

    return randomSection
}

export function chunkString(str, size = 4) {
    if (!str || typeof str !== 'string') {
        throw new Error('Input must be a non-empty string.')
    }

    const chunks = []

    for (let i = 0; i < str.length; i += size) {
        chunks.push(str.slice(i, i + size))
    }

    return chunks
}

function logb(val, base) {
    return Math.log10(val) / Math.log10(base)
}
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}
export function getRandomLowNumber(min, max, factor) {
    var base = 1.0 / factor
    var evtcnt = Math.floor(Math.pow(base, max - min + 1) - 1) / (base - 1)
    var rndnum = getRandomNumber(1, evtcnt)
    var expflr = Math.floor(logb((rndnum - 1) * (base - 1) + 1, base))
    var rndres = max - expflr
    return rndres
}

export function getRandomSubset(inputString, length) {
    const subsetLength = Math.floor(Math.random() * length) + 1
    const startIndex = Math.floor(
        Math.random() * (inputString.length - subsetLength + 1)
    )
    return inputString.substring(startIndex, startIndex + subsetLength)
}

export function randomMask(str, percent = 0.1, char = '2') {
    let replacedString = ''

    for (let i = 0; i < str.length; i++) {
        // Generate a random number between 0 and 1
        const randomValue = Math.random()

        // Replace the character with '2' if the random value is less than 0.1 (10% probability)
        if (randomValue < percent) {
            replacedString += char
        } else {
            replacedString += str[i]
        }
    }

    return replacedString
}

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

export function generateRandomBinaryString(maxLength = 9) {
    const length = Math.floor(Math.random() * maxLength) + 1
    let binaryString = ''

    for (let i = 0; i < length; i++) {
        const randomBit = Math.round(Math.random())
        binaryString += randomBit
    }

    return binaryString
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

export function featherLayer(array, max = 1) {
    let count = 0
    while (count < max) {
        for (let i = 1; i < array.length; i++) {
            if (array[i] < array[i - 1]) {
                const neuron = array[i]
                let j = i - 1
                while (j >= 0 && neuron < array[j]) {
                    array[j + 1] = array[j]
                    j--
                }
                array[j + 1] = neuron
                break
            }
        }
        count++
    }
    return array
}

// export function featherLayer(array, max = 1) {
//     let sorted = false
//     let count = 0
//     for (let i = 1; i < array.length; i++) {
//         if (array[i] < array[i - 1]) {
//             let temp = array[i]
//             array[i] = array[i - 1]
//             array[i - 1] = temp
//             count++
//             if (count === max) {
//                 sorted = true
//                 break
//             }
//         }
//     }

//     if (!sorted && array[0] !== 0 && array.length > 1000) {
//         console.log('a layer is already sorted!')
//     }

//     return array
// }

export function jaggedLayer(array) {
    for (let i = 2; i < array.length; i++) {
        let was = null
        let is = null
        if (array[i - 2] < array[i - 1]) was = 'higher'
        else if (array[i - 2] >= array[i - 1]) was = 'lower'
        if (array[i] < array[i - 1]) is = 'higher'
        if (array[i] >= array[i - 1]) is = 'lower'
        if (was !== is) {
            let temp = array[i]
            array[i] = array[i - 1]
            array[i - 1] = temp
            break
        }
    }

    return array
}
