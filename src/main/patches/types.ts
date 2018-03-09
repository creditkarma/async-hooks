import { IHooks } from '../Hooks'
import { State } from '../State'

export type Patch = (hooks: IHooks, state: State) => void
