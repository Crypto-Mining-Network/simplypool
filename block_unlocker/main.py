import os
import traceback
from time import sleep

import sqlalchemy as sa


def get_config():
    keys = (
        ("INTERVAL", "60", False),
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

def main():
    pg = sa.create_engine(
        "postgresql+psycopg2://%s:%s@%s:%s/%s" % (
            config["POSTGRES_USER"],
            config["POSTGRES_PWD"],
            config["POSTGRES_HOST"],
            config["POSTGRES_PORT"],
            config["POSTGRES_DB"]
        )
    )

    while True:
        print("Iteration started")
        for block in pg.execute("SELECT * FROM blocks WHERE is_valid is TRUE AND is_unlocked is FALSE ORDER BY id"):
            print("Block to unlock: %s" % (block["id"],))
            pg.execute("DELETE FROM rewards WHERE block_id = %s", (block["id"],))
            total_shares = float(list(pg.execute("SELECT SUM(shares) FROM round_shares WHERE block_id = %s", (block["id"],)))[0][0])
            for round_share in pg.execute("SELECT * FROM round_shares WHERE block_id = %s", (block["id"],)):
                pg.execute(
                    "INSERT INTO rewards (coin, block_id, wallet, reward) VALUES (%s, %s, %s, %s)",
                    (block["coin"], block["id"], round_share["wallet"], (float(round_share["shares"]) / total_shares) * block["reward"])
                )
            pg.execute("UPDATE blocks SET is_unlocked = TRUE WHERE id = %s", (block["id"],))
            print("Successfully unlocked block %s" % (block["id"],))
        print("Iteration ended")
        sleep(int(config["INTERVAL"]))


if __name__ == "__main__":
    while True:
        try:
            main()
        except Exception:
            print("Unhandled exception: %s" % traceback.format_exc())
        sleep(1)