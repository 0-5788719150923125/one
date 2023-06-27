export const wall = '¶'

export function getRandomIdentity() {
    const length = Math.random() < 0.5 ? 18 : 19

    let randomNumber = (Math.floor(Math.random() * 9) + 1).toString()
    while (randomNumber.length < length) {
        randomNumber = randomNumber + Math.floor(Math.random() * 10).toString()
    }
    return randomNumber
}

export const bc = {
    FOLD: '\x1b[34m',
    ROOT: '\x1b[32m',
    CORE: '\x1b[31m'
}

export const ad = {
    TEXT: '\x1b[0m'
}
