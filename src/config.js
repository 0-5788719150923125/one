const sim = Math.random() < 0.666 ? true : false

const config = {
    sim: sim ? 1 : 0,
    focus: process.env.FOCUS || 'trade',
    batchSize: Number(process.env.BATCH_SIZE) || 6,
    listSize: Number(process.env.LIST_SIZE) || 32,
    trainingSamples: Number(process.env.TRAINING_SAMPLES) || 1024,
    networkWidth: Number(process.env.NETWORK_WIDTH) || 64,
    networkDepth: Number(process.env.NETWORK_DEPTH) || 2,
    iterations: 1000000000,
    trainContextLength: Number(process.env.TRAIN_CONTEXT_LENGTH) || 5,
    chunkSize: Number(process.env.CHUNK_SIZE) || 23,
    attentionLength: 23,
    initialRate: Number(process.env.LEARNING_RATE) || 0.001,
    momentum: Number(process.env.MOMENTUM) || 0.1,
    dropout: Number(process.env.DROPOUT) || 0.1,
    regc: Number(process.env.REGC) || 0.00001,
    smoothEps: Number(process.env.SMOOTHEPS) || 1e-8,
    clipval: Number(process.env.CLIPVAL) || 5,
    errorThresh: Number(process.env.ERROR_THRESH) || 0.000001,
    cbMultiplier: Number(process.env.CB_MULTIPLIER) || 2,
    logPeriod: 1,
    callbackPeriod: Number(process.env.CB_PERIOD) || 100,
    wall: '¶',
    charSet: `¶abcdefghijklmnopqrstuvwxyz,.?!' `,
    synapseResetThreshold: Number(process.env.RECIEVE_INTERVAL) || 100000,
    // bootstrapPeers: ['ws://relay:8080/gun']
    bootstrapPeers: ['wss://59.src.eco/gun', 'wss://95.src.eco/gun']
}

export default config
