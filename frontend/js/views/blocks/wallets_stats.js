import { hashrateHuman } from "../../utils/format";

import React from "react";


export class WalletsStatsBlockView extends React.Component {
    render() {
        return (
            <div className="wallets_stats">
                <div className="wallets_stats__blocks">
                    <div className="wallets_stats__stat_block wallets_stats__profit_block">
                        <div className="wallets_stats__stat_block_wrapper">
                            <div className="wallets_stats__stat_block_header">
                                Прибыльность
                            </div>
                            <div className="wallets_stats__stat_block_value">
                                <span>--</span>
                            </div>
                        </div>
                    </div>
                    <div className="wallets_stats__stat_block wallets_stats__workers_block">
                        <div className="wallets_stats__stat_block_wrapper">
                            <div className="wallets_stats__stat_block_header">
                                Воркеры
                            </div>
                            <div className="wallets_stats__stat_block_value">
                                <span>{ this.props.currentMinerInfo.workers.filter((x) => x.status != "offline").length } / { this.props.currentMinerInfo.workers.length }</span>
                            </div>
                        </div>
                    </div>
                    <div className="wallets_stats__stat_block wallets_stats__due_block">
                        <div className="wallets_stats__stat_block_wrapper">
                            <div className="wallets_stats__stat_block_header">
                                Невыплаченный баланс
                            </div>
                            <div className="wallets_stats__stat_block_value">
                                <span>N/A USD
                                { this.props.currentMinerInfo.wallets.map((wallet) => (
                                    <span className="small">{ wallet.due_balance.toFixed(3) } { wallet.coin.toUpperCase() }</span>
                                )) }
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="wallets_stats__stat_block wallets_stats__account_block">
                        <div className="wallets_stats__stat_block_wrapper wallets_stats__income_wrapper">
                            <div className="wallets_stats__stat_block_header">
                                Доходы за весь период
                            </div>
                            <div className="wallets_stats__stat_block_value">
                                <span>--</span>
                            </div>
                        </div>
                        <div className="wallets_stats__stat_block_wrapper wallets_stats__spends_wrapper">
                            <div className="wallets_stats__stat_block_header">
                                Расходы за весь период
                            </div>
                            <div className="wallets_stats__stat_block_value">
                                <span>--</span>
                            </div>
                        </div>
                    </div>
                </div>
                <table className="wallets_stats__table">
                    <thead>
                    <tr>
                        <td>&nbsp;</td>
                        <td>Last calculated <br/>Hashrate</td>
                        <td>Average 6h <br/>Hashrate</td>
                        <td>Прибыльность <br/>в день</td>
                        <td>Невыплаченный <br/>баланс</td>
                    </tr>
                    </thead>
                    <tbody>
                    { this.props.currentMinerInfo.wallets.map((wallet) => (
                            <tr>
                                <td>{ wallet.coin.toUpperCase() }</td>
                                <td>{ hashrateHuman(wallet.hashrate) }</td>
                                <td>{ hashrateHuman(wallet.hashrate_6h) }</td>
                                <td>-</td>
                                <td>{ wallet.due_balance.toFixed(6) }</td>
                            </tr>
                        )) }
                    </tbody>
                </table>
            </div>
        );
    }
}