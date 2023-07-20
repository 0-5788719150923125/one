// const str = `The world needs a different to be able to help with this. Then you can try asking me about it. The world needs a different to be able to help with this. Then you can try asking me about it. The world needs a different to be able to help with this. Then you can try asking me about it. The world needs a different to be able to help with this. Then you can try asking me about it. The world needs a different to be able to help with this. Then you can try asking me about it. The world needs a different to be able to help with this. Then you can try asking me about it. The world needs a different to be able to help with this. Then you can try asking me about it. T`

// function generateRandomBinaryString(maxLength = 9) {
//     const length = Math.floor(Math.random() * maxLength) + 1
//     let binaryString = ''

//     for (let i = 0; i < length; i++) {
//         const randomBit = Math.round(Math.random())
//         binaryString += randomBit
//     }

//     return binaryString
// }

// console.log(Array.from({ length: 23 }, () => generateRandomBinaryString()))

// function removeDuplicateNgrams(paragraph, n) {
//     const words = paragraph.split(' ')
//     const result = []

//     for (let i = 0; i <= words.length - n; i++) {
//         const ngram = words.slice(i, i + n).join(' ')

//         let hasDuplicate = false
//         for (let j = i + 1; j <= words.length - n; j++) {
//             const compareNgram = words.slice(j, j + n).join(' ')
//             if (ngram === compareNgram) {
//                 hasDuplicate = true
//                 break
//             }
//         }

//         if (!hasDuplicate) {
//             result.push(ngram)
//         }
//     }

//     return result.join(' ')
// }

// const str = `The world needs a different to be able to help with this. Then you can try asking me about it. The world is bad.`

// console.log(removeDuplicateNgrams(str, 2))

import {
    getRandomLowNumber,
    getRandomSubset,
    chunkString
} from './src/utils.js'

console.log(chunkString('Hello, world! My name is Ryan.', 4))
