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

class PromiseWrap {}

export function patchPromise(hooks: IHooks, state: IState) {
    const Promise = global.Promise

    /* As per ECMAScript 2015, .catch must be implemented by calling .then, as
    * such we need needn't patch .catch as well. see:
    * http://www.ecma-international.org/ecma-262/6.0/#sec-promise.prototype.catch
    */
    const oldThen = Promise.prototype.then
    Promise.prototype.then = wrappedThen

    function makeWrappedHandler(fn: any, handle: any, uid: number, isOnFulfilled: boolean) {
        if ('function' !== typeof fn) {
            return isOnFulfilled
                ? makeUnhandledResolutionHandler(uid)
                : makeUnhandledRejectionHandler(uid)
        }

        return function wrappedHandler<T>(this: Promise<T>) {
            hooks.pre.call(handle, uid)
            try {
                return fn.apply(this, arguments)
            } finally {
                hooks.post.call(handle, uid, false)
                hooks.destroy.call(null, uid)
            }
        }
    }

    function makeUnhandledResolutionHandler(uid: number) {
        return function unhandledResolutionHandler(val: any) {
            hooks.destroy.call(null, uid)
            return val
        }
    }

    function makeUnhandledRejectionHandler(uid: number) {
        return function unhandledRejectedHandler(val: any) {
            hooks.destroy.call(null, uid)
            throw val
        }
    }

    function wrappedThen<T>(this: Promise<T>, onFulfilled: any, onRejected: any) {
        if (!state.enabled) {
            return oldThen.call(this, onFulfilled, onRejected)
        }

        const handle = new PromiseWrap()
        const uid = state.nextId += 1

        hooks.init.call(handle, uid, 0, state.currentId, null)

        return oldThen.call(
            this,
            makeWrappedHandler(onFulfilled, handle, uid, true),
            makeWrappedHandler(onRejected, handle, uid, false),
        )
    }
}
