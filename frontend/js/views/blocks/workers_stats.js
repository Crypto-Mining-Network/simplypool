import React from "react";

import { timeSince, timeHuman, hashrateHuman } from "../../utils/format";
import { ExpandWorkerStatsAction, SortWorkersByAction, ChangeWorkersLimitAction, ChangeWorkersSearchValueAction } from "../../actions";


export class WorkersStatsBlockView extends React.Component {
    render() {
        return (
            <div className="workers_stats">
                <div className="workers_stats__box">
                    <div className="workers_stats__header_box">
                        <h2 className="workers_stats__header">Воркеры</h2>
                        <div className="workers_stats__counts">
                            <span className="workers_stats__online_count">Онлайн <span>{ this.props.currentMinerInfo.workers.filter((x) => x.status != "offline").length }</span></span>
                            <span className="workers_stats__offline_count">Офлайн <span>{ this.props.currentMinerInfo.workers.filter((x) => x.status == "offline").length }</span></span>
                            <span className="workers_stats__total_count">Всего <span>{ this.props.currentMinerInfo.workers.length }</span></span>
                        </div>
                        <input
                            className="workers_stats__search_input"
                            type="text"
                            value={ this.props.workersSearchValue }
                            onChange={ (e) => { this.props.actionQueue.put(new ChangeWorkersSearchValueAction(e.target.value)) } }
                        />
                    </div>
                    <table className="workers_stats__table">
                        <thead>
                        <tr>
                            <td className="workers_stats__table_no_td">№</td>
                            <td
                                className={"workers_stats__table_worker_td" + (this.props.sortBy == "id" ? (this.props.sortDesc ? " desc" : " asc") : "") }
                                onClick={ (e) => { this.props.actionQueue.put(new SortWorkersByAction("id")) } }
                            >Воркер<a/></td>
                            <td
                                className={"workers_stats__table_coin_td" + (this.props.sortBy == "coin" ? (this.props.sortDesc ? " desc" : " asc") : "") }
                                onClick={ (e) => { this.props.actionQueue.put(new SortWorkersByAction("coin")) } }
                            >Монета<a/></td>
                            <td
                                className={"workers_stats__table_hashrate_td" + (this.props.sortBy == "hashrate" ? (this.props.sortDesc ? " desc" : " asc") : "") }
                                onClick={ (e) => { this.props.actionQueue.put(new SortWorkersByAction("hashrate")) } }
                            >Скорость<a/></td>
                            <td
                                className={"workers_stats__table_temperature_td" + (this.props.sortBy == "temperature" ? (this.props.sortDesc ? " desc" : " asc") : "") }
                            >Средняя температура<a/></td>
                            <td
                                className={"workers_stats__table_hashrate6h_td" + (this.props.sortBy == "hashrate_6h" ? (this.props.sortDesc ? " desc" : " asc") : "") }
                                onClick={ (e) => { this.props.actionQueue.put(new SortWorkersByAction("hashrate_6h")) } }
                            >Average 6h Hashrate<a/></td>
                            <td
                                className={"workers_stats__table_uptime_td" + (this.props.sortBy == "uptime" ? (this.props.sortDesc ? " desc" : " asc") : "") }
                                onClick={ (e) => { this.props.actionQueue.put(new SortWorkersByAction("uptime")) } }
                            >Uptime<a/></td>
                            <td
                                className={"workers_stats__table_last_share_td" + (this.props.sortBy == "last_share" ? (this.props.sortDesc ? " desc" : " asc") : "") }
                                onClick={ (e) => { this.props.actionQueue.put(new SortWorkersByAction("last_share")) } }
                            >Last share<a/></td>
                        </tr>
                        </thead>
                        <tbody>
                        { this.props.currentMinerInfo.workers.filter((worker) => worker.id.indexOf(this.props.workersSearchValue) != -1).slice(0, this.props.workersLimit).map((worker, i) => [
                            <tr className={"workers_stats__tr " + worker.status }>
                                <td className="workers_stats__table_no_td">{ i + 1 } </td>
                                <td className="workers_stats__table_worker_td"><a
                                    className={"workers_stats__tr_expander" + (this.props.workersExpandStatus[worker.id] ? " expand" : "")}
                                    onClick={ (e) => { this.props.actionQueue.put(new ExpandWorkerStatsAction(worker.id)) } }
                                />{ worker.id }</td>
                                <td className="workers_stats__table_coin_td">{ worker.coin.toUpperCase() }</td>
                                <td className="workers_stats__table_hashrate_td">{ hashrateHuman(worker.hashrate) }</td>
                                <td className="workers_stats__table_temperature_td">- C</td>
                                <td className="workers_stats__table_hashrate6h_td">{ hashrateHuman(worker.hashrate_6h) }</td>
                                <td className="workers_stats__table_uptime_td">{ timeHuman(worker.uptime * 1000) }</td>
                                <td className="workers_stats__table_last_share_td">{ timeSince(worker.last_share * 1000) }</td>
                            </tr>,
                            <tr className={"workers_stats__tr_with_table" + (this.props.workersExpandStatus[worker.id] ? " expand" : "") }>
                                <td colspan="8">
                                    <table>
                                        <thead>
                                        <tr>
                                            <td>VALID HASHES</td>
                                            <td>INVALID HASHES</td>
                                            <td>FULL UPTIME</td>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        <tr>
                                            <td>{ worker.valid_hashes } (100%)</td>
                                            <td>{ worker.invalid_hashes } (0%)</td>
                                            <td>{ Math.floor(worker.uptime_percent) }%</td>
                                        </tr>
                                        <tr>
                                            <td colspan="3">&nbsp;</td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        ]) }
                        </tbody>
                    </table>
                </div>
                <div className="worker_stats__pagination">
                    <div className="workers_stats__pagination_per_page_box">
                        <span>Воркеров на странице:</span>
                        <a
                            className={"workers_stats__pagination_per_page_switch" + (this.props.workersLimit == 10 ? " active" : "") }
                            onClick={ (e) => { this.props.actionQueue.put(new ChangeWorkersLimitAction(10)) } }
                        >10</a>
                        <a
                            className={"workers_stats__pagination_per_page_switch" + (this.props.workersLimit == 20 ? " active" : "")}
                            onClick={ (e) => { this.props.actionQueue.put(new ChangeWorkersLimitAction(20)) } }
                        >20</a>
                        <a
                            className={"workers_stats__pagination_per_page_switch" + (this.props.workersLimit == 50 ? " active" : "")}
                            onClick={ (e) => { this.props.actionQueue.put(new ChangeWorkersLimitAction(50)) } }
                        >50</a>
                        <a
                            className={"workers_stats__pagination_per_page_switch" + (this.props.workersLimit == 100 ? " active" : "")}
                            onClick={ (e) => { this.props.actionQueue.put(new ChangeWorkersLimitAction(100)) } }
                        >100</a>
                    </div>
                </div>
            </div>
        );
    }
}