import Cookies from "js-cookie";
import history from "./history";
import {
    InitAction,
    ChangePageAction,
    UpdatePoolInfoAction,
    UpdateMinersAction,
    UpdateMinerInfoAction,
    ToggleWalletsInfoAction,
    ExpandWorkerStatsAction,
    SortWorkersByAction,
    ChangeWorkersLimitAction,
    ChangeWorkersSearchValueAction,
    UpdateRegisterInfoAction,
    RegisterAction,
    RegisterErrorAction,
    RegisterSuccessAction,
    ActivateErrorAction,
    ActivateSuccessAction,
    UpdateAuthenticationInfoAction,
    LoginAction,
    LoginErrorAction,
    LoginSuccessAction,
    LogoutAction,
    ShowMinerSettingsAction,
    HideMinerSettingsAction,
    UpdateMinerSettingsAction,
    SaveMinerSettingsAction,
    SaveMinerSettingsErrorAction,
    SaveMinerSettingsSuccessAction,
    PollLoginSuccessAction
} from "./actions";


export class AppDispatcher {
    constructor(model, actionQueue) {
        this.model = model;
        this.actionQueue = actionQueue;
        this.poll = null;
        this.loginPoll = null;
    }

    dispatch(action) {
        console.log("[AppDispatcher.dispatch()]", action);
        if (action instanceof InitAction) {
            if (Cookies.get("email")) {
                this.model.authenticationInfo.email = Cookies.get("email");
                this.model.authenticationInfo.password = Cookies.get("password");
                this.model.isAuthenticated = true;
                pollLogin(this.actionQueue, this.model.authenticationInfo.email, this.model.authenticationInfo.password);
                this.loginPoll = setInterval(() => {
                    pollLogin(this.actionQueue, this.model.authenticationInfo.email, this.model.authenticationInfo.password);
                }, 5000);
            }

        } else if (action instanceof ChangePageAction) {
            if (this.poll != null) {
                clearInterval(this.poll);
                this.poll = null;
            }
            if (action.pathname == "/") {
                requestPoolInfo(this.actionQueue);
                this.poll = setInterval(() => {
                    requestPoolInfo(this.actionQueue);
                }, 15000);
            } else if (action.pathname == "/miners") {
                requestMiners(this.actionQueue);
                this.poll = setInterval(() => {
                    requestMiners(this.actionQueue);
                }, 60000);
            } else if (action.pathname.startsWith("/miners/")) {
                this.model.currentMinerInfo = null;
                this.model.workersExpandStatus = {};
                this.model.sortBy = "id";
                this.model.sortDesc = false;
                this.model.workersLimit = 50;
                this.model.workersSearchValue = "";
                requestMinerInfo(this.actionQueue, action.pathname.split("/")[2], action.pathname.split("/")[3]);
                this.poll = setInterval(() => {
                    requestMinerInfo(this.actionQueue, action.pathname.split("/")[2], action.pathname.split("/")[3]);
                }, 5000);
            } else if (action.pathname == "/register") {
                this.model.registerStatus = "initial";
                this.model.registerError = null;
                this.model.registerInfo = {
                    email: "",
                    email_error: null,
                    password: "",
                    password_error: null,
                    password_repeat: "",
                    password_repeat_error: null,
                }
            } else if (action.pathname.startsWith("/activate/")) {
                let email = action.pathname.split("/")[2],
                    code = action.pathname.split("/")[3];
                this.model.activateStatus = "initial";
                activate(this.actionQueue, email, code);
            } else if (action.pathname == "/account") {
                this.model.currentMinerInfo = null;
                this.model.workersExpandStatus = {};
                this.model.sortBy = "id";
                this.model.sortDesc = false;
                this.model.workersLimit = 50;
                this.model.workersSearchValue = "";
                requestMinerInfoAuthenticated(this.actionQueue, this.model.authenticationInfo);
                this.poll = setInterval(() => {
                    requestMinerInfoAuthenticated(this.actionQueue, this.model.authenticationInfo);
                }, 5000);
            }
        } else if (action instanceof UpdatePoolInfoAction) {
            this.model.poolInfo = action.info;
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
        } else if (action instanceof UpdateRegisterInfoAction) {
            Object.assign(this.model.registerInfo, action.info);
        } else if (action instanceof RegisterAction) {
            let shouldRegister = true;
            if (!validateEmail(this.model.registerInfo.email)) {
                this.model.registerInfo.email_error = `Введите корректный e-mail`;
                shouldRegister = false;
            }
            if (this.model.registerInfo.password == "") {
                this.model.registerInfo.password_error = `Пароль не может быть пустым`;
                shouldRegister = false;
            }
            if (this.model.registerInfo.password != this.model.registerInfo.password_repeat) {
                this.model.registerInfo.password_error = `Пароли не совпадают`;
                this.model.registerInfo.password_repeat_error = `Пароли не совпадают`;
                shouldRegister = false;
            }

            if (shouldRegister) {
                register(this.actionQueue, this.model.registerInfo.email, this.model.registerInfo.password);
                this.model.registerStatus = "in_process";
            }
        } else if (action instanceof RegisterErrorAction) {
            this.model.registerStatus = "error";
            this.model.registerError = action.error;
        } else if (action instanceof RegisterSuccessAction) {
            this.model.registerStatus = "success";
        } else if (action instanceof ActivateErrorAction) {
            this.model.activateStatus = "error";
        } else if (action instanceof ActivateSuccessAction) {
            this.model.activateStatus = "success";
        } else if (action instanceof UpdateAuthenticationInfoAction) {
            Object.assign(this.model.authenticationInfo, action.info);
        } else if (action instanceof LoginAction) {
            login(this.actionQueue, this.model.authenticationInfo.email, this.model.authenticationInfo.password);
        } else if (action instanceof LoginSuccessAction) {
            this.model.isAuthenticated = true;
            this.model.authenticationInfo.error = null;
            Cookies.set("email", this.model.authenticationInfo.email);
            Cookies.set("password", this.model.authenticationInfo.password);
            history.push("/account");
            pollLogin(this.actionQueue, this.model.authenticationInfo.email, this.model.authenticationInfo.password);
            this.loginPoll = setInterval(() => {
                pollLogin(this.actionQueue, this.model.authenticationInfo.email, this.model.authenticationInfo.password);
            }, 5000);
        } else if (action instanceof LoginErrorAction) {
            this.model.authenticationInfo.error = true;
        } else if (action instanceof LogoutAction) {
            this.model.isAuthenticated = false;
            this.model.authenticationInfo = {
                email: "",
                password: "",
                error: null
            };
            Cookies.remove("email");
            Cookies.remove("password");
            history.push("/");
            if (this.loginPoll != null) {
                clearInterval(this.loginPoll);
                this.loginPoll = null;
            }
        } else if (action instanceof ShowMinerSettingsAction) {
            this.model.showMinerSettings = true;
        } else if (action instanceof HideMinerSettingsAction) {
            this.model.showMinerSettings = false;
            Object.assign(this.model.minerSettings, this.model.minerSettingsOld);
        } else if (action instanceof UpdateMinerSettingsAction) {
            Object.assign(this.model.minerSettings, action.settings);
        } else if (action instanceof SaveMinerSettingsAction) {
            if (!validateAdditionalEmails(this.model.minerSettings.additional_emails)) {
                this.model.minerSettings.additional_emails_error = `Неправильный формат`;
            } else {
                saveMinerSettings(this.actionQueue, this.model.authenticationInfo, this.model.minerSettings);
            }
        } else if (action instanceof SaveMinerSettingsSuccessAction) {
            this.model.minerSettings.error = "";
            this.model.minerSettings.additional_emails_error = "";
            Object.assign(this.model.minerSettingsOld, this.model.minerSettings);
            this.model.showMinerSettings = false;
        } else if (action instanceof SaveMinerSettingsErrorAction) {
            this.model.minerSettings.error = action.error;
        } else if (action instanceof PollLoginSuccessAction) {
            Object.assign(this.model.minerSettingsOld, action.minerSettings);
            if (!this.model.showMinerSettings) {
                Object.assign(this.model.minerSettings, action.minerSettings);
            }
        }
    }
}


