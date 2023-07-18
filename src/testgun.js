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
    // peers: ['https://59.src.eco/gun'],
    localStorage: false,
    radisk: true,
    axe: false
})

function fire() {
    const num = Math.floor(Math.random() * 100000000)

    const things = gun
        .get('more21')
        .get(num)
        .put({ v: JSON.stringify({ i: num, v: Math.random() }) })

    gun.get('stuffs2221').get(num).set(things)

    console.log(num)
    setTimeout(fire, 1000)
}

fire()

gun.get('stuffs2221')
    .map()
    .map()
    .on((data, key) => {
        console.log(key)
        console.log(data)
    })
