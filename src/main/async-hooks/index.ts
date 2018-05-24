// import { debug } from '../debug'
import { IHooks } from '../Hooks'
import * as logger from '../logger'
import { State } from '../State'
import { IAsyncHooks } from '../types'
import { patches } from './patches'

export function startAsyncHooks(hooks: IHooks, state: State): void {
    const async_hooks: IAsyncHooks = require('async_hooks')

    for (const key of Object.keys(patches)) {
        patches[key](hooks, state)
    }

    const ignoreUIDs: Set<number> = new Set()
    const idMap: Map<number, number> = new Map()

    async_hooks.createHook({
        init(uid: number, type: string, triggerId: number, resource: object): void {
            try {
                // debug('hook: ', arguments)
                // Ignore PROMSIE, since Promise is monkey patched
                if (type === 'PROMISE') {
                    ignoreUIDs.add(uid)

                } else {
                    const asyncId = state.getNextId()
                    const parentId = state.currentId
                    idMap.set(uid, asyncId)

                    hooks.init(asyncId, type, parentId, resource)
                }
            } catch (err) {
                logger.error('[async_hooks]: init: ', err)
            }
        },
        before(uid: number): void {
            try {
                if (!ignoreUIDs.has(uid)) {
                    const asyncId: number | undefined = idMap.get(uid)
                    if (asyncId !== undefined) {
                        hooks.pre(asyncId)
                    }
                }
            } catch (err) {
                logger.error('[async_hooks]: before: ', err)
            }
        },
        after(uid: number) {
            try {
                if (!ignoreUIDs.has(uid)) {
                    const asyncId: number | undefined = idMap.get(uid)
                    if (asyncId !== undefined) {
                        hooks.post(asyncId, false)
                    }
                }
            } catch (err) {
                logger.error('[async_hooks]: after: ', err)
            }
        },
        destroy(uid: number) {
            try {
                // Cleanup the ignore list if this uid should be ignored
                if (ignoreUIDs.has(uid)) {
                    ignoreUIDs.delete(uid)

                } else if (idMap.has(uid)) {
                    const asyncId = idMap.get(uid)
                    if (asyncId !== undefined) {
                        idMap.delete(uid)

                        // debug(`destroy: id: ${thisId}`)

                        hooks.destroy(asyncId)
                    }
                }
            } catch (err) {
                logger.error('[async_hooks]: destroy: ', err)
            }
        },
    }).enable()
}