async function login(actionQueue, email, password) {
    let response;
    try {
        response = await (await fetch(`${window.config.api_url}/check_login?email=${email}&password=${password}`)).json();
        if (!response.result) {
            actionQueue.put(new LoginErrorAction());
            return
        }
    } catch (err) {
        actionQueue.put(new LoginErrorAction());
        return
    }
    actionQueue.put(new LoginSuccessAction(response.minerSettings));
}

async function pollLogin(actionQueue, email, password) {
    let response;
    try {
        response = await (await fetch(`${window.config.api_url}/check_login?email=${email}&password=${password}`)).json();
        if (!response.result) {
            actionQueue.put(new LogoutAction());
            return
        }
    } catch (err) {
        return
    }
    actionQueue.put(new PollLoginSuccessAction(response.miner_settings));
}

async function register(actionQueue, email, password) {
    let formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
        let response = await (await fetch(`${window.config.api_url}/register`, {
            method: "POST",
            body: formData
        })).json();
        if (response.error) {
            actionQueue.put(new RegisterErrorAction(response.error));
            return
        }
    } catch (err) {
        actionQueue.put(new RegisterErrorAction("internal_error"));
        return
    }
    actionQueue.put(new RegisterSuccessAction());
}


async function activate(actionQueue, email, code) {
    let formData = new FormData();
    formData.append("email", email);
    formData.append("code", code);

    try {
        let response = await (await fetch(`${window.config.api_url}/activate`, {
            method: "POST",
            body: formData
        })).json();
        if (response.error) {
            actionQueue.put(new ActivateErrorAction(response.error));
            return
        }
    } catch (err) {
        actionQueue.put(new ActivateErrorAction("internal_error"));
        return
    }
    actionQueue.put(new ActivateSuccessAction());
}


