import fs from 'node:fs'
import { Recurrent, layer, utilities } from 'brain.js'
import { TrainStream } from 'train-stream'
// import { mergeGRUNetworks } from './utils.js'
const { add, input, multiply, output, random, rnnCell, lstmCell } = layer

// const myNet = JSON.parse(fs.readFileSync('./networks/compressor.28.json'))
// const urBit = JSON.parse(fs.readFileSync('./networks/compressor.29.json'))

// const ourPi = mergeGRUNetworks(myNet, urBit)

// for (let i = 0; i < 4; i++) {
//     console.log('checking neuron ' + i.toString())
//     console.log('myNet')
//     console.log(myNet.hiddenLayers[0].updateGateInputMatrix.weights[i])
//     console.log('urBit')
//     console.log(urBit.hiddenLayers[0].updateGateInputMatrix.weights[i])
//     console.log('averaged')
//     console.log(ourPi.hiddenLayers[0].updateGateInputMatrix.weights[i])
// }

// fs.writeFileSync('./networks/depressed.json', JSON.stringify(ourPi))

const net = new Recurrent({
    inputLayer: () => input({ width: 1, height: 24 }),
    hiddenLayers: [
        (input, recurrentInput) =>
            lstmCell({ height: 3 }, input, recurrentInput)
    ],
    outputLayer: (input) => output({ width: 1, height: 1 }, input)
})
const xor = [
    ['do, a deer, a female deer'],
    ['rae, a drop of golden sun'],
    ['mi, a name I call myself'],
    ['fa, a long long way to run']
]

net.train(xor, {
    errorThresh: 0.023,
    iterations: 1,
    learningRate: 0.01,
    log: (details) => console.log(details),
    logPeriod: 10
})

// console.log(net.run([0, 1]))

// const trainingStream = new TrainStream({
//     neuralNetwork: net,
//     /**
//      * Write training data to the stream. Called on each training iteration.
//      */
//     floodCallback: function () {
//         readInputs(xor)
//     },

//     /**
//      * Called when the network is done training.
//      */
//     doneTrainingCallback: function (stats) {
//         console.log(
//             `trained in ${stats.iterations} iterations with error: ${stats.error}`
//         )

//         const result01 = net.run([0, 1])
//         const result00 = net.run([0, 0])
//         const result11 = net.run([1, 1])
//         const result10 = net.run([1, 0])

//         console.log('0 XOR 1: ', result01) // 0.987
//         console.log('0 XOR 0: ', result00) // 0.058
//         console.log('1 XOR 1: ', result11) // 0.087
//         console.log('1 XOR 0: ', result10) // 0.934
//     }
// })

// // kick it off
// readInputs(xor)

// function readInputs(data) {
//     for (let i = 0; i < data.length; i++) {
//         trainingStream.write(data[i])
//     }

//     // let it know we've reached the end of the inputs
//     trainingStream.endInputs()
// }
