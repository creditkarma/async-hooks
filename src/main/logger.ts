import * as debug from './debug'

export const log = (msg: string, data?: any) => {
    if (data !== undefined && process.env.DEBUG !== undefined) {
        debug.info(`[async-hooks:info] ${msg}`, data)
    } else if (process.env.DUBUG !== undefined) {
        debug.info(`[async-hooks:info] ${msg}`)
    }
}

export const warn = (msg: string, data?: any) => {
    if (data !== undefined) {
        debug.info(`[async-hooks:warn] ${msg}`, data)
    } else {
        debug.info(`[async-hooks:warn] ${msg}`)
    }
}

export const error = (msg: string, data?: any) => {
    if (data !== undefined) {
        debug.error(`[async-hooks:error] ${msg}`, data)
    } else {
        debug.error(`[async-hooks:error] ${msg}`)
    }
}
