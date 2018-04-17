import ReactDOM from "react-dom";
import React from "react";

import { Queue } from "./utils/queue";
import { AppModel } from "./model";
import { AppDispatcher } from "./dispatcher";
import { AppView } from "./views";
import { InitAction } from "./actions";


export class App {
    constructor(appElement) {
        this.appElement = appElement;

        this._actionQueue = new Queue();
        this._model = new AppModel(this._actionQueue);
        this._dispatcher = new AppDispatcher(this._model, this._actionQueue);

        this._actionQueue.put(new InitAction());
        ReactDOM.render(<AppView {...this._model} />, this.appElement);
        (async () => {
            while (1) {
                this._dispatcher.dispatch(await this._actionQueue.get());
                ReactDOM.render(<AppView {...this._model} />, this.appElement);
            }
        })();
    }
}

document.addEventListener("DOMContentLoaded", function() {
    new App(document.getElementById("application"));
});