const sim = Math.random() < 0.666 ? true : false

const config = {
    sim: sim ? 1 : 0,
    focus: process.env.FOCUS || 'trade',
    batchSize: Number(process.env.BATCH_SIZE) || 6,
    trainingSamples: Number(process.env.TRAINING_SAMPLES) || 1024,
    networkWidth: Number(process.env.NETWORK_WIDTH) || 64,
    networkDepth: Number(process.env.NETWORK_DEPTH) || 2,
    iterations: 1000000000,
    trainContextLength: 5,
    chunkSize: Number(process.env.CHUNK_SIZE) || 23,
    attentionLength: 23,
    initialRate: Number(process.env.LEARNING_RATE) || 0.001,
    dropout: Number(process.env.DROPOUT) || 0.1,
    regc: Number(process.env.REGC) || 0.00001,
    smoothEps: Number(process.env.SMOOTHEPS) || 1e-8,
    clipval: Number(process.env.CLIPVAL) || 5,
    errorThresh: Number(process.env.ERROR_THRESH) || 0.000001,
    cbMultiplier: Number(process.env.CB_MULTIPLIER) || 2,
    logPeriod: 1,
    callbackPeriod: 100,
    wall: '¶',
    inputCharacters: `${
        sim ? '01' : '10'
    }23456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ,;:.?!()[]"'\`$@#%^&*=+-{}\\/¶ `
}

export default config
