import React from "react";

import { UpdateRegisterInfoAction, RegisterAction, ChangePageAction } from "../actions";


export class RegisterContentView extends React.Component {
    render() {
        return (
            <div className="register">
                { this.props.registerStatus == "initial" || this.props.registerStatus == "in_process" ? (
                    <form
                        onSubmit={ (e) => {
                            this.props.actionQueue.put(new RegisterAction());
                            e.preventDefault();
                        } }
                    >
                        <div className="register__row">
                            <label className="register__label">E-mail:</label>
                            <input
                                disabled={ this.props.registerStatus == "in_process" }
                                className="register__input"
                                type="text"
                                value={ this.props.registerInfo.email }
                                onChange={ (e) => { this.props.actionQueue.put(new UpdateRegisterInfoAction({ email: e.target.value })) } }
                            />
                            { this.props.registerInfo.email_error ? (
                                <div className="register__error">
                                    { this.props.registerInfo.email_error }
                                </div>
                            ) : "" }
                        </div>
                        <div className="register__row">
                            <label className="register__label">Пароль:</label>
                            <input
                                disabled={ this.props.registerStatus == "in_process" }
                                className="register__input"
                                type="password"
                                value={ this.props.registerInfo.password }
                                onChange={ (e) => { this.props.actionQueue.put(new UpdateRegisterInfoAction({ password: e.target.value })) } }
                            />
                            { this.props.registerInfo.password_error ? (
                                <div className="register__error">
                                    { this.props.registerInfo.password_error }
                                </div>
                            ) : "" }
                        </div>
                        <div className="register__row">
                            <label className="register__label">Пароль еще раз:</label>
                            <input
                                disabled={ this.props.registerStatus == "in_process" }
                                className="register__input"
                                type="password"
                                value={ this.props.registerInfo.password_repeat }
                                onChange={ (e) => { this.props.actionQueue.put(new UpdateRegisterInfoAction({ password_repeat: e.target.value })) } }
                            />
                            { this.props.registerInfo.password_repeat_error ? (
                                <div className="register__error">
                                    { this.props.registerInfo.password_repeat_error }
                                </div>
                            ) : "" }
                        </div>
                        <input
                            disabled={ this.props.registerStatus == "in_process" }
                            className="register__button"
                            type="submit"
                            value="Зарегистрироваться"
                        />

                    </form>
                ) : "" }
                { this.props.registerStatus == "error" ? (
                    <div className="register__in_error">
                        Во время регистрации произошла ошибка{ this.props.registerError == "exists" ? `: пользователь с таким e-mail уже существует` : "" }<br/>
                        <button
                            className="register__button"
                            onClick={ () => { this.props.actionQueue.put(new ChangePageAction("/register")) } }
                        >В начало</button>
                    </div>
                ) : "" }
                { this.props.registerStatus == "success" ? (
                    <div className="register__in_success">
                        Регистрация прошла успешно, вам отправлено письмо для подтверждения e-mail
                    </div>
                ) : "" }
            </div>
        );
    }
}