import React from "react";

import { WalletsInfoBlockView } from "./blocks/wallets_info";
import { WalletsStatsBlockView } from "./blocks/wallets_stats";
import { WorkersStatsBlockView } from "./blocks/workers_stats";


export class MinerInfoContentView extends React.Component {
    render() {
        return (
            <div className="miner_info">
                { this.props.currentMinerInfo ? (
                    <div>
                        <WalletsInfoBlockView { ...this.props }/>
                        <WalletsStatsBlockView { ...this.props }/>
                        <WorkersStatsBlockView { ...this.props }/>
                    </div>) : null }
            </div>
        );
    }
}