import {
    IAsyncHook,
    IHookCallbacks,
} from './types'

import * as asyncHooks from './AsyncHooks'
import * as debug from './debug'

export { debug }
export * from './types'

export const createHook: (options: IHookCallbacks) => IAsyncHook = asyncHooks.createHook

export const executionAsyncId: () => number = asyncHooks.executionAsyncId

export const currentId: () => number = asyncHooks.currentId

export const triggerAsyncId: () => number = asyncHooks.triggerAsyncId

export const triggerId: () => number = asyncHooks.triggerId
