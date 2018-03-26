import { expect } from 'code'
import * as Lab from 'lab'

import {
    createHook,
    // debug,
    executionAsyncId,
    IHookCallbacks,
    triggerAsyncId,
} from '../main'

export const lab = Lab.script()

const describe = lab.describe
const it = lab.it
// const before = lab.before
// const after = lab.after

describe('Async Hooks', () => {

    it('should call relevant callbacks for lifecycle events', (done) => {
        let initCalled = false
        let beforeCalled = false
        let afterCalled = false
        let called = false
        const callIds = new Set<number>()
        const resources = new Map<number, object>()

        const callbacks: IHookCallbacks = {
            init(asyncId: number, type: string, triggerId: number, resource: object) {
                initCalled = true
                resources.set(asyncId, resource)
                // debug(`init: type[${type}]: called[${initCalled}]: id[${asyncId}] -> parent[${triggerId}]`)
            },
            before(asyncId: number) {
                // debug(`before[${asyncId}]: `, resources.get(asyncId))
                callIds.add(asyncId)
                beforeCalled = true
            },
            after(asyncId: number) {
                // debug(`after[${asyncId}]: `, resources.get(asyncId))
                callIds.delete(asyncId)
                afterCalled = true
            },
        }

        const hook = createHook(callbacks)
        hook.enable()

        process.nextTick(() => {
            setTimeout(() => {
                // debug('timeout: ', executionAsyncId())
                // debug('timeout: ', callIds)
                expect(callIds.has(executionAsyncId())).to.equal(true)
                called = true
            }, 50)

            const interval = setInterval(() => {
                // debug('interval: ', executionAsyncId())
                // debug('interval: ', callIds)
                expect(callIds.has(executionAsyncId())).to.equal(true)
                clearInterval(interval)
            }, 50)
        })

        setTimeout(() => {
            hook.disable()
            // expect(callIds.size).to.equal(1)
            expect(callIds.has(executionAsyncId())).to.equal(true)
            expect(initCalled).to.equal(true)
            expect(beforeCalled).to.equal(true)
            expect(afterCalled).to.equal(true)
            expect(called).to.equal(true)
            done()
        }, 100)
    })

    it('should handle context in promises', (done) => {
        const parent_1 = executionAsyncId()
        setTimeout(() => {
            const parent_2 = executionAsyncId()
            expect(triggerAsyncId()).to.equal(parent_1)
            new Promise((resolve, reject) => {
                setTimeout(() => {
                    expect(triggerAsyncId()).to.equal(parent_2)
                    resolve(6)
                }, 500)
            }).then((val) => {
                expect(triggerAsyncId()).to.equal(parent_2)
                done()
            })
        }, 200)
    })

    it('should handle context in async/await', async () => {
        const parent_1 = executionAsyncId()

        async function delay<T>(fn: () => T, time: number) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve(fn())
                }, delay)
            })
        }

        await delay(async () => {
            const parent_2 = executionAsyncId()
            expect(triggerAsyncId()).to.equal(parent_1)
            const value_1 = await delay(() => {
                expect(triggerAsyncId()).to.equal(parent_2)
                return 6
            }, 500).then((val) => {
                expect(triggerAsyncId()).to.equal(parent_2)
            })

            return value_1
        }, 200)
    })

    it('should handle context in setTimeout', (done) => {
        function runAnother(id: number) {
            setTimeout(() => {
                expect(triggerAsyncId()).to.equal(id)
                done()
            }, 100)
        }

        const parent_1 = executionAsyncId()
        setTimeout(() => {
            const parent_2 = executionAsyncId()
            expect(triggerAsyncId()).to.equal(parent_1)
            setTimeout(() => {
                const parent_3 = executionAsyncId()
                expect(triggerAsyncId()).to.equal(parent_2)
                setTimeout(() => {
                    expect(triggerAsyncId()).to.equal(parent_3)
                    runAnother(executionAsyncId())
                }, 200)
            }, 500)
        }, 200)
    })

    it('should handle context in nextTick', (done) => {
        function runAnother(id: number) {
            process.nextTick(() => {
                expect(triggerAsyncId()).to.equal(id)
                done()
            })
        }

        const parent_1 = executionAsyncId()
        process.nextTick(() => {
            const parent_2 = executionAsyncId()
            expect(triggerAsyncId()).to.equal(parent_1)
            process.nextTick(() => {
                const parent_3 = executionAsyncId()
                expect(triggerAsyncId()).to.equal(parent_2)
                process.nextTick(() => {
                    expect(triggerAsyncId()).to.equal(parent_3)
                    runAnother(executionAsyncId())
                })
            })
        })
    })
})
