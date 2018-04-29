import React from "react";

import { timeSince, hashrateHuman } from "../utils/format";


export class IndexContentView extends React.Component {
    render() {
        return (
            <div className="index">
                <div className="index__box">
                    <h2 className="index__box_header">Active miners</h2>
                    <div className="index__box_chart" />
                    <div className="index__box_content1">
                        <span>
                            Online workers<br/>{ this.props.poolInfo.online_workers }
                        </span>
                    </div>
                    <div className="index__box_content2">
                        <span>
                            Offlline workers<br/>{ this.props.poolInfo.offline_workers }
                        </span>
                    </div>
                </div>
                { this.props.poolInfo.coins.map((coin) => (
                    <div className="index__box">
                        <h2 className="index__box_header">{ coin.name.toUpperCase() } Hashrate</h2>
                        <div className="index__box_chart" >
                            <span className="index__box_chart_caption">{ hashrateHuman(coin.hashrate) }</span>
                        </div>
                        <div className="index__box_content1">
                            <span>
                                Минимальный вывод<br/>N/A { coin.name.toUpperCase() }
                            </span>
                        </div>
                        <div className="index__box_content2">
                            <span>
                                Last Block Found<br/>{ coin.last_block_at ? timeSince(coin.last_block_at * 1000) : "Never" }
                            </span>
                        </div>
                    </div>
                )) }

            </div>
        );
    }
}