async function requestPoolInfo(actionQueue, coin, wallet) {
    let minerInfo = await (await fetch(`${window.config.api_url}/get_pool_info`)).json();
    actionQueue.put(new UpdatePoolInfoAction(minerInfo))
}


async function requestMiners(actionQueue) {
    let miners = await (await fetch(`${window.config.api_url}/get_miners`)).json();
    actionQueue.put(new UpdateMinersAction(miners))
}


async function requestMinerInfo(actionQueue, coin, wallet) {
    let minerInfo = await (await fetch(`${window.config.api_url}/get_miner_info?coin=${coin}&wallet=${wallet}`)).json();
    actionQueue.put(new UpdateMinerInfoAction(minerInfo))
}


async function requestMinerInfoAuthenticated(actionQueue, authenticationInfo) {
    let minerInfo = await (await fetch(`${window.config.api_url}/get_miner_info?email=${authenticationInfo.email}&password=${authenticationInfo.password}`)).json();
    actionQueue.put(new UpdateMinerInfoAction(minerInfo))
}


async function saveMinerSettings(actionQueue, authenticationInfo, minerSettings) {
    let formData = new FormData();
    formData.append("additional_emails", minerSettings.additional_emails || "");
    formData.append("email", authenticationInfo.email);
    formData.append("password", authenticationInfo.password);

    try {
        let response = await (await fetch(`${window.config.api_url}/set_miner_settings`, {
            method: "POST",
            body: formData
        })).json();
        if (response.error) {
            actionQueue.put(new SaveMinerSettingsErrorAction(response.error));
            return
        }
    } catch (err) {
        actionQueue.put(new SaveMinerSettingsErrorAction("internal_error"));
        return
    }
    actionQueue.put(new SaveMinerSettingsSuccessAction());

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
    if (workers) {
        workers.sort(keysrt(key, "id", desc));
    }
}


function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function validateAdditionalEmails(additionalEmails) {
    if (!additionalEmails || additionalEmails.trim() == "") {
        return true;
    }

    for (let email of additionalEmails.split(",")) {
        email = email.trim();
        console.log(email);
        if (!validateEmail(email)) {
            return false;
        }
    }

    return true;
}