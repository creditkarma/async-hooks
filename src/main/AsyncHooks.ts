import { AsyncHook } from './AsyncHook'
// import { debug } from './debug'
import { createHooks, IHooks } from './Hooks'
import { patches } from './patches'
import { State } from './State'
import { IAsyncHook, IHookCallbacks } from './types'
const asyncWrap: any = (process as any).binding('async_wrap')

const state: State = new State()

const hooks: IHooks = createHooks(state)

export const version: number = require('../../package.json').version

for (const key of Object.keys(patches)) {
    patches[key](hooks, state)
}

const TIMERWRAP: number = asyncWrap.Providers.TIMERWRAP
const ignoreUIDs: Set<number> = new Set()
const idMap: Map<number, number> = new Map()

asyncWrap.setupHooks({
    init(uid: number, provider: any, parentUid: number, parentHandle: any): void {
        // Ignore TIMERWRAP, since setTimeout etc. is monkey patched
        if (provider === TIMERWRAP) {
            ignoreUIDs.add(uid)
            return
        }

        const asyncId = state.getNextId()
        const parentId = state.currentId
        idMap.set(uid, asyncId)

        // debug(`init: id: ${asyncId}`)
        // debug(`init: parent: ${state.currentId}`)
        // debug(`init: provider: `, provider)
        // debug(`init: handle: `, parentHandle)

        hooks.init(asyncId, provider, parentId, parentHandle)
    },
    pre(uid: number): void {
        if (ignoreUIDs.has(uid)) {
            return
        }

        const asyncId: number | undefined = idMap.get(uid)
        if (asyncId !== undefined) {
            hooks.pre(asyncId)
        }
    },
    post(uid: number, didThrow: boolean) {
        if (ignoreUIDs.has(uid)) {
            return
        }

        const asyncId: number | undefined = idMap.get(uid)
        if (asyncId !== undefined) {
            hooks.post(asyncId, didThrow)
        }
    },
    destroy(uid: number) {
        // Cleanup the ignore list if this uid should be ignored
        if (ignoreUIDs.has(uid)) {
            ignoreUIDs.delete(uid)
            return
        }

        if (idMap.has(uid)) {
            const asyncId = idMap.get(uid)
            if (asyncId !== undefined) {
                idMap.delete(uid)

                // debug(`destroy: id: ${thisId}`)

                hooks.destroy(asyncId)
            }
        }
    },
})

asyncWrap.enable()

export function createHook(callbacks: IHookCallbacks): IAsyncHook {
    const hook: AsyncHook = new AsyncHook(callbacks)
    hooks.add(hook)
    return hook
}

export function executionAsyncId(): number {
    return state.currentId
}

export function currentId(): number {
    console.warn('DeprecationWarning: async_hooks.currentId is deprecated. Use async_hooks.executionAsyncId instead')
    return executionAsyncId()
}

export function triggerAsyncId(): number {
    return state.parentId
}

export function triggerId(): number {
    console.warn('DeprecationWarning: async_hooks.triggerId is deprecated. Use async_hooks.triggerAsyncId instead')
    return triggerAsyncId()
}
