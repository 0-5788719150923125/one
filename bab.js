import fs from 'fs'
import {
    getEmptyBookContent,
    getRandomCharsBookContent
} from 'babel/src/search.js'
import { ALPHA, CHARS } from 'babel/src/constants.js'
import dfd from 'danfojs-node'
let df = new dfd.DataFrame({ chars: Array.from(ALPHA) })
let encode = new dfd.OneHotEncoder()
encode.fit(df['chars'])
console.log(encode)

const text =
    'For smaller sets of words where the given word used would be more efficiently represented by fewer bits in ASCII (for example, if the used words were lower down in the index and thus many of the 19 bit chunks started with a long string of zeros), you could specify a smaller bit chunk number before interpreting the data. If the list of words was organized based on frequency of usage, you might be able to greatly reduce the average necessary bit chunk length. Since this is also much more efficient in general for smaller words, maybe smaller words would need to be prioritized in the list. How often you would need to switch to bigger bit chunk lengths for an optimally small storage system seems to be an optimization problem.'.toLowerCase()

const value = getRandomCharsBookContent(text)

fs.writeFileSync('./bab.txt', JSON.stringify(value))

console.log(value.highlight)

const start = value.highlight.startLine * CHARS + value.highlight.startCol
const end = value.highlight.endLine * CHARS + value.highlight.endCol

console.log(value.book.slice(start, end))

let sf_enc = encode.transform(Array.from('enc'))
console.log(sf_enc)

console.log(value.book.length)
