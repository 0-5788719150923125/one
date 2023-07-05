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
    gun.get('vector').get('input').get('weights').put({
        i: num,
        v: Math.random()
    })
    console.log(num)
    setTimeout(fire, 5000)
}

fire()

gun.get('vector')
    .get('input')
    .get('weights')
    .on((data) => {
        console.log(data)
    })
