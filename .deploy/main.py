import os
from fabric.api import *

from jinja2 import Template

import fabfile_dev
import fabfile_prod
from stack import Stack

from utils import parse_vault, parse_stack_vars, parse_stack


def execute_task(name, *args, **kwargs):
    fabfile = None

    if env.mode == "dev":
        fabfile = fabfile_dev
    elif env.mode == "prod":
        fabfile = fabfile_prod

    getattr(fabfile, name)(*args, **kwargs)


def initialize():
    env.project_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    env.vault = parse_vault("vault.yml")
    env.update(parse_stack_vars("stack_vars.yml"))
    env.stack = Stack("stack.yml")
    env.run = lambda cmd, show=False: sudo(cmd, quiet=not show)

env.mode = "prod"
initialize()


@task
def dev():
    env.mode = "dev"
    initialize()
    env.run = lambda cmd, show=False: local(cmd, capture=not show)


@task
def prod():
    env.mode = "prod"
    initialize()
    env.run = lambda cmd, show=False: sudo(cmd, quiet=not show)


@task
def deploy(*args, **kwargs):
    execute_task("deploy", *args, **kwargs)


@task
def logs(*args, **kwargs):
    execute_task("logs", *args, **kwargs)


@task
def inspect(*args, **kwargs):
    execute_task("inspect", *args, **kwargs)


@task
def ls(*args, **kwargs):
    execute_task("ls", *args, **kwargs)


@task
def stop(*args, **kwargs):
    execute_task("stop", *args, **kwargs)


@task
def start(*args, **kwargs):
    execute_task("start", *args, **kwargs)


@task
def restart(*args, **kwargs):
    execute_task("restart", *args, **kwargs)


@task
def wipe(*args, **kwargs):
    execute_task("wipe", *args, **kwargs)
