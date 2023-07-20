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
    // peers: ['http://localhost:9667/gun'],
    localStorage: false,
    radisk: true,
    axe: false
})

function fire() {
    const num = Math.floor(Math.random() * 10)

    const neuron = gun.get('neurons').get(num).put(Math.random())

    gun.get('grep').get(num).set(neuron)

    console.log(num)

    setTimeout(fire, 5000)
}

fire()

gun.get('grep')
    .map()
    .map()
    .map((data, key) => console.log([key, data]))
