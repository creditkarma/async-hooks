/**
 * Copyright (c) 2015 Andreas Madsen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in the
 * Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { IHooks } from '../Hooks'
import { IState } from '../types'

class NextTickWrap {}

export function patchNextTick(hooks: IHooks, state: IState) {
    const oldNextTick = process.nextTick
    process.nextTick = function tick() {
        if (!state.enabled) {
            return oldNextTick.apply(process, arguments)
        }

        const args = Array.from(arguments)
        const callback = args[0]

        if (typeof callback !== 'function') {
            throw new TypeError('callback is not a function')
        }

        const handle = new NextTickWrap()
        const uid = state.nextId += 1

        // call the init hook
        hooks.init.call(handle, uid, 0, state.currentId, handle)

        // overwrite callback
        args[0] = function() {
            // call the pre hook
            hooks.pre(uid)

            let didThrow = true
            try {
                callback.apply(this, arguments)
                didThrow = false
            } finally {
                // If `callback` threw and there is an uncaughtException handler
                // then call the `post` and `destroy` hook after the uncaughtException
                // user handlers have been invoked.
                if (didThrow && process.listenerCount('uncaughtException') > 0) {
                    process.once('uncaughtException', () => {
                        hooks.post(uid, true)
                        hooks.destroy(uid)
                    })
                }
            }

            // callback done successfully
            hooks.post(uid, false)
            hooks.destroy(uid)
        }

        return oldNextTick.apply(process, args)
    }
}
