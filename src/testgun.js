import Gun from 'gun'
import SEA from 'gun/sea.js'
import 'gun/lib/radix.js'
import 'gun/lib/radisk.js'
import 'gun/lib/store.js'
import 'gun/lib/rindexed.js'
import 'gun/lib/webrtc.js'
import 'gun/lib/yson.js'
import 'gun/lib/open.js'

const gun = Gun({
    peers: ['https://59.src.eco/gun'],
    localStorage: true,
    radisk: true,
    axe: false
})

function fire() {
    const num = Math.floor(Math.random() * 100)

    const neurons = gun.get('ignore').get('neurons')

    const neuron = gun
        .get('ignore')
        .get('neuron')
        .put(JSON.stringify({ i: num, v: Math.random() }))
    neurons.set(neuron)

    neurons.set(neuron)
    console.log(num)
    setTimeout(fire, 5000)
}

fire()

gun.get('ignore')
    .get('neuron')
    .on((data) => {
        console.log(data)
    })
