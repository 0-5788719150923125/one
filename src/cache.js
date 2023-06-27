import { createClient } from 'redis'

const redis = createClient({
    url: 'redis://kv:6379'
})

redis.on('error', (err) => console.log('Redis Client Error', err))

await redis.connect()

export async function getRandomData(key = 'encoder', batchSize = '8') {
    return await redis.SRANDMEMBER_COUNT(key, batchSize)
}

export async function getDataLength(key = 'encoder') {
    return await redis.SCARD(key)
}

export async function addData(key = 'encoder', data) {
    return await redis.SADD(key, data)
}
