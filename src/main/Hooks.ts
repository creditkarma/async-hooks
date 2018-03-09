// import { debug } from './debug'
import { IState } from './types'

import {
    AsyncHook,
} from './AsyncHook'

const asyncWrap: any = (process as any).binding('async_wrap')
const TIMERWRAP: number = asyncWrap.Providers.TIMERWRAP
const ignoreUIDs = new Set()

export interface IHooks {
    init(uid: number, provider: any, parentId: number, parentHandle: any): void
    pre(uid: number): void
    post(uid: number, didThrow: boolean): void
    destroy(uid: number): void
    add(hook: AsyncHook): void
    remove(hook: AsyncHook): void
}

export function createHooks(state: IState): IHooks  {
    let hooks: Array<AsyncHook> = []

    return {
        init(uid: number, provider: any, parentUid: number, parentHandle: any): void {
            // Ignore TIMERWRAP, since setTimeout etc. is monkey patched
            // debug(`init: uid: ${uid}`)
            if (provider === TIMERWRAP) {
                ignoreUIDs.add(uid)
                return
            }

            const thisId = (state.nextId -= 1)
            state.idMap.set(uid, thisId)

            // debug(`init: id: ${thisId}`)
            // debug(`init: parent: ${state.currentId}`)
            // debug(`init: provider: `, provider)
            // debug(`init: handle: `, parentHandle)

            // call hooks
            for (const hook of hooks) {
                hook.init(thisId, provider, state.currentId, parentHandle)
            }
        },

        pre(uid: number): void {
            state.previousIds.push(state.currentId)
            state.currentId = state.idMap.get(uid) || 0
            if (ignoreUIDs.has(uid)) {
                return
            }

            // debug(`pre: id: ${state.currentId}`)

            // call hooks
            for (const hook of hooks) {
                hook.before(state.currentId)
            }
        },

        post(uid: number, didThrow: boolean) {
            const thisId = state.idMap.get(uid) || 0
            state.currentId = state.previousIds.pop() || 0
            if (ignoreUIDs.has(uid)) { return }

            // debug(`post: id: ${thisId}`)

            // call hooks
            for (const hook of hooks) {
                hook.after(thisId)
            }
        },

        destroy(uid: number) {
            // Cleanup the ignore list if this uid should be ignored
            if (ignoreUIDs.has(uid)) {
                ignoreUIDs.delete(uid)
                return
            }

            if (state.idMap.has(uid)) {
                const thisId = state.idMap.get(uid) || 0
                state.idMap.delete(uid)

                // debug(`destroy: id: ${thisId}`)

                // call hooks
                for (const hook of hooks) {
                    hook.destroy(thisId)
                }
            }
        },

        add(hook: AsyncHook): void {
            hooks.push(hook)
        },

        remove(hook: AsyncHook): void {
            hooks = hooks.filter((next: AsyncHook) => next !== hook)
        },
    }
}
