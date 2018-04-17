import createHistory from 'history/createBrowserHistory'
import React from "react";
import { HashRouter, Switch, Route, Link } from "react-router-dom";
import { IndexContentView } from "./index_content";
import { MinersContentView } from "./miners_content";
import { MinerInfoContentView } from "./miner_info_content";
import { ChangePageAction } from "../actions";

export class AppView extends React.Component {
    componentDidMount() {
        this.props.actionQueue.put(new ChangePageAction(document.location.hash.slice(1)));
        const history = createHistory();
        history.listen((location, action) => {
            this.props.actionQueue.put(new ChangePageAction(location.hash.slice(1)));
        });
    }

    render() {
        return (
            <HashRouter>
                <div>
                    <div className="app__main">
                        <div className="app__header1">
                            <div className="app__wrapper">
                                <Link className="app__header1_link app__find_miner_button" to="/miners">Найти майнер</Link>
                                <Link className="app__header1_link app__payments_button" to="/">Последние выплаты</Link>
                                <Link className="app__header1_link app__accounting_button" to="/">Ваша бухгалтерия</Link>
                                <div className="app__language_box">
                                    <span className="app__header1_link app__language_span">Язык</span>
                                    <a className="app__header1_link app__language_link" href="#">Русский</a>
                                </div>
                            </div>
                        </div>
                        <div className="app__header2">
                            <div className="app__wrapper">
                                <Link className="app__logo" to="/"/>
                                <Link className="app__header2_link" to="/">Главная</Link>
                                <a className="app__header2_link">Статистика</a>
                                <a className="app__header2_link">API</a>
                                <a className="app__header2_link">FAQ</a>
                                <div className="app__login_box">
                                    <input type="text" className="app__login_input app__login_email" placeholder="Email"/>
                                    <input type="password" className="app__login_input app__login_password" placeholder="Password"/>
                                    <a className="app__login_link app__login_registration_link" href="#">Регистрация</a>
                                    <a className="app__login_link app__login_forget_link" href="#">Забыли пароль?</a>
                                </div>
                            </div>
                        </div>
                        <div className="app__content">
                            <div className="app__wrapper">
                                <Switch>
                                    <Route exact path='/' render={ (props) => <IndexContentView {...this.props}/> }/>
                                    <Route exact path='/miners' render={ (props) => <MinersContentView {...this.props}/> }/>
                                    <Route path='/miners/' render={ (props) => <MinerInfoContentView {...this.props}/> }/>
                                </Switch>
                            </div>
                        </div>
                        <div className="app__push"/>
                    </div>
                    <div className="app__footer">
                        <p className="app__footer_text">SimplyPool.net © 2018</p>
                        <p className="app__footer_text">Ethereum, Monero, Karbowanec mining pool. E-mail: <a className="app__footer_link" href="mailto:admin@simplypool.net">admin@simplypool.net</a></p>
                        <p className="app__footer_text">
                            SimplyPool Wallets:<br/>
                            ETH - <br/>
                            XMR - <br/>
                            KRB -
                        </p>
                    </div>
                </div>
            </HashRouter>
        );
    }
}