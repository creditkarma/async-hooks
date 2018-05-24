const MAX_KEY: number = 100000000

export class State {
    constructor(
        public enabled: boolean = true,
        public previousIds: Array<number> = [],
        public childToParent: Map<number, number> = new Map(),
        private nextId: number = 0,
        public currentId: number = 0,
        public parentId: number = 0,
    ) {}

    public getNextId(): number {
        if (this.nextId >= MAX_KEY) {
            this.nextId = 0
        }

        return (this.nextId += 1)
    }
}
