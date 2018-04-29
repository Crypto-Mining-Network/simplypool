import React from "react";


export class ActivateContentView extends React.Component {
    render() {
        return (
            <div className="activate">
                { this.props.activateStatus == "initial" ? (
                    <div className="activate__initial">
                        Проверка кода...
                    </div>
                ) : "" }
                { this.props.activateStatus == "error" ? (
                    <div className="activate__in_error">
                        Неправильный код активации
                    </div>
                ) : "" }
                { this.props.activateStatus == "success" ? (
                    <div className="activate__in_success">
                        Аккаунт активирован. Используйте форму входа.
                    </div>
                ) : "" }
            </div>
        );
    }
}