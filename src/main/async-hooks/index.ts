// import { debug } from '../debug'
import { IHooks } from '../Hooks'
import { State } from '../State'
import { AsyncHooks } from '../types'
import { patches } from './patches'

export function startAsyncHooks(hooks: IHooks, state: State): void {
    const async_hooks: AsyncHooks = require('async_hooks')

    for (const key of Object.keys(patches)) {
        patches[key](hooks, state)
    }

    const ignoreUIDs: Set<number> = new Set()
    const idMap: Map<number, number> = new Map()

    async_hooks.createHook({
        init(uid: number, type: string, triggerId: number, resource: object): void {
            // debug('hook: ', arguments)
            // Ignore PROMSIE, since Promise is monkey patched
            if (type === 'PROMISE') {
                ignoreUIDs.add(uid)
                return
            }

            const asyncId = state.getNextId()
            const parentId = state.currentId
            idMap.set(uid, asyncId)

            hooks.init(asyncId, type, parentId, resource)
        },
        before(uid: number): void {
            if (ignoreUIDs.has(uid)) {
                return
            }

            const asyncId: number | undefined = idMap.get(uid)
            if (asyncId !== undefined) {
                hooks.pre(asyncId)
            }
        },
        after(uid: number) {
            if (ignoreUIDs.has(uid)) {
                return
            }

            const asyncId: number | undefined = idMap.get(uid)
            if (asyncId !== undefined) {
                hooks.post(asyncId, false)
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
    }).enable()
}
