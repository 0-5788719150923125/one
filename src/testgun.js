import Gun from 'gun'

const gun = Gun({
    localStorage: false,
    radisk: true,
    axe: false
})

let last = 0
let total = 0
let fired = 0

function fire() {
    let neurons = {}
    for (let t = 0; t < 1000; t++) {
        const i = Math.floor(Math.random() * 10000000)
        const v = Math.random()
        neurons[i] = v
    }

    gun.get('test')
        .get('neurons')
        .put(neurons, (ack) => fired++)

    setTimeout(fire, 60000)
}

fire()

// function getStuff() {
//     gun.get('test')
//         .get('neurons')
//         .get(Math.floor(Math.random() * 10000000))
//         .once((value, key, _msg, _ev) => {
//             console.log([key, value])
//             console.log(_msg)
//             last = value || 0
//             total++
//         })
//     setTimeout(getStuff, 50)
// }

// getStuff()

gun.get('test')
    .get('neurons')
    .map((value, key, _msg, _ev) => {
        last = value
        total++
    })

function bytesToMB(bytes) {
    return bytes / (1024 * 1024)
}

function profileMemory() {
    // Get memory usage statistics
    const memoryUsage = process.memoryUsage()
    const rssMB = bytesToMB(memoryUsage.rss)
    const heapTotalMB = bytesToMB(memoryUsage.heapTotal)
    const heapUsedMB = bytesToMB(memoryUsage.heapUsed)
    const externalMB = bytesToMB(memoryUsage.external)

    // Display memory usage in MB
    console.clear()
    console.log(`TotalListeners: ${total.toString()}`)
    console.log(`TotalBatches: ${fired.toString()}`)
    console.log(`LastVal: ${last.toString()}`)
    console.log(`RSS Memory: ${rssMB.toFixed(2)} MB`)
    console.log(`Heap Total: ${heapTotalMB.toFixed(2)} MB`)
    console.log(`Heap Used: ${heapUsedMB.toFixed(2)} MB`)
    console.log(`External: ${externalMB.toFixed(2)} MB`)
    setTimeout(profileMemory, 1000)
}

profileMemory()
