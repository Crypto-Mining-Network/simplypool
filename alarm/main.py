import os
import smtplib
import traceback
from datetime import datetime, timedelta
from email.message import EmailMessage
from time import sleep

import requests
import sqlalchemy as sa


def get_config():
    keys = (
        ("TELEGRAM_TOKEN", "", False),
        ("SMTP_HOST", "", False),
        ("SMTP_PORT", 587, False),
        ("SMTP_USER", "mail", False),
        ("SMTP_PASSWORD", "", False),
        ("SMTP_FROM", "", False),
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


def get_contacts(pg, coin, wallet):
    email = list(pg.execute("SELECT email FROM workers WHERE wallet = %s AND coin = %s AND worker IS NULL", (wallet, coin)))[0][0]
    telegram_chat_ids = []
    emails = []
    if email:
        additional_emails = list(pg.execute("SELECT additional_emails FROM users WHERE email = %s", (email,)))[0][0]
        emails = [email] + (additional_emails.split(",") if additional_emails else [])
        telegram_chat_ids = [x["chat_id"] for x in pg.execute("SELECT * FROM telegram_subscriptions WHERE email = %s", (email,))]

    return emails, telegram_chat_ids


def send_email(to, subject, body):
    msg = EmailMessage()
    msg.set_content(body)
    msg["Subject"] = subject
    msg["From"] = config["SMTP_FROM"]
    msg["To"] = to
    s = smtplib.SMTP(host=config["SMTP_HOST"], port=config["SMTP_PORT"])
    s.connect(config["SMTP_HOST"], config["SMTP_PORT"])
    s.ehlo()
    s.login(config["SMTP_USER"], config["SMTP_PASSWORD"])
    s.send_message(msg)
    s.quit()


def send_telegram(chat_id, text):
    requests.post("https://api.telegram.org/bot%s/sendMessage" % config["TELEGRAM_TOKEN"], data={"chat_id": chat_id, "text": text})


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
        now = datetime.utcnow()
        unnotified_down = pg.execute(
            "SELECT * FROM workers WHERE (notified_down_at IS NULL OR notified_down_at < last_share) AND last_share < %s AND worker IS NOT NULL",
            (now - timedelta(minutes=15))
        )
        unnotified_up = pg.execute(
            "SELECT * FROM workers WHERE (notified_up_at IS NULL OR notified_up_at < first_session_share_at) AND last_share > %s AND worker IS NOT NULL",
            (now - timedelta(minutes=15))
        )

        for row in unnotified_down:
            emails, telegram_chat_ids = get_contacts(pg, row["coin"], row["wallet"])

            for email in emails:
                try:
                    send_email(email, "Alert: worker is down", "Your worker %s/%s is down" % (row["coin"], row["worker"]))
                    print("Sent notification to %s (down)" % email)
                except Exception:
                    print("Unhandled exception during sending email: %s" % traceback.format_exc())
            for telegram_chat_id in telegram_chat_ids:
                try:
                    send_telegram(telegram_chat_id, "Your worker %s/%s is down" % (row["coin"], row["worker"]))
                    print("Sent notification to %s (up)" % telegram_chat_id)
                except Exception:
                    print("Unhandled exception during sending telegram: %s" % traceback.format_exc())
            pg.execute("UPDATE workers SET notified_down_at = %s WHERE id = %s", (now, row["id"]))
        for row in unnotified_up:
            emails, telegram_chat_ids = get_contacts(pg, row["coin"], row["wallet"])
            for email in emails:
                try:
                    send_email(email, "Alert: worker is up", "Your worker %s/%s is up" % (row["coin"], row["worker"]))
                    print("Sent notification to %s (up)" % email)
                except Exception:
                    print("Unhandled exception during sending email: %s" % traceback.format_exc())
            for telegram_chat_id in telegram_chat_ids:
                try:
                    send_telegram(telegram_chat_id, "Your worker %s/%s is up" % (row["coin"], row["worker"]))
                    print("Sent notification to %s (up)" % telegram_chat_id)
                except Exception:
                    print("Unhandled exception during sending telegram: %s" % traceback.format_exc())
            pg.execute("UPDATE workers SET notified_up_at = %s WHERE id = %s", (now, row["id"]))

        print("Iteration ended")
        sleep(int(config["INTERVAL"]))


if __name__ == "__main__":
    while True:
        try:
            main()
        except Exception:
            print("Unhandled exception: %s" % traceback.format_exc())
        sleep(1)