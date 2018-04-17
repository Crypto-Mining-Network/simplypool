import { timeSince, timeHuman } from "../utils/format";
import history from "../history";

import React from "react";
import { Link } from "react-router-dom";


export class MinersContentView extends React.Component {
    render() {
        this.inputs = {};
        return (
            <ul className="miners">
                { this.props.miners.map((miner) => (
                    <li className="miners__coin" key={ miner[0] }>
                        <h2 className="miners__coin_header">{ miner[0].toUpperCase() }</h2>
                        <div className="miners__coin_track_box">
                            <input type="text" className="miners__coin_track_input" placeholder="Введите кошелек" ref={ (el) => { this.inputs[miner[0]] = el } }/>
                            <button
                                className="miners__coin_track_button"
                                onClick={ () => { history.push(`/miners/${ miner[0] }/${ this.inputs[miner[0]].value }`) } }
                            >Отследить</button>
                        </div>
                        <table className="miners__table table">
                            <thead>
                            <tr>
                                <td className="miners__table_wallet_td">Кошелек</td>
                                <td className="miners__table_uptime_td">Uptime</td>
                                <td className="miners__table_last_share_td">Last share</td>
                            </tr>
                            </thead>
                            <tbody>
                            { miner[1].map((wallet, i) => (
                                <tr>
                                    <td className="miners__table_wallet_td"><Link to={ `/miners/${ miner[0] }/${ wallet.wallet }/` }>{ wallet.wallet }</Link></td>
                                    <td className="miners__table_uptime_td">{ timeHuman(wallet.uptime * 1000) }</td>
                                    <td className="miners__table_last_share_td">{ timeSince(wallet.last_share * 1000) }</td>
                                </tr>
                            )) }
                            </tbody>
                        </table>
                    </li>
                )) }
            </ul>
        );
    }
}