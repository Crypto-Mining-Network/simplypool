import {
    InitAction,
    ChangePageAction,
    UpdateMinersAction,
    UpdateMinerInfoAction,
    ToggleWalletsInfoAction,
    ExpandWorkerStatsAction,
    SortWorkersByAction,
    ChangeWorkersLimitAction,
    ChangeWorkersSearchValueAction
} from "./actions";


export class AppDispatcher {
    constructor(model, actionQueue) {
        this.model = model;
        this.actionQueue = actionQueue;
        this.poll = null;
    }

    dispatch(action) {
        console.log("[AppDispatcher.dispatch()]", action);
        if (action instanceof InitAction) {

        } else if (action instanceof ChangePageAction) {
            if (this.poll != null) {
                clearInterval(this.poll);
                this.poll = null;
            }
            if (action.pathname == "/miners") {
                requestMiners(this.actionQueue);
                this.poll = setInterval(() => {
                    requestMiners(this.actionQueue);
                }, 60000);
            } else if (action.pathname.startsWith("/miners/")) {
                this.model.workersExpandStatus = {};
                this.model.sortBy = "id";
                this.model.sortDesc = false;
                this.model.workersLimit = 10;
                this.model.workersSearchValue = "";
                requestMinerInfo(this.actionQueue, action.pathname.split("/")[2], action.pathname.split("/")[3]);
                this.poll = setInterval(() => {
                    requestMinerInfo(this.actionQueue, action.pathname.split("/")[2], action.pathname.split("/")[3]);
                }, 5000);
            }
        } else if (action instanceof UpdateMinersAction) {
            this.model.miners = action.miners;
        } else if (action instanceof UpdateMinerInfoAction) {
            this.model.currentMinerInfo = action.minerInfo;
            sortWorkers(this.model.currentMinerInfo.workers, this.model.sortBy, this.model.sortDesc);
        } else if (action instanceof ToggleWalletsInfoAction) {
            this.model.showWalletsInfo = !this.model.showWalletsInfo;
        } else if (action instanceof ExpandWorkerStatsAction) {
            this.model.workersExpandStatus[action.worker] = !this.model.workersExpandStatus[action.worker];
        } else if (action instanceof SortWorkersByAction) {
            if (this.model.sortBy == action.by) {
                this.model.sortDesc = !this.model.sortDesc;
            }
            this.model.sortBy = action.by;
            sortWorkers(this.model.currentMinerInfo.workers, this.model.sortBy, this.model.sortDesc);
        } else if (action instanceof ChangeWorkersLimitAction) {
            this.model.workersLimit = action.limit;
        } else if (action instanceof ChangeWorkersSearchValueAction) {
            this.model.workersSearchValue = action.value;
        }
    }
}

async function requestMiners(actionQueue) {
    let miners = await (await fetch(`${window.config.api_url}/get_miners`)).json();
    actionQueue.put(new UpdateMinersAction(miners))
}

async function requestMinerInfo(actionQueue, coin, wallet) {
    let minerInfo = await (await fetch(`${window.config.api_url}/get_miner_info?coin=${coin}&wallet=${wallet}`)).json();
    actionQueue.put(new UpdateMinerInfoAction(minerInfo))
}


function keysrt(key, key1, desc){
    return function(a, b) {
        if(a[key] < b[key]) {
            return (desc ? 1 : -1);
        } else if(a[key] > b[key]) {
            return (desc ? -1 : 1);
        }
        if(a[key1] < b[key1]) {
            return (desc ? 1 : -1);
        } else if(a[key1] > b[key1]) {
            return (desc ? -1 : 1);
        }
        return 0;
    }
}


function sortWorkers(workers, key, desc) {
    console.log("sorting by " + key)
    workers.sort(keysrt(key, "id", desc));
}