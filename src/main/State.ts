export class State {
    constructor(
        public enabled: boolean = true,
        public previousIds: Array<number> = [],
        public previousParents: Array<number> = [],
        public nextId: number = 0,
        public currentId: number = 0,
        public parentId: number = 0,
    ) {}

    public getNextId(): number {
        return (this.nextId += 1)
    }
}
