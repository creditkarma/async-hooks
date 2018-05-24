import { startAsyncHooks } from './async-hooks'
import { startAsyncWrap } from './async-wrap'
import { AsyncHook } from './AsyncHook'
import { createHooks, IHooks } from './Hooks'
import * as logger from './logger'
import { State } from './State'
import { IAsyncHook, IHookCallbacks } from './types'
import { packageExists } from './utils'

const state: State = new State()

const hooks: IHooks = createHooks(state)

export const version: number = require('../../package.json').version

if (packageExists('async_hooks')) {
    startAsyncHooks(hooks, state)

} else {
    startAsyncWrap(hooks, state)
}

export function createHook(callbacks: IHookCallbacks): IAsyncHook {
    const hook: AsyncHook = new AsyncHook(callbacks)
    hooks.add(hook)
    return hook
}

export function executionAsyncId(): number {
    return state.currentId
}

export function currentId(): number {
    logger.warn('DeprecationWarning: async_hooks.currentId is deprecated. Use async_hooks.executionAsyncId instead')
    return executionAsyncId()
}

export function triggerAsyncId(): number {
    return state.parentId
}

export function triggerId(): number {
    logger.warn('DeprecationWarning: async_hooks.triggerId is deprecated. Use async_hooks.triggerAsyncId instead')
    return triggerAsyncId()
}
