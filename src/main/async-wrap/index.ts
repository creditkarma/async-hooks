import { IHooks } from '../Hooks'
import * as logger from '../logger'
import { State } from '../State'
import { patches } from './patches'

export function startAsyncWrap(hooks: IHooks, state: State): void {
    const asyncWrap: any = (process as any).binding('async_wrap')

    for (const key of Object.keys(patches)) {
        patches[key](hooks, state)
    }

    const TIMERWRAP: number = asyncWrap.Providers.TIMERWRAP
    const ignoreUIDs: Set<number> = new Set()
    const idMap: Map<number, number> = new Map()

    function providerToString(provider: number): string {
        switch (provider) {
            case asyncWrap.Providers.NONE:
                return 'NONE'
            case asyncWrap.Providers.CRYPTO:
                return 'CRYPTO'
            case asyncWrap.Providers.FSEVENTWRAP:
                return 'FSEVENTWRAP'
            case asyncWrap.Providers.FSREQWRAP:
                return 'FSREQWRAP'
            case asyncWrap.Providers.GETADDRINFOREQWRAP:
                return 'GETADDRINFOREQWRAP'
            case asyncWrap.Providers.GETNAMEINFOREQWRAP:
                return 'GETNAMEINFOREQWRAP'
            case asyncWrap.Providers.HTTPPARSER:
                return 'HTTPPARSER'
            case asyncWrap.Providers.JSSTREAM:
                return 'JSSTREAM'
            case asyncWrap.Providers.PIPEWRAP:
                return 'PIPEWRAP'
            case asyncWrap.Providers.PIPECONNECTWRAP:
                return 'PIPECONNECTWRAP'
            case asyncWrap.Providers.PROCESSWRAP:
                return 'PROCESSWRAP'
            case asyncWrap.Providers.QUERYWRAP:
                return 'QUERYWRAP'
            case asyncWrap.Providers.SHUTDOWNWRAP:
                return 'SHUTDOWNWRAP'
            case asyncWrap.Providers.SIGNALWRAP:
                return 'SIGNALWRAP'
            case asyncWrap.Providers.STATWATCHER:
                return 'STATWATCHER'
            case asyncWrap.Providers.TCPWRAP:
                return 'TCPWRAP'
            case asyncWrap.Providers.TCPCONNECTWRAP:
                return 'TCPCONNECTWRAP'
            case asyncWrap.Providers.TIMERWRAP:
                return 'TIMERWRAP'
            case asyncWrap.Providers.TLSWRAP:
                return 'TLSWRAP'
            case asyncWrap.Providers.TTYWRAP:
                return 'TTYWRAP'
            case asyncWrap.Providers.UDPWRAP:
                return 'UDPWRAP'
            case asyncWrap.Providers.UDPSENDWRAP:
                return 'UDPSENDWRAP'
            case asyncWrap.Providers.WRITEWRAP:
                return 'WRITEWRAP'
            case asyncWrap.Providers.ZLIB:
                return 'ZLIB'
            default:
                return 'NONE'
        }
    }

    asyncWrap.setupHooks({
        init(uid: number, provider: number, parentUid: number, parentHandle: any): void {
            try {
                // Ignore TIMERWRAP, since setTimeout etc. is monkey patched
                if (provider === TIMERWRAP) {
                    ignoreUIDs.add(uid)

                } else {
                    const asyncId = state.getNextId()
                    const parentId = state.currentId
                    const type = providerToString(provider)
                    idMap.set(uid, asyncId)

                    hooks.init(asyncId, type, parentId, parentHandle)
                }
            } catch (err) {
                logger.error('[async_wrap]: init: ', err)
            }
        },
        pre(uid: number): void {
            try {
                if (!ignoreUIDs.has(uid)) {
                    const asyncId: number | undefined = idMap.get(uid)
                    if (asyncId !== undefined) {
                        hooks.pre(asyncId)
                    }
                }
            } catch (err) {
                logger.error('[async_wrap]: pre: ', err)
            }
        },
        post(uid: number, didThrow: boolean) {
            try {
                if (!ignoreUIDs.has(uid)) {
                    const asyncId: number | undefined = idMap.get(uid)
                    if (asyncId !== undefined) {
                        hooks.post(asyncId, didThrow)
                    }
                }
            } catch (err) {
                logger.error('[async_wrap]: post: ', err)
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

                        hooks.destroy(asyncId)
                    }
                }
            } catch (err) {
                logger.error('[async_wrap]: destroy: ', err)
            }
        },
    })

    asyncWrap.enable()
}
