import os

from asyncio import get_event_loop
from datetime import datetime

from aiohttp import web
from aiopg.sa import create_engine


def get_config():
    keys = (
        ("PRIVATE_API_PORT", "80", False),
        ("PUBLIC_API_PORT", "8080", False),
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
block_by_coin = {}


async def setup_engine():
    global engine
    engine = await create_engine(
        user=config["POSTGRES_USER"],
        database=config["POSTGRES_DB"],
        host=config["POSTGRES_HOST"],
        port=int(config["POSTGRES_PORT"]),
        password=config["POSTGRES_PWD"]
    )


async def get_current_block(coin):
    async with engine.acquire() as conn:
        await conn.execute(
            """INSERT INTO blocks (coin, is_unlocked) 
               SELECT %s, false 
               WHERE NOT EXISTS (SELECT 1 FROM blocks WHERE coin = %s AND mined_at IS NULL)
            """, (coin, coin))

        return await conn.scalar("SELECT id FROM blocks WHERE coin = %s AND mined_at IS NULL", (coin,))


async def blocks_to_validate(request):
    coin = request.query["coin"]

    async with engine.acquire() as conn:
        rows = list((await (await conn.execute("SELECT * FROM blocks WHERE mined_at IS NOT NULL AND coin = %s AND is_valid IS NULL", (coin,))).fetchall()))

    return web.json_response([
        {
            "id": row["id"],
            "height": row["height"],
            "hash": row["hash"]
        }
        for row in rows
    ])


async def submit_share(request):
    args = await request.post()
    coin = args["coin"]
    count = args["count"]
    wallet = args["wallet"]

    if coin not in block_by_coin:
        block_by_coin[coin] = await get_current_block(coin)
    block_id = block_by_coin[coin]

    async with engine.acquire() as conn:
        await conn.execute(
            "UPDATE round_shares SET shares = shares + %s WHERE block_id = %s AND wallet = %s",
            (count, block_id, wallet)
        )
        await conn.execute(
            """INSERT INTO round_shares (block_id, wallet, shares) 
               SELECT %s, %s, %s 
               WHERE NOT EXISTS (SELECT 1 FROM round_shares WHERE block_id = %s AND wallet = %s)
            """,
            (block_id, wallet, count, block_id, wallet)
        )

    return web.json_response({})


async def submit_block(request):
    args = await request.post()
    coin = args["coin"]
    height = int(args["height"])
    hash = args["hash"]

    async with engine.acquire() as conn:
        mined_at = datetime.utcnow()
        await conn.execute("UPDATE blocks SET mined_at = %s, height = %s, hash = %s WHERE coin = %s AND mined_at IS NULL", (mined_at, height, hash, coin))
    del block_by_coin[coin]

    return web.json_response({})


async def validate_block(request):
    args = await request.post()
    block_id = int(args["block_id"])
    is_valid = args["is_valid"] == "1"
    reward = float(args["reward"])

    async with engine.acquire() as conn:
        await conn.execute("UPDATE blocks SET is_valid = %s, reward = %s WHERE id = %s", (is_valid, reward, block_id))

    return web.json_response({})


def setup_routes(app):
    app.router.add_get("/blocks_to_validate", blocks_to_validate)
    app.router.add_post("/submit_block", submit_block)
    app.router.add_post("/submit_share", submit_share)
    app.router.add_post("/validate_block", validate_block)


def main():
    get_event_loop().run_until_complete(setup_engine())
    private_api = web.Application()
    setup_routes(private_api)
    web.run_app(private_api, host="0.0.0.0", port=int(config["PRIVATE_API_PORT"]))


if __name__ == "__main__":
    main()