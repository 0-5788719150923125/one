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

const src = gun.get('test')

function fire() {
    const num = Math.floor(Math.random() * 10)

    const neuron = src.get('neurons').put(Math.random())

    src.get('set').get(num).set(neuron)

    console.log(num)

    setTimeout(fire, 1000)
}

fire()

src.get('set')
    .map()
    .map()
    .on((data) => {
        console.log(data)
    })
