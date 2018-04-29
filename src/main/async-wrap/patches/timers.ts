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
import { IHooks } from '../../Hooks'
import { State } from '../../State'

function TimeoutWrap() {}
function IntervalWrap() {}
function ImmediateWrap() {}

const timeoutMap = new Map()
const intervalMap = new Map()
const ImmediateMap = new Map()

let activeCallback: any = null
let clearedInCallback: boolean = false

export function patchTimers(hooks: IHooks, state: State) {
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
    state: State,
    setFn: string,
    clearFn: string,
    Handle: any,
    timerMap: any,
    singleCall: boolean,
): void {
    const oldSetFn = (timers as any)[setFn]
    const oldClearFn = (timers as any)[clearFn]

    // overwrite set[Timeout]
    function patchedSetFunction() {
        if (!state.enabled) {
            return Function.prototype.call.apply(oldSetFn, [ timers, ...arguments ])

        } else {
            const args = Array.from(arguments)
            const callback = args[0]

            if (typeof callback !== 'function') {
                throw new TypeError('"callback" argument must be a function')
            }

            const handle = new Handle()
            const asyncId = state.getNextId()
            let timerId: number

            // call the init hook
            hooks.init(asyncId, 0, state.currentId, handle)

            // overwrite callback
            args[0] = function() {
                // call the pre hook
                activeCallback = timerId
                hooks.pre(asyncId)

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
                            hooks.post(asyncId, true)
                            // setInterval won't continue
                            timerMap.delete(timerId)
                            hooks.destroy(asyncId)
                        })
                    }
                }

                // callback done successfully
                hooks.post(asyncId, false)
                activeCallback = null

                // call the destroy hook if the callback will only be called once
                if (singleCall || clearedInCallback) {
                    clearedInCallback = false
                    timerMap.delete(timerId)
                    hooks.destroy(asyncId)
                }
            }

            timerId = oldSetFn(...args)
            // Bind the timerId and asyncId for later use, in case the clear* function is
            // called.
            timerMap.set(timerId, asyncId)

            return timerId
        }
    }

    oldSetFn.call = function(thisArg: any, ...args: Array<any>): void {
        return Function.prototype.call.apply(patchedSetFunction, [ thisArg, ...args ])
    }

    oldSetFn.apply = function(thisArg: any, args: Array<any>): void {
        return Function.prototype.call.apply(patchedSetFunction, [ thisArg, args ])
    };

    (timers as any)[setFn] = patchedSetFunction

    // overwrite clear[Timeout]
    function patchedClearFunction(timerId: number): void {
        // If clear* was called within the timer callback, then delay the destroy
        // event to after the post event has been called.
        if (activeCallback === timerId && timerId !== null) {
            clearedInCallback = true

        } else if (timerMap.has(timerId)) {
            const asyncId = timerMap.get(timerId)
            timerMap.delete(timerId)
            hooks.destroy(asyncId)
        }

        oldClearFn(timerId)
    }

    oldClearFn.call = function(thisArg: any, ...args: Array<any>): void {
        return Function.prototype.call.apply(patchedClearFunction, [ thisArg, ...args ])
    }

    oldClearFn.apply = function(thisArg: any, args: Array<any>): void {
        return Function.prototype.call.apply(patchedClearFunction, [ thisArg, args ])
    };

    (timers as any)[clearFn] = patchedClearFunction
}
