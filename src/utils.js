export const wall = '¶'

export const bc = {
    FOLD: '\x1b[34m',
    ROOT: '\x1b[32m',
    CORE: '\x1b[31m'
}

export const ad = {
    TEXT: '\x1b[0m'
}

export function* elapsedTimeGenerator() {
    let previousTime = new Date()

    while (true) {
        const currentTime = new Date()
        const elapsedTime = currentTime - previousTime
        previousTime = currentTime

        yield elapsedTime
    }
}

export function getRandomIdentity() {
    const length = Math.random() < 0.5 ? 18 : 19

    let randomNumber = (Math.floor(Math.random() * 9) + 1).toString()
    while (randomNumber.length < length) {
        randomNumber = randomNumber + Math.floor(Math.random() * 10).toString()
    }
    return randomNumber
}

export function averageArrays(arr1, arr2) {
    const maxLength = Math.max(arr1.length, arr2.length)
    const averagedArray = []

    for (let i = 0; i < maxLength; i++) {
        const value1 = arr1[i] !== undefined ? arr1[i] : arr2[i]
        const value2 = arr2[i] !== undefined ? arr2[i] : arr1[i]
        const average = (value1 + value2) / 2
        averagedArray.push(average)
    }

    return averagedArray
}

export function mergeGRUNetworks(myNet, urBit) {
    return {
        type: myNet.type,
        options: {
            inputSize: myNet.options.inputSize,
            inputRange: myNet.options.inputRange,
            hiddenLayers: myNet.options.hiddenLayers,
            outputSize: myNet.options.outputSize,
            decayRate: myNet.options.decayRate,
            smoothEps: myNet.options.smoothEps,
            regc: myNet.options.regc,
            clipval: myNet.options.clipval,
            maxPredictionLength: myNet.options.maxPredictionLength,
            dataFormatter: {
                indexTable: myNet.options.dataFormatter.indexTable,
                characterTable: myNet.options.dataFormatter.characterTable,
                values: myNet.options.dataFormatter.values,
                characters: myNet.options.dataFormatter.characters,
                specialIndexes: myNet.options.dataFormatter.specialIndexes
            }
        },
        learningRate: myNet.learningRate,
        errorThresh: myNet.errorThresh,
        trainOpts: {
            iterations: myNet.trainOpts.iterations,
            errorThresh: myNet.trainOpts.errorThresh,
            log: myNet.trainOpts.log,
            logPeriod: myNet.trainOpts.logPeriod,
            learningRate: myNet.trainOpts.learningRate,
            callbackPeriod: myNet.trainOpts.callbackPeriod,
            timeout: myNet.trainOpts.timeout
        },
        input: {
            rows: myNet.input.rows,
            columns: myNet.input.columns,
            weights: averageArrays(
                myNet.input.weights,
                urBit.input.weights
            ).slice(0, myNet.input.rows * myNet.input.columns)
        },
        hiddenLayers: mergeHiddenLayers(myNet, urBit),
        outputConnector: {
            rows: myNet.outputConnector.rows,
            columns: myNet.outputConnector.columns,
            weights: averageArrays(
                myNet.outputConnector.weights,
                urBit.outputConnector.weights
            ).slice(
                0,
                myNet.outputConnector.rows * myNet.outputConnector.columns
            )
        },
        output: {
            rows: myNet.output.rows,
            columns: myNet.output.columns,
            weights: averageArrays(
                myNet.output.weights,
                urBit.output.weights
            ).slice(0, myNet.output.rows * myNet.output.columns)
        }
    }
}

function mergeHiddenLayers(myNet, urBit) {
    const keys = [
        'updateGateInputMatrix',
        'updateGateHiddenMatrix',
        'updateGateBias',
        'resetGateInputMatrix',
        'resetGateHiddenMatrix',
        'resetGateBias',
        'cellWriteInputMatrix',
        'cellWriteHiddenMatrix',
        'cellWriteBias'
    ]
    const hiddenLayers = []
    try {
        for (let i = 0; i < myNet.hiddenLayers.length; i++) {
            const layer = {}
            for (const key of keys) {
                layer[key] = {
                    rows: myNet.hiddenLayers[i][key].rows,
                    columns: myNet.hiddenLayers[i][key].columns,
                    weights: averageArrays(
                        myNet.hiddenLayers[i][key].weights,
                        urBit.hiddenLayers[i][key].weights
                    ).slice(
                        0,
                        myNet.hiddenLayers[i][key].rows *
                            myNet.hiddenLayers[i][key].columns
                    )
                }
            }
            hiddenLayers.push(layer)
        }
    } catch {
        // pass
    }
    return hiddenLayers
}
