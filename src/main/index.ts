import {
    AsyncHooks,
    IAsyncHook,
    IHookCallbacks,
} from './types'

let instance: AsyncHooks

// If a another copy (same version or not) of stack-chain exists it will result
// in wrong stack traces (most likely dublicate callSites).
if ((global as any)._asyncHook !== undefined) {
    // In case the version match, we can simply return the first initialized copy
    if ((global as any)._asyncHook.version === require('../../package.json').version) {
        instance = (global as any)._asyncHook

    } else {
        throw new Error('Conflicting version of async-hook found')
    }

} else {
    instance = require('./AsyncHooks');

    (global as any)._asyncHook = instance
}

export * from './debug'
export * from './types'

export const createHook: (options: IHookCallbacks) => IAsyncHook = instance.createHook

export const executionAsyncId: () => number = instance.executionAsyncId

export const currentId: () => number = instance.currentId

export const triggerAsyncId: () => number = instance.triggerAsyncId

export const triggerId: () => number = instance.triggerId
