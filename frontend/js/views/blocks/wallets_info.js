import React from "react";

import { ToggleWalletsInfoAction } from "../../actions";


export class WalletsInfoBlockView extends React.Component {
    render() {
        return (
            <div className={"wallets_info" + (this.props.showWalletsInfo ? " show" : " hide") }>
                <a className="wallets_info__hide_button"
                   onClick={ (e) => { this.props.actionQueue.put(new ToggleWalletsInfoAction()) } }
                >Свернуть</a>
                <a className="wallets_info__hide_icon"
                   onClick={ (e) => { this.props.actionQueue.put(new ToggleWalletsInfoAction()) } }
                >{ (this.props.showWalletsInfo ? "-" : "+") }</a>
                <div className="wallets_info__wallets_box">
                    <ul className="wallets_info__wallets_list">
                        { this.props.currentMinerInfo.wallets.map((wallet) => (
                            <li className="wallets_info__wallet">
                                <span className="wallets_info__wallet_coin">{ wallet.coin.toUpperCase() } wallet</span>
                                <span className="wallets_info__wallet_value_wrapper">
                                    <span className="wallets_info__wallet_value">{ wallet.wallet }</span>
                                </span>
                            </li>
                        )) }
                    </ul>
                </div>
                <div className="wallets_info__tweets_box"></div>
            </div>
        );
    }
}