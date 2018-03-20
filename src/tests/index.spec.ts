import { expect } from 'code'
import * as Lab from 'lab'
// import * as net from 'net'

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
        let initCalled = 0
        let beforeCalled = 0
        let afterCalled = 0
        let called = false

        const callbacks: IHookCallbacks = {
            init() {
                // debug('init: ', arguments)
                initCalled += 1
            },
            before() {
                // debug('before: ', arguments)
                beforeCalled += 1
            },
            after() {
                // debug('after: ', arguments)
                afterCalled += 1
            },
        }

        createHook(callbacks).enable()

        setTimeout(() => {
            called = true
        }, 50)

        setTimeout(() => {
            expect(initCalled).to.equal(2)
            expect(beforeCalled).to.equal(2)
            expect(afterCalled).to.equal(1)
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
