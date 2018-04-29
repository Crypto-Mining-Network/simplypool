import os
import traceback
from time import sleep

import sqlalchemy as sa
import telegram
from telegram.error import NetworkError, Unauthorized


welcome_message = """Меня можно использовать для получения нотификаций о работе воркеров SimplyPool.
Список команд:
  /s <email> - подписка на уведомления о работе воркеров аккаунта <email>
  /u - отписка от всех уведомлений
Так же вы можете добавить меня в группу и использовать те же команды для уведомлений в группах.
"""


def get_config():
    keys = (
        ("TELEGRAM_TOKEN", "", False),
        ("POSTGRES_HOST", "postgres", False),
        ("POSTGRES_PORT", "5432", False),
        ("POSTGRES_USER", "pool", False),
        ("POSTGRES_PWD", "default", False),
        ("POSTGRES_DB", "pool", False),
    )

    missing_keys = set([d[0] for d in filter(lambda definition: definition[2], keys)]) - set(os.environ.keys())
    if missing_keys:
        raise RuntimeError("Not all configuration variables specified: %s" % missing_keys)

    return {
        definition[0]: os.environ.get(definition[0], definition[1])
        for definition in keys
    }

config = get_config()


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
    global update_id
    # Telegram Bot Authorization Token
    bot = telegram.Bot(config["TELEGRAM_TOKEN"])

    try:
        update_id = bot.get_updates()[0].update_id
    except IndexError:
        update_id = None

    while True:
        try:
            for update in bot.get_updates(offset=update_id, timeout=10):
                update_id = update.update_id + 1

                if update.message and update.message.text and update.message.text.startswith("/s "):
                    bits = update.message.text.strip().split(" ")
                    if len(bits) != 2:
                        update.message.reply_text("Неправильный формат (/s <email>)")
                    else:
                        if not list(pg.execute("SELECT count(*) FROM users WHERE email = %s AND is_activated IS TRUE", (bits[1],)))[0][0]:
                            update.message.reply_text("Такого e-mail нет в базе")
                        else:
                            update.message.reply_text("Вы подписаны на уведомления %s" % (bits[1],))
                            pg.execute("INSERT INTO telegram_subscriptions (email, chat_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (bits[1], int(update.message.chat_id)))
                elif update.message and update.message.text and update.message.text == "/u":
                    pg.execute("DELETE FROM telegram_subscriptions WHERE chat_id = %s", (int(update.message.chat_id),))
                    update.message.reply_text("Вы отписаны от уведомлений")
                elif update.message and update.message.text and update.message.text.startswith("/"):
                    update.message.reply_text(welcome_message)
                if update.message and update.message.text:
                    print(update.message.text)
        except NetworkError:
            sleep(1)
        except Unauthorized:
            # The user has removed or blocked the bot.
            update_id += 1
        except Exception:
            print("Unhandled exception: %s" % traceback.format_exc())
            sleep(1)
            update_id += 1



if __name__ == "__main__":
    main()