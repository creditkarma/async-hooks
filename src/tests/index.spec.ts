import { expect } from 'code'
import * as Lab from 'lab'
// import * as net from 'net'

import {
    createHook,
    // debug,
    // executionAsyncId,
    IHookCallbacks,
} from '../main'

export const lab = Lab.script()

const describe = lab.describe
const it = lab.it
// const before = lab.before
// const after = lab.after

describe('Async Hooks', () => {

    it('should do things', (done) => {
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
})
