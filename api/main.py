import os

from asyncio import get_event_loop
from datetime import datetime, timedelta

import aiohttp_cors
import logging
from aiohttp import web
from aiopg.sa import create_engine
from collections import defaultdict


def get_config():
    keys = (
        ("POSTGRES_HOST", "postgres", False),
        ("POSTGRES_PORT", "5432", False),
        ("POSTGRES_USER", "pool", False),
        ("POSTGRES_PWD", "default", False),
        ("POSTGRES_DB", "pool", False)
    )

    missing_keys = set([d[0] for d in filter(lambda definition: definition[2], keys)]) - set(os.environ.keys())
    if missing_keys:
        raise RuntimeError("Not all configuration variables specified: %s" % missing_keys)

    return {
        definition[0]: os.environ.get(definition[0], definition[1])
        for definition in keys
    }

config = get_config()
engine = None


async def setup_engine():
    global engine
    engine = await create_engine(
        user=config["POSTGRES_USER"],
        database=config["POSTGRES_DB"],
        host=config["POSTGRES_HOST"],
        port=int(config["POSTGRES_PORT"]),
        password=config["POSTGRES_PWD"]
    )


async def get_miners(request):
    now = datetime.utcnow()
    result = []
    async with engine.acquire() as conn:
        coins = [row["coin"] for row in (await (await conn.execute("SELECT DISTINCT coin FROM workers")).fetchall())]
        for coin in coins:
            rows = list(await (await conn.execute(
                "SELECT * FROM workers WHERE last_share >= %s AND coin = %s AND worker IS NULL ORDER BY uptime DESC",
                (datetime.utcnow() - timedelta(days=1), coin)
            )).fetchall())
            result.append((coin, [
                {
                    "wallet": row["wallet"],
                    "uptime": row["uptime"] if (now - row["last_share"]).total_seconds() < 60 * 15 else 0,
                    "last_share": row["last_share"].timestamp()
                }
                for row in rows
            ]))

    return web.json_response(result)


async def get_miner_info(request):
    coin = request.query["coin"]
    wallet = request.query["wallet"]

    now = datetime.utcnow()

    async with engine.acquire() as conn:
        workers_rows = list((await (await conn.execute(
            "SELECT * FROM workers WHERE coin = %s AND wallet = %s AND last_share >= %s",
            (coin, wallet, now - timedelta(days=7))
        )).fetchall()))
        workers_history_rows_5t = list((await (await conn.execute(
            "SELECT * FROM workers_history WHERE coin = %s AND wallet = %s AND granularity = '5T' AND at > %s ORDER BY at",
            (coin, wallet, now - timedelta(minutes=15))
        )).fetchall()))
        workers_history_rows_1h = list((await (await conn.execute(
            "SELECT * FROM workers_history WHERE coin = %s AND wallet = %s AND granularity = '1H' AND at > %s ORDER BY at",
            (coin, wallet, now - timedelta(hours=7))
        )).fetchall()))
        due_balance = (await conn.scalar(
            "SELECT sum(reward) FROM rewards WHERE coin = %s AND wallet = %s",
            (coin, wallet)
        )) or 0


    workers_hashes = defaultdict(list)
    for worker in workers_history_rows_5t:
        workers_hashes[worker["worker"]].append((worker["valid_hashes"], worker["at"]))
    workers_hashrate = {
        key: sum([x[0] for x in value]) / (now - value[0][1]).total_seconds()
        for key, value in workers_hashes.items()
    }
    workers_hashes = defaultdict(list)
    for worker in workers_history_rows_1h:
        workers_hashes[worker["worker"]].append((worker["valid_hashes"], worker["at"]))
    workers_hashrate_6h = {
        key: sum([x[0] for x in value]) / (now - value[0][1]).total_seconds()
        for key, value in workers_hashes.items()
    }

    workers = []
    for worker in workers_rows:
        if worker["worker"] is None:
            continue
        status = "online"
        if (now - worker["last_share"]).total_seconds() > 60 and (now - worker["last_share"]).total_seconds() < 60 * 15:
            status = "unknown"
        if (now - worker["last_share"]).total_seconds() >= 60 * 15:
            status = "offline"
        downtime = worker["downtime"] \
            if (now - worker["last_share"]).total_seconds() < 60 * 15 \
            else worker["downtime"] + (now - worker["last_share"]).total_seconds()
        uptime = worker["uptime"] \
            if (now - worker["last_share"]).total_seconds() < 60 * 15 \
            else 0

        worker_info = {
            "id": worker["worker"],
            "coin": worker["coin"],
            "status": status,
            "hashrate": workers_hashrate.get(worker["worker"], 0),
            "hashrate_6h": workers_hashrate_6h.get(worker["worker"], 0),
            "uptime": uptime,
            "uptime_percent": (
                ((now - worker["first_share"]).total_seconds() - downtime) /
                (now - worker["first_share"]).total_seconds()
            ) * 100,
            "last_share": worker["last_share"].timestamp(),
            "valid_hashes": worker["valid_hashes"],
            "invalid_hashes": worker["invalid_hashes"]
        }
        workers.append(worker_info)

    return web.json_response({
        "wallets": [{
            "coin": coin,
            "wallet": wallet,
            "hashrate": workers_hashrate.get(None, 0),
            "hashrate_6h": workers_hashrate_6h.get(None, 0),
            "due_balance": due_balance,
            "total_balance": due_balance
        }],
        "workers": workers
    })


def setup_routes(app):
    app.router.add_get("/get_miners", get_miners)
    app.router.add_get("/get_miner_info", get_miner_info)

    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
        )
    })
    for route in list(app.router.routes()):
        cors.add(route)

def main():
    get_event_loop().run_until_complete(setup_engine())
    app = web.Application()
    setup_routes(app)
    web.run_app(app, host="0.0.0.0", port=80)


if __name__ == "__main__":
    main()