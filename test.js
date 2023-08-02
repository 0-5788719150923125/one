function randomMask(str, percent = 0.1, char = '2') {
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

console.log(randomMask('The quick brown fox jumped over a lazy dog.'))
