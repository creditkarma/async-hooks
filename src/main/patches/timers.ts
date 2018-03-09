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
import * as timers from 'timers'
import { IHooks } from '../Hooks'
import { IState } from '../types'

function TimeoutWrap() {}
function IntervalWrap() {}
function ImmediateWrap() {}

const timeoutMap = new Map()
const intervalMap = new Map()
const ImmediateMap = new Map()

let activeCallback: any = null
let clearedInCallback: boolean = false

export function patchTimers(hooks: IHooks, state: IState) {
  patchTimer(hooks, state, 'setTimeout', 'clearTimeout', TimeoutWrap, timeoutMap, true)
  patchTimer(hooks, state, 'setInterval', 'clearInterval', IntervalWrap, intervalMap, false)
  patchTimer(hooks, state, 'setImmediate', 'clearImmediate', ImmediateWrap, ImmediateMap, true)

  global.setTimeout = timers.setTimeout
  global.setInterval = timers.setInterval
  global.setImmediate = timers.setImmediate

  global.clearTimeout = timers.clearTimeout
  global.clearInterval = timers.clearInterval
  global.clearImmediate = timers.clearImmediate
}

function patchTimer(
    hooks: IHooks,
    state: IState,
    setFn: string,
    clearFn: string,
    Handle: any,
    timerMap: any,
    singleCall: boolean,
): void {
    const oldSetFn = (timers as any)[setFn]
    const oldClearFn = (timers as any)[clearFn];

    // overwrite set[Timeout]
    (timers as any)[setFn] = function() {
        if (!state.enabled) {
            return oldSetFn.apply(timers, arguments)
        }

        const args = Array.from(arguments)
        const callback = args[0]

        if (typeof callback !== 'function') {
            throw new TypeError('"callback" argument must be a function')
        }

        // const handle = new Handle()
        const uid = state.nextId += 1
        let timerId: number

        // call the init hook
        hooks.init(uid, 0, state.currentId, null)

        // overwrite callback
        args[0] = function() {
            // call the pre hook
            activeCallback = timerId
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
                        // call the post hook
                        hooks.post(uid, true)
                        // setInterval won't continue
                        timerMap.delete(timerId)
                        hooks.destroy(uid)
                    })
                }
            }

            // callback done successfully
            hooks.post(uid, false)
            activeCallback = null

            // call the destroy hook if the callback will only be called once
            if (singleCall || clearedInCallback) {
                clearedInCallback = false
                timerMap.delete(timerId)
                hooks.destroy(uid)
            }
        }

        timerId = oldSetFn.apply(timers, args)
        // Bind the timerId and uid for later use, in case the clear* function is
        // called.
        timerMap.set(timerId, uid)

        return timerId
    };

    // overwrite clear[Timeout]
    (timers as any)[clearFn] = (timerId: number) => {
        // If clear* was called within the timer callback, then delay the destroy
        // event to after the post event has been called.
        if (activeCallback === timerId && timerId !== null) {
            clearedInCallback = true
        } else if (timerMap.has(timerId)) {
            const uid = timerMap.get(timerId)
            timerMap.delete(timerId)
            hooks.destroy(uid)
        }

        oldClearFn.apply(timers, arguments)
    }
}
