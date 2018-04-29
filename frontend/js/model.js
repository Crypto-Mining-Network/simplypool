export class AppModel {
    constructor(actionQueue) {
        this.actionQueue = actionQueue;

        this.poolInfo = {
            online_miners: 0,
            offline_miners: 0,
            coins: []
        };
        this.miners = [];
        this.currentMinerInfo = null;
        this.showWalletsInfo = true;
        this.workersExpandStatus = {};
        this.sortBy = "id";
        this.sortDesc = false;
        this.workersLimit = 50;
        this.workersSearchValue = "";
        this.registerInfo = {
            email: "",
            email_error: null,
            password: "",
            password_error: null,
            password_repeat: "",
            password_repeat_error: null,
        };
        this.registerStatus = "initial";
        this.registerError = null;

        this.activateStatus = "initial";

        this.isAuthenticated = false;
        this.authenticationInfo = {
            email: "",
            password: "",
            error: null
        };
        this.showMinerSettings = false;
        this.minerSettingsOld = {
            additional_emails: "",
            additional_emails_error: "",
            error: ""
        };
        this.minerSettings = {
            additional_emails: "",
            additional_emails_error: "",
            error: ""
        }
    }
}