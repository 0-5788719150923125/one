function linearSlide(
    upperBound = 0.9,
    lowerBound = 0.1,
    upperValue = 0.1,
    lowerValue = -1,
    currentRate = 0.8
) {
    // Calculate the range of values
    const valueRange = upperValue - lowerValue

    // Calculate the rate range
    const rateRange = upperBound - lowerBound

    // Calculate the scaled value
    const scaledValue =
        (currentRate - lowerBound) * (valueRange / rateRange) + lowerValue

    // Return the scaled value
    return scaledValue
}

console.log(linearSlide())
