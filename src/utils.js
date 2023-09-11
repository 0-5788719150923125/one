import seedrandom from 'seedrandom'
import { faker } from '@faker-js/faker'
import natural from 'natural'
const { NGrams } = natural

export const bc = {
    FOLD: '\x1b[34m',
    ROOT: '\x1b[32m',
    CORE: '\x1b[31m'
}

export const ad = {
    TEXT: '\x1b[0m'
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

function cosineSimilarity(str1, str2, n) {
    // Helper function to extract character n-grams from a string
    function getNGrams(str, n) {
        const ngrams = []
        for (let i = 0; i < str.length - n + 1; i++) {
            ngrams.push(str.substr(i, n))
        }
        return ngrams
    }

    // Convert strings to character n-grams
    const ngrams1 = new Set(getNGrams(str1, n))
    const ngrams2 = new Set(getNGrams(str2, n))

    // Calculate the intersection of n-grams
    const intersection = new Set(
        [...ngrams1].filter((ngram) => ngrams2.has(ngram))
    )

    // Calculate the cosine similarity
    const cosineSimilarity =
        intersection.size / Math.sqrt(ngrams1.size * ngrams2.size)
    return cosineSimilarity
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

export function roundUpToNearestWhole(number) {
    if (number - Math.floor(number) >= 0.5) {
        return Math.ceil(number)
    } else {
        return Math.floor(number)
    }
}

export function getRandomSubset(
    inputString,
    minLength = 1,
    maxLength = inputString.length
) {
    const subsetLength =
        Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength
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

export function tokenizer(inputString, stepSize, numSteps) {
    const uniqueCharacters = [...new Set(inputString)]
    const combinations = []

    function generate(current, depth) {
        if (depth === 0) {
            combinations.push(current)
            return
        }

        for (let i = 0; i < uniqueCharacters.length; i++) {
            generate(current + uniqueCharacters[i], depth - 1)
        }
    }

    for (let len = stepSize; len <= stepSize * numSteps; len += stepSize) {
        generate('', len)
    }

    return combinations
}

export function buildBytePairVocabulary(trainingData, maxTokens, minLength) {
    const ngramCounts = new Map()

    // Count the frequency of n-grams in the training data
    for (const text of trainingData) {
        for (let i = 0; i < text.length; i++) {
            for (let j = i + 1; j <= text.length; j++) {
                const ngram = text.slice(i, j)
                if (ngram.length >= minLength) {
                    if (ngramCounts.has(ngram)) {
                        ngramCounts.set(ngram, ngramCounts.get(ngram) + 1)
                    } else {
                        ngramCounts.set(ngram, 1)
                    }
                }
            }
        }
    }

    // Sort n-grams by frequency in descending order
    const sortedNgrams = [...ngramCounts.entries()].sort((a, b) => b[1] - a[1])

    // Take the top 'maxTokens' n-grams to build the vocabulary
    const vocabulary = sortedNgrams.slice(0, maxTokens).map((entry) => entry[0])

    return vocabulary
}

export function buildNGramVocabulary(
    trainingData,
    ngramSize,
    maxTokens,
    leftPad = '[START]',
    rightPad = '[END]'
) {
    const ngramCounts = new Map()

    // Generate n-grams from the training data with spaces included
    for (const text of trainingData) {
        const words = text.split(' ')
        const ngrams = NGrams.ngrams(words, ngramSize, leftPad, rightPad)
        for (const ngram of ngrams) {
            const ngramStr = ngram.join(' ')
            if (ngramCounts.has(ngramStr)) {
                ngramCounts.set(ngramStr, ngramCounts.get(ngramStr) + 1)
            } else {
                ngramCounts.set(ngramStr, 1)
            }
        }
    }

    // Sort n-grams by frequency in descending order
    const sortedNgrams = [...ngramCounts.entries()].sort((a, b) => b[1] - a[1])

    // Take the top 'maxTokens' n-grams to build the vocabulary
    const vocabulary = sortedNgrams.slice(0, maxTokens).map((entry) => entry[0])

    return vocabulary
}

export function buildWordLevelTokenizer(trainingData, maxTokens) {
    const wordCounts = new Map()
    const tokenizer = new natural.TreebankWordTokenizer()

    // Count the frequency of words in the training data
    for (const text of trainingData) {
        const words = tokenizer.tokenize(text) // Use the Treebank tokenizer
        for (const word of words) {
            if (wordCounts.has(word)) {
                wordCounts.set(word, wordCounts.get(word) + 1)
            } else {
                wordCounts.set(word, 1)
            }
        }
    }

    // Sort words by frequency in descending order
    const sortedWords = [...wordCounts.entries()].sort((a, b) => b[1] - a[1])

    // Take the top 'maxTokens' words to build the vocabulary
    const vocabulary = sortedWords.slice(0, maxTokens).map((entry) => entry[0])

    return vocabulary
}

export function maskTokens(str, percent = 0.1, char = '2') {
    let arr = str.split(' ')

    for (let i = 0; i < arr.length; i++) {
        // Generate a random number between 0 and 1
        const randomValue = Math.random()

        // Replace the character with '2' if the random value is less than 0.1 (10% probability)
        if (randomValue < percent) {
            arr[i] = char
        }
    }

    return arr.join(' ')
}

export function randomItemFromArray(array) {
    const key = Math.floor(Math.random() * array.length)
    const value = array[key]
    return { key, value }
}

export function randomValueFromArray(array, biasFactor = 1) {
    const randomIndex = Math.floor(
        Math.pow(Math.random(), biasFactor) * array.length
    )
    return array[randomIndex]
}

export function createTrainingData() {
    return faker.hacker.phrase()
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

export function getIdentity(seed) {
    let rng = seedrandom()
    if (seed !== undefined) {
        rng = seedrandom(seed)
    }

    const count = Math.floor(rng() * 2) + 17
    const leading = Math.floor(rng() * 9) + 1
    let identity = leading.toString()

    for (let i = 1; i < count; i++) {
        const digit = Math.floor(rng() * 10)
        identity += digit.toString()
    }

    return Number(identity)
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

export function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function getRandomFloat(lower, upper) {
    if (lower >= upper) {
        throw new Error('Upper bound must be greater than lower bound')
    }

    const randomFraction = Math.random()
    const range = upper - lower
    const randomNumber = lower + randomFraction * range

    return randomNumber
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
