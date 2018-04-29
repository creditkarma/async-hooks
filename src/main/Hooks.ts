// import { debug } from './debug'
import { State } from './State'

import {
    AsyncHook,
} from './AsyncHook'

export interface IHooks {
    init(uid: number, provider: any, parentId: number, parentHandle: any): void
    pre(uid: number): void
    post(uid: number, didThrow: boolean): void
    destroy(uid: number): void
    add(hook: AsyncHook): void
    remove(hook: AsyncHook): void
}

export function createHooks(state: State): IHooks  {
    let hooks: Array<AsyncHook> = []

    return {
        init(asyncId: number, provider: any, parentId: number, parentHandle: any): void {
            // call hooks
            // debug('init: asyncId: ', asyncId)
            // debug('init: parentId: ', parentId)
            state.childToParent.set(asyncId, parentId)
            for (const hook of hooks) {
                hook.init(asyncId, provider, parentId, parentHandle)
            }
        },

        pre(asyncId: number): void {
            // debug('pre: asyncId: ', asyncId)
            state.previousIds.push(state.currentId)
            state.currentId = asyncId
            state.parentId = state.childToParent.get(asyncId) || 0

            // call hooks
            for (const hook of hooks) {
                hook.before(state.currentId)
            }
        },

        post(asyncId: number, didThrow: boolean) {
            state.currentId = state.previousIds.pop() || 0
            state.parentId = state.childToParent.get(state.currentId) || 0
            // debug(`post: asyncId: ${asyncId}`)

            // call hooks
            for (const hook of hooks) {
                hook.after(asyncId)
            }
        },

        destroy(asyncId: number) {
            state.childToParent.delete(asyncId)
            for (const hook of hooks) {
                hook.destroy(asyncId)
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
