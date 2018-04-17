export class AppModel {
    constructor(actionQueue) {
        this.actionQueue = actionQueue;

        this.miners = [];
        this.currentMinerInfo = null;
        this.showWalletsInfo = true;
        this.workersExpandStatus = {};
        this.sortBy = "id";
        this.sortDesc = false;
        this.workersLimit = 10;
        this.workersSearchValue = "";
    }
}