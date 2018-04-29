import os
import hashlib
import random
import smtplib
import string

from asyncio import get_event_loop
from datetime import datetime, timedelta
from email.message import EmailMessage

import aiohttp_cors
import logging

import re
from aiohttp import web
from aiopg.sa import create_engine
from collections import defaultdict


def get_config():
    keys = (
        ("SMTP_HOST", "", False),
        ("SMTP_PORT", 587, False),
        ("SMTP_USER", "mail", False),
        ("SMTP_PASSWORD", "", False),
        ("SMTP_FROM", "", False),
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


def _generate_random_string(length):
    return ''.join([random.choice(string.ascii_letters + string.digits) for n in range(length)])


async def setup_engine():
    global engine
    engine = await create_engine(
        user=config["POSTGRES_USER"],
        database=config["POSTGRES_DB"],
        host=config["POSTGRES_HOST"],
        port=int(config["POSTGRES_PORT"]),
        password=config["POSTGRES_PWD"]
    )


async def get_pool_info(request):
    now = datetime.utcnow()

    async with engine.acquire() as conn:
        coins = [row["coin"] for row in list(await (await conn.execute(
            "SELECT DISTINCT coin FROM blocks",
            ()
        )).fetchall())]
        online_workers = await conn.scalar(
            "SELECT COUNT(*) FROM workers WHERE worker IS NOT NULL AND last_share > %s",
            (now - timedelta(minutes=15),)
        )
        total_workers = await conn.scalar(
            "SELECT COUNT(*) FROM workers WHERE worker IS NOT NULL",
            ()
        )
        offline_workers = total_workers - online_workers
        workers_history_rows_5t = list((await (await conn.execute(
            "SELECT * FROM workers_history WHERE wallet IS NULL AND granularity = '5T' AND at > %s ORDER BY at",
            (now - timedelta(minutes=15),)
        )).fetchall()))
        coins_hashes = defaultdict(list)
        for worker in workers_history_rows_5t:
            coins_hashes[worker["coin"]].append((worker["valid_hashes"], worker["at"]))
        coins_hashrate = {
            key: sum([x[0] for x in value]) / (now - value[0][1]).total_seconds()
            for key, value in coins_hashes.items()
        }

        rows = list(await (await conn.execute(
            "SELECT coin, max(mined_at) FROM blocks GROUP BY coin",
            ()
        )).fetchall())
        coins_last_block = {
            row["coin"]: row["max"]
            for row in rows
        }

    return web.json_response({
        "online_workers": online_workers,
        "offline_workers": offline_workers,
        "coins": [
            {
                "name": coin,
                "hashrate": coins_hashrate.get(coin, 0),
                "last_block_at": coins_last_block[coin].timestamp() if coins_last_block.get(coin) else None
            }
            for coin in coins
        ]
    })


async def get_miners(request):
    now = datetime.utcnow()
    result = []
    async with engine.acquire() as conn:
        coins = [row["coin"] for row in (await (await conn.execute("SELECT DISTINCT coin FROM workers")).fetchall())]
        for coin in coins:
            rows = list(await (await conn.execute(
                "SELECT * FROM workers WHERE last_share >= %s AND coin = %s AND worker IS NULL ORDER BY valid_hashes DESC",
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


async def check_authenticated(request):
    try:
        email = request.query["email"].strip().lower()
        password = request.query["password"]
    except KeyError:
        try:
            args = await request.post()
            email = args["email"]
            password = args["password"]
        except Exception:
            return False

    password_hash = hashlib.md5(password.encode("utf8")).hexdigest()

    async with engine.acquire() as conn:
        if (await conn.scalar(
            "SELECT count(*) FROM users WHERE email = %s AND is_activated IS TRUE AND password_hash = %s",
            (email, password_hash)
        )) == 0:
            return False

    return True


async def get_miner_info(request):
    try:
        coin = request.query["coin"]
        wallet = request.query["wallet"]
        request_wallets = [(coin, wallet),]
    except KeyError:
        if not (await check_authenticated(request)):
            return web.json_response({
                "error": "not_authenticated"
            })

        email = request.query["email"]
        async with engine.acquire() as conn:
            request_wallets = [(x["coin"], x["wallet"]) for x in list((await (await conn.execute(
                "SELECT DISTINCT coin, wallet FROM workers WHERE email = %s ORDER BY coin, wallet",
                (email,)
            )).fetchall()))]

    now = datetime.utcnow()

    workers = []
    wallets = []
    for coin, wallet in request_wallets:
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

        for worker in workers_rows:
            if worker["worker"] is None:
                continue
            status = "online"
            if (now - worker["last_share"]).total_seconds() > 60 * 3 and (now - worker["last_share"]).total_seconds() < 60 * 15:
                status = "unknown"
            if (now - worker["last_share"]).total_seconds() >= 60 * 15:
                status = "offline"
            downtime = worker["downtime"] \
                if (now - worker["last_share"]).total_seconds() < 60 * 15 \
                else worker["downtime"] + (now - worker["last_share"]).total_seconds()
            uptime = worker["uptime"] \
                if (now - worker["last_share"]).total_seconds() < 60 * 15 \
                else 0

            workers.append({
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
            })
        wallets.append({
            "coin": coin,
            "wallet": wallet,
            "hashrate": workers_hashrate.get(None, 0),
            "hashrate_6h": workers_hashrate_6h.get(None, 0),
            "due_balance": due_balance,
            "total_balance": due_balance
        })

    return web.json_response({
        "error": None,
        "wallets": wallets,
        "workers": workers
    })


async def register(request):
    args = await request.post()
    email = args["email"].strip().lower()
    password = args["password"]

    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        return web.json_response({
            "error": "invalid_email"
        })

    activation_code = _generate_random_string(64)
    async with engine.acquire() as conn:
        if (await conn.scalar("SELECT count(*) FROM users WHERE email = %s AND is_activated IS TRUE", (email,))) != 0:
            return web.json_response({
                "error": "exists"
            })

        await conn.execute("DELETE FROM users WHERE email = %s", (email,))
        await conn.execute(
            "INSERT INTO users(email, password_hash, activate_code, is_activated) VALUES (%s, %s, %s, FALSE)",
            (email, hashlib.md5(password.encode("utf8")).hexdigest(), activation_code)
        )

    msg = EmailMessage()
    msg.set_content("Your activation link is: http://simplypool.net/#/activate/%s/%s" % (email, activation_code))
    msg["Subject"] = "Activate your account at simplypool.net"
    msg["From"] = config["SMTP_FROM"]
    msg["To"] = email
    s = smtplib.SMTP(host=config["SMTP_HOST"], port=config["SMTP_PORT"])
    s.connect(config["SMTP_HOST"], config["SMTP_PORT"])
    s.ehlo()
    # s.starttls()
    # s.ehlo()
    s.login(config["SMTP_USER"], config["SMTP_PASSWORD"])
    s.send_message(msg)
    s.quit()

    return web.json_response({
        "error": None
    })


async def activate(request):
    args = await request.post()
    email = args["email"]
    code = args["code"]

    async with engine.acquire() as conn:
        if (await conn.scalar(
            "SELECT count(*) FROM users WHERE email = %s AND is_activated IS FALSE AND activate_code = %s",
            (email, code)
        )) == 0:
            return web.json_response({
                "error": "not_exists"
            })

        await conn.execute("UPDATE users SET is_activated = TRUE WHERE email = %s", (email,))

    return web.json_response({
        "error": None
    })


async def check_login(request):
    result = await check_authenticated(request)
    if not result:
        return web.json_response({
            "result": False
        })

    email = request.query["email"]
    async with engine.acquire() as conn:
        additional_emails = await conn.scalar("SELECT additional_emails FROM users WHERE email = %s LIMIT 1", (email,))

    return web.json_response({
        "result": True,
        "miner_settings": {
            "additional_emails": additional_emails
        }
    })


async def set_miner_settings(request):
    if not (await check_authenticated(request)):
        return web.json_response({
            "error": "not_authenticated"
        })

    args = await request.post()
    email = args["email"]
    additional_emails = [x.strip() for x in args["additional_emails"].split(",")] if args["additional_emails"].strip() else []

    for additional_email in additional_emails:
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", additional_email):
            return web.json_response({
                "error": "invalid_email"
            })

    async with engine.acquire() as conn:
        await conn.execute("UPDATE users SET additional_emails = %s WHERE email = %s", (",".join(additional_emails) if additional_emails else None, email))

    return web.json_response({
        "result": "success"
    })


async def get_round(request):
    result = {}
    async with engine.acquire() as conn:
        for block in list((await (await conn.execute("SELECT * FROM blocks WHERE mined_at IS NULL")).fetchall())):
            round_shares = await conn.scalar("SELECT sum(shares) FROM round_shares WHERE block_id = %s", (block["id"],))
            difficulty = await conn.scalar("SELECT difficulty FROM nodes WHERE coin = %s", (block["coin"],))
            result[block["coin"]] = float((round_shares / difficulty) * 100)

    return web.json_response({
        "result": result
    })


def setup_routes(app):
    app.router.add_get("/get_pool_info", get_pool_info)
    app.router.add_get("/get_miners", get_miners)
    app.router.add_get("/get_miner_info", get_miner_info)
    app.router.add_post("/register", register)
    app.router.add_post("/activate", activate)
    app.router.add_get("/check_login", check_login)
    app.router.add_post("/set_miner_settings", set_miner_settings)
    app.router.add_get("/get_round", get_round)

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