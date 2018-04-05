import hashlib
import json
import time

import yaml
from io import StringIO
from fabric.state import env
from socket import create_connection

from jinja2 import FileSystemLoader, Environment


def wait_for_port(port=22):
    address = env.host_string

    while True:
        try:
            create_connection((address, port), 5)
            return
        except Exception as e:
            print("Still waiting for %s:%s" % (address, port))
        time.sleep(5)


def wait_for_cloud_init():
    while not env.run("ls /var/lib/cloud/instance/ | grep boot-finished").stdout.strip():
        print("Still waiting for cloud-init")
        time.sleep(5)


def get_nonce(struct):
    cipher = hashlib.md5()

    if isinstance(struct, dict):
        struct = list(struct.items())

    if isinstance(struct, list):
        for x in sorted(struct):
            cipher.update(get_nonce(x).encode("utf8"))
    elif isinstance(struct, tuple):
        for x in struct:
            cipher.update(get_nonce(x).encode("utf8"))
    else:
        cipher.update(repr(struct).encode("utf8"))

    return cipher.hexdigest()


def parse_vault(filename):
    with open(filename) as fd:
        return yaml.load(fd)


def parse_stack_vars(filename):
    with open(filename) as fd:
        return yaml.load(fd)


def parse_stack(filename):
    loader = FileSystemLoader('.')
    j2_env = Environment(loader=loader)

    def jsonify(x):
        return json.dumps(x).replace("\n", " ")

    j2_env.filters["jsonify"] = jsonify
    stack_j2_template = j2_env.get_template(filename)
    buf = StringIO(stack_j2_template.render(**env))
    stack = yaml.load(buf)

    return stack