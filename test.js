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

// Example usage:
const string1 = 'hello world'
const string2 = 'hello worlh'
const string3 = 'hello worle'
const n = 2 // Character n-gram size (you can experiment with different values)

console.log('Cosine similarity 1:', cosineSimilarity(string1, string2, n))
console.log('Cosine similarity 2:', cosineSimilarity(string1, string3, n))
