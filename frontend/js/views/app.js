import createHistory from 'history/createBrowserHistory'
import React from "react";
import { HashRouter, Switch, Route, Link } from "react-router-dom";
import { IndexContentView } from "./index_content";
import { MinersContentView } from "./miners_content";
import { MinerInfoContentView } from "./miner_info_content";
import { RegisterContentView } from "./register_content";
import { ActivateContentView } from "./activate_content";
import {
    ChangePageAction,
    LoginAction,
    UpdateAuthenticationInfoAction,
    LogoutAction,
    ShowMinerSettingsAction,
    HideMinerSettingsAction,
    UpdateMinerSettingsAction,
    SaveMinerSettingsAction
} from "../actions";


export class AppView extends React.Component {
    componentDidMount() {
        this.props.actionQueue.put(new ChangePageAction(document.location.hash.slice(1)));
        const history = createHistory();
        history.listen((location, action) => {
            this.props.actionQueue.put(new ChangePageAction(location.hash.slice(1)));
        });
        document.addEventListener("mousedown", (e) => {
            if (this.minerSettingsRef && !this.minerSettingsRef.contains(event.target)) {
                this.props.actionQueue.put(new HideMinerSettingsAction())
            }
        });
    }

    render() {
        return (
            <HashRouter>
                <div>
                    <div className="app__main">
                        <div className="app__header1">
                            <div className="app__wrapper">
                                { this.props.isAuthenticated ? (
                                    <Link className="app__header1_link app__cabinet_button" to="/account">Кабинет</Link>
                                ) : "" }
                                <Link className="app__header1_link app__find_miner_button" to="/miners">Найти майнер</Link>
                                <Link className="app__header1_link app__payments_button" to="/">Последние выплаты</Link>
                                { this.props.isAuthenticated ? (
                                    <Link className="app__header1_link app__accounting_button" to="/">Ваша бухгалтерия</Link>
                                ) : "" }
                                <div className="app__language_box">
                                    <span className="app__header1_link app__language_span">Язык</span>
                                    <a className="app__header1_link app__language_link" href="#">Русский</a>
                                </div>
                            </div>
                        </div>
                        <div className="app__header2">
                            <div className="app__wrapper">
                                { this.props.showMinerSettings ? (
                                    <form
                                        className="app__miner_settings"
                                        ref={ (node) => { this.minerSettingsRef = node } }
                                        onSubmit={ (e) => {
                                            this.props.actionQueue.put(new SaveMinerSettingsAction());
                                            e.preventDefault();
                                        } }
                                    >
                                        <a
                                            className="app__miner_settings_close_link"
                                            onClick={ (e) => { this.props.actionQueue.put(new HideMinerSettingsAction()) } }
                                        >x</a>
                                        <div className="app__miner_settings_row">
                                            <label>Доп. E-mail (через запятую):</label>
                                            <input
                                                className={"app__miner_settings_input" + ( this.props.minerSettings.additional_emails_error ? " error" : "") }
                                                type="text"
                                                defaultValue={ this.props.minerSettings.additional_emails }
                                                onChange={ (e) => {
                                                    this.props.actionQueue.put(new UpdateMinerSettingsAction({additional_emails: e.target.value}));
                                                } }
                                            />
                                            { this.props.minerSettings.additional_emails_error ? (
                                                <div className="app__miner_settings_input_error">
                                                    { this.props.minerSettings.additional_emails_error }
                                                </div>
                                            ) : "" }
                                        </div>
                                        { this.props.minerSettings.error ? (
                                            <div className="app__miner_settings_error">
                                                Произошла ошибка
                                            </div>
                                        ) : "" }
                                        <div className="app__miner_settings_row">
                                            <label>Телеграм бот:</label>
                                            <a target="blank" href="https://t.me/SimplyPoolBot">https://t.me/SimplyPoolBot</a>
                                        </div>
                                        <input className="app__miner_settings_button" type="submit" value="Сохранить"/>
                                    </form>
                                        ) : "" }
                                <Link className="app__logo" to="/"/>
                                <Link className="app__header2_link" to="/">Главная</Link>
                                <a className="app__header2_link">Статистика</a>
                                <a className="app__header2_link">API</a>
                                <a className="app__header2_link">FAQ</a>
                                { !this.props.isAuthenticated ? (
                                    <form
                                        className="app__login_box"
                                        onSubmit={ (e) => {
                                            this.props.actionQueue.put(new LoginAction());
                                            e.preventDefault();
                                        } }
                                    >
                                        <input
                                            type="text"
                                            className={ "app__login_input app__login_email" + ( this.props.authenticationInfo.error ? " error" : "" ) }
                                            placeholder="Email"
                                            value={ this.props.authenticationInfo.email }
                                            onChange={ (e) => { this.props.actionQueue.put(new UpdateAuthenticationInfoAction({ email: e.target.value })) } }
                                        />
                                        <input
                                            type="password"
                                            className={"app__login_input app__login_password" + ( this.props.authenticationInfo.error ? " error" : "" ) }
                                            placeholder="Password"
                                            value={ this.props.authenticationInfo.password }
                                            onChange={ (e) => { this.props.actionQueue.put(new UpdateAuthenticationInfoAction({ password: e.target.value })) } }
                                        />
                                        <input className="app__login_submit" type="submit" />
                                        <Link
                                            className="app__login_link app__login_registration_link"
                                            to="/register"
                                        >Регистрация</Link>
                                        <Link
                                            className="app__login_link app__login_forget_link"
                                            to="/recover"
                                        >Забыли пароль?</Link>
                                    </form>
                                ) : "" }
                                { this.props.isAuthenticated ? (
                                    <div className="app__authenticated_box">
                                        <span className="app__authenticated_caption">Ваш логин:</span>
                                        <span className="app__authenticated_login">{ this.props.authenticationInfo.email }</span>
                                        <a
                                            className="app__authenticated_settings_link"
                                            onClick={ (e) => { this.props.actionQueue.put(new ShowMinerSettingsAction()) } }
                                        >Настройки майнера</a>
                                        <a
                                            className="app__authenticated_logout_link"
                                            href="#"
                                            onClick={ (e) => {
                                                this.props.actionQueue.put(new LogoutAction());
                                                e.preventDefault();
                                            } }
                                        >Выйти</a>
                                    </div>
                                ) : "" }
                            </div>
                        </div>
                        <div className="app__content">
                            <div className="app__wrapper">
                                <Switch>
                                    <Route exact path='/' render={ (props) => <IndexContentView { ...this.props } /> } />
                                    <Route exact path='/miners' render={ (props) => <MinersContentView { ...this.props } /> }/>
                                    <Route path='/miners/' render={ (props) => <MinerInfoContentView { ...this.props } /> }/>
                                    <Route exact path='/register' render={ (props) => <RegisterContentView { ...this.props } /> } />
                                    <Route path='/activate/' render={ (props) => <ActivateContentView { ...this.props } /> } />
                                    <Route exact path='/account' render={ (props) => <MinerInfoContentView { ...this.props } /> }/>
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