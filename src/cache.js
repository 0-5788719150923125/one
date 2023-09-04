import { createClient } from 'redis'

const redis = createClient({
    url: 'redis://localhost:6379'
})

redis.on('error', (err) => console.log('Redis Client Error', err))

await redis.connect()

export async function appendDataToList(key = 'samples', data) {
    return await redis.RPUSH(key, data)
}

export async function getRandomBatchFromList(key = 'samples', listSize = 8) {
    const listLength = await redis.LLEN(key)

    // Generate a random starting index within the list
    const startIndex = Math.floor(Math.random() * listLength)

    // Calculate the ending index for the batch
    const endIndex = startIndex + listSize - 1

    // Check if the batch exceeds the list's length
    if (endIndex >= listLength) {
        // If the batch goes beyond the end of the list, wrap around to the beginning
        const overflow = endIndex - listLength + 1
        const batch1 = await redis.LRANGE(key, startIndex, listLength - 1)
        const batch2 = await redis.LRANGE(key, 0, overflow - 1)
        return batch1.concat(batch2)
    } else {
        // Otherwise, get the batch within the list's boundaries
        return await redis.LRANGE(key, startIndex, endIndex)
    }
}

export async function getListLength(key = 'samples') {
    return await redis.LLEN(key)
}
