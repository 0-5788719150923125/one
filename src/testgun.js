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
    const i = Math.floor(Math.random() * 10)

    // const neuron = src.get('neurons').get(i).put(Math.random())

    src.get('set').set({ i: { i, v: Math.random() } })

    console.log(i)

    setTimeout(fire, 1000)
}

fire()

src.get('set')
    .map()
    .map()
    .once((data, key) => {
        console.log([data.i, data.v])
    })
