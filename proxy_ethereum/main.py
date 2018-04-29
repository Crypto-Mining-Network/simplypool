import os
import asyncio
import json
import traceback
from os.path import expanduser

import aiohttp
import re

from utils import post_json, get_json


def get_config():
    keys = (
        ("CACHE_PATH", "/mnt", False),
        ("COIN", "eth", False),
        ("SIG_DIVISOR", "1000000000000000000", False),
        ("POOL_HOST", "", False),
        ("POOL_PORT", "", False),
        ("GETH_URL", "", False),
        ("WALLET", "", False),
        ("ENGINE_URL", "", False),
    )

    missing_keys = set([d[0] for d in filter(lambda definition: definition[2], keys)]) - set(os.environ.keys())
    if missing_keys:
        raise RuntimeError("Not all configuration variables specified: %s" % missing_keys)

    return {
        definition[0]: os.environ.get(definition[0], definition[1])
        for definition in keys
    }

config = get_config()


class StratumClient:
    def __init__(self, diff=0, wallet=None, worker="default", email=""):
        self.diff = diff
        self.wallet = wallet
        self.worker = worker
        self.email = email
        self.pending_shares = set()


async def handle_stratum_client(reader, writer):
    print("New client")
    client = StratumClient()

    pool_reader, pool_writer = await asyncio.open_connection(config["POOL_HOST"], int(config["POOL_PORT"]))

    async def handle_pool_reader():
        while True:
            obj = json.loads((await pool_reader.readline()).decode("utf8"))
            print("<- %s" % repr(obj))
            try:
                client.diff = (2 ** 256) / int(obj["result"][2], 0)
                print("Difficulty set to %s" % client.diff)
            except Exception:
                pass
            if obj["id"] in client.pending_shares:
                if obj["result"] is True:
                    async with aiohttp.ClientSession() as session:
                        async with session.post("%s/submit_share" % config["ENGINE_URL"], data={
                            "coin": config["COIN"],
                            "wallet": client.wallet,
                            "worker": client.worker,
                            "count": int(client.diff),
                            "email": client.email
                        }) as resp:
                            print("Submitted share to engine")
                client.pending_shares.remove(obj["id"])
            writer.write(json.dumps(obj).encode("utf8"))
            writer.write("\n".encode("utf8"))

    async def handle_reader():
        while True:
            obj = json.loads((await reader.readline()).decode("utf8"))
            print("-> %s" % repr(obj))
            if obj["method"] == "eth_submitLogin":
                client.wallet = obj["params"][0].split("/")[0].lower()
                if not re.match("^0x[a-fA-F0-9]{40}$", client.wallet):
                    raise ValueError("Invalid ethereum address")
                client.email = obj["params"][0].split("/")[1] if "/" in obj["params"][0] else ""
                client.worker = obj["worker"]
                obj["params"] = [config["WALLET"], "x"]
            if obj["method"] == "eth_submitWork":
                client.pending_shares.add(obj["id"])

            pool_writer.write(json.dumps(obj).encode("utf8"))
            pool_writer.write("\n".encode("utf8"))

    reader_handler = asyncio.Task(handle_reader())
    pool_reader_handler = asyncio.Task(handle_pool_reader())

    reader_handler.add_done_callback(lambda x: pool_reader_handler.cancel())
    pool_reader_handler.add_done_callback(lambda x: reader_handler.cancel())


async def block_discovery():
    try:
        cache = json.load(open("%s/.proxy_ethereum_cache" % config["CACHE_PATH"]))
    except Exception:
        cache = {
            "coinbase": None,
            "balance": 0
        }

    while True:
        print("New block discovery iteration: %s" % repr(cache))
        try:
            coinbase_result = await post_json(config["GETH_URL"], json={
                "jsonrpc": "2.0",
                "method": "eth_coinbase",
                "params": [],
                "id": 0
            })
            coinbase = coinbase_result["result"]
            balance_result = await post_json(config["GETH_URL"], json={
                "jsonrpc": "2.0",
                "method": "eth_getBalance",
                "params": [coinbase, "latest"],
                "id": 1
            })
            balance = int(balance_result["result"], 0)
        except Exception:
            print("Unhandled exception during querying geth: %s" % traceback.format_exc())
            await asyncio.sleep(60)
            continue

        if cache["coinbase"] != coinbase:
            # Coinbase changed or this is initial run -> update cache
            print("Coinbase changed")
            cache["coinbase"] = coinbase
            cache["balance"] = balance
            fd = open("%s/.proxy_ethereum_cache" % config["CACHE_PATH"], "w")
            fd.write(json.dumps(cache))
            fd.close()

        if balance > cache["balance"]:
            # New payment detected
            print("New payment detected")
            reward = balance - cache["balance"]

            try:
                await post_json("%s/submit_block" % config["ENGINE_URL"], data={
                    "coin": config["COIN"],
                    "height": 0,
                    "hash": ""
                })
                print("Submitted new block")
                blocks_to_validate = list(await get_json("%s/blocks_to_validate?coin=%s" % (config["ENGINE_URL"], config["COIN"])))
                blocks_to_validate.sort(key=lambda x: x["id"])
                await post_json("%s/validate_block" % config["ENGINE_URL"], data={
                    "block_id": blocks_to_validate[-1]["id"],
                    "is_valid": "1",
                    "reward": reward / int(config["SIG_DIVISOR"]),
                    "height": 0
                })
                print("Validated block %s" % blocks_to_validate[-1]["id"])
            except Exception:
                print("Unhandled exception during creating block: %s" % traceback.format_exc())

            cache["balance"] = balance
            fd = open("%s/.proxy_ethereum_cache" % config["CACHE_PATH"], "w")
            fd.write(json.dumps(cache))
            fd.close()

        print("End of block discovery iteration: %s" % repr(cache))
        await asyncio.sleep(60)


def main():
    loop = asyncio.get_event_loop()
    asyncio.Task(block_discovery())
    coro = asyncio.start_server(handle_stratum_client, "0.0.0.0", 80, loop=loop)
    server = loop.run_until_complete(coro)
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass
    server.close()
    loop.run_until_complete(server.wait_closed())
    loop.close()


if __name__ == "__main__":
    main()