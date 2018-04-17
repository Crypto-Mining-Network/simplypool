export class InitAction {}
export class ChangePageAction {
    constructor(pathname) {
        this.pathname = pathname;
    }
}
export class UpdateMinersAction {
    constructor(miners) {
        this.miners = miners;
    }
}
export class UpdateMinerInfoAction {
    constructor(minerInfo) {
        this.minerInfo = minerInfo;
    }
}
export class ToggleWalletsInfoAction {}
export class ExpandWorkerStatsAction {
    constructor(worker) {
        this.worker = worker;
    }
}
export class SortWorkersByAction {
    constructor(by) {
        this.by = by;
    }
}
export class ChangeWorkersLimitAction {
    constructor(limit) {
        this.limit = limit;
    }
}
export class ChangeWorkersSearchValueAction {
    constructor(value) {
        this.value = value;
    }
}