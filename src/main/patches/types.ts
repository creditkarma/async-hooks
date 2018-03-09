import { IHooks } from '../Hooks'
import { IState } from '../types'

export type Patch = (hooks: IHooks, state: IState) => void
