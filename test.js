function getRandomSection(str, length = 23) {
    // Check if the provided length is greater than the string length
    if (length > str.length) {
        throw new Error(
            "The 'length' parameter should be smaller or equal to the string length."
        )
    }

    // Generate a random index within the valid range
    const maxIndex = str.length - length
    const randomIndex = Math.floor(Math.random() * (maxIndex + 1))

    // Extract the random section from the string
    const randomSection = str.substr(randomIndex, length)

    return randomSection
}

console.log(getRandomSection('My name is not important to you. I am no-one'))
