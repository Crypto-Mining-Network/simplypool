export class InitAction {}
export class ChangePageAction {
    constructor(pathname) {
        this.pathname = pathname;
    }
}
export class UpdatePoolInfoAction {
    constructor(info) {
        this.info = info;
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
export class UpdateRegisterInfoAction {
    constructor(info) {
        this.info = info;
    }
}
export class RegisterAction {}
export class RegisterErrorAction {
    constructor(error) {
        this.error = error;
    }
}
export class RegisterSuccessAction {}
export class ActivateErrorAction {
    constructor(error) {
        this.error = error;
    }
}
export class ActivateSuccessAction {}
export class UpdateAuthenticationInfoAction {
    constructor(info) {
        this.info = info;
    }
}
export class LoginAction {}
export class LoginErrorAction {}
export class LoginSuccessAction {
    constructor(minerSettings) {
        this.minerSettings = minerSettings;
    }
}
export class LogoutAction {}
export class ShowMinerSettingsAction {}
export class HideMinerSettingsAction {}
export class UpdateMinerSettingsAction {
    constructor(settings) {
        this.settings = settings;
    }
}
export class SaveMinerSettingsAction {}
export class SaveMinerSettingsErrorAction {
    constructor(error) {
        this.error = error;
    }
}
export class SaveMinerSettingsSuccessAction {}
export class PollLoginSuccessAction {
    constructor(minerSettings) {
        this.minerSettings = minerSettings;
    }
}