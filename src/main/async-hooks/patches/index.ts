import { patchPromise } from './promise'
import { Patch } from './types'

export interface IPatchMap {
    [name: string]: Patch
}

export const patches: IPatchMap = {
    promise: patchPromise,
}
