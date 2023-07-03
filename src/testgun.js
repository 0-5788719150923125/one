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
    localStorage: false,
    radisk: false,
    axe: false
})

gun.get('vectors')
    .get('input')
    .get('weights')
    .map()
    .map()
    .on(
        (value, key) => {
            if (key === '0') {
                console.log(value)
            }
        },
        { change: true }
    )

gun.get('vectors')
    .get('output')
    .get('weights')
    .map()
    .map()
    .on(
        (value, key) => {
            if (key === '0') {
                console.log(value)
            }
        },
        { change: true }
    )

gun.get('vectors')
    .get('outputConnector')
    .get('weights')
    .map()
    .map()
    .on(
        (value, key) => {
            if (key === '0') {
                console.log(value)
            }
        },
        { change: true }
    )
