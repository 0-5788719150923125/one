function roundUpToNearestWhole(number) {
    if (number - Math.floor(number) >= 0.5) {
        return Math.ceil(number)
    } else {
        return Math.floor(number)
    }
}

console.log(roundUpToNearestWhole(5.6))
console.log(roundUpToNearestWhole(5.4))
