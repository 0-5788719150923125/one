const config = {
    focus: process.env.FOCUS || 'trade',
    batchSize: Number(process.env.BATCH_SIZE) || 23,
    trainingSamples: Number(process.env.TRAINING_SAMPLES) || 1024,
    networkWidth: Number(process.env.NETWORK_WIDTH) || 64,
    networkDepth: Number(process.env.NETWORK_DEPTH) || 2,
    iterations: 1000000000,
    trainingContextLength: Number(process.env.CONTEXT_LENGTH) || 3,
    localContextLength: 23,
    initialRate: Number(process.env.LEARNING_RATE) || 0.001,
    decayRate: 0.999,
    regc: Number(process.env.REGC) || 0.00001,
    clipval: Number(process.env.CLIPVAL) || 5,
    errorThresh: 0.000001,
    logPeriod: 1,
    callbackPeriod: 100,
    wall: '¶',
    inputCharacters: `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ,;:.?!()[]"'\`$@#%^&*-=+-{}\\/¶`
}

export default config
