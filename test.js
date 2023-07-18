const zero = 0n
const shift = 8n
const bigShift = 16n
const byte = 255n

function unicodeToBinary(str) {
    const encoder = new TextEncoder()
    const encodedData = encoder.encode(str)
    let binary = ''

    for (let i = 0; i < encodedData.length; i++) {
        const charBinary = encodedData[i].toString(2).padStart(8, '0')
        binary += charBinary
    }

    return binary
}

function binaryToUnicode(binary) {
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

const bin = unicodeToBinary('Hello, world!')

console.log(bin)

const string = binaryToUnicode(bin)

console.log(string)
