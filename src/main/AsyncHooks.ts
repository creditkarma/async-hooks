import { AsyncHook } from './AsyncHook'
import { createHooks, IHooks } from './Hooks'
import { patches } from './patches'
import { IAsyncHook, IHookCallbacks, IState } from './types'
const asyncWrap: any = (process as any).binding('async_wrap')

const state: IState = {
    enabled: true,
    previousIds: [],
    nextId: 0,
    currentId: 0,
    parentId: 0,
    idMap: new Map(),
}

const hooks: IHooks = createHooks(state)

export const version: number = require('../../package.json').version

for (const key of Object.keys(patches)) {
    patches[key](hooks, state)
}

asyncWrap.setupHooks({
    init: hooks.init,
    pre: hooks.pre,
    post: hooks.post,
    destroy: hooks.destroy,
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

export function triggerAsyncId(): number {
    return state.parentId
}
