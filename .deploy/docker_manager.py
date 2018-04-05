import json

from fabric.context_managers import hide, shell_env
from fabric.state import env


def _parse_docker_list(data, fields=None, key=None):
    result = [
        line.strip() if not fields
        else {
            field: value
            for field, value in zip(fields, line.strip().split(","))
        }
        for line in data.split("\n")
        if line.strip()
    ]

    if key:
        result = {
            x[key]: x
            for x in result
        }

    return result


def get_networks():
    with hide("running"):
        return _parse_docker_list(
            env.run("docker network ls --format \"{{.Name}}\" --filter Label=\"STACK_ID=%s\"" % env.stack_id).stdout
        )


def add_network(name, subnet=None, gateway=None, driver=None):
    cmd = "docker network create %s --label \"STACK_ID=%s\" " % (name, env.stack_id)
    if driver:
        cmd += "--driver %s " % driver
    if subnet:
        cmd += "--subnet %s " % subnet
    if gateway:
        cmd += "--gateway %s " % gateway

    env.run(cmd, show=True)


def remove_network(name):
    env.run("docker network rm %s" % name, show=True)


def get_volumes():
    with hide("running"):
        return _parse_docker_list(
            env.run("docker volume ls --format \"{{.Name}}\" --filter Label=\"STACK_ID=%s\"" % env.stack_id).stdout
        )


def add_volume(name):
    env.run("docker volume create %s --label \"STACK_ID=%s\"" % (name, env.stack_id), show=True)


def remove_volume(name):
    env.run("docker volume rm %s" % name, show=True)


def get_images(get_all=False):
    with hide("running"):
        return {
            image: x
            for image, x in _parse_docker_list(
                env.run("docker images --format \"{{ .Repository }},{{ .ID }},{{ .Digest }}\" %s" % (
                    ("--filter Label=\"STACK_ID=%s\"" % env.stack_id) if not get_all else ""
                )).stdout,
                fields=("Name", "Id", "Digest"),
                key="Name"
            ).items()
            if image != "<none>"
        }


def pull_image(name):
    env.run("docker pull %s" % name, show=True)


def build_image(path, name, docker_file="Dockerfile"):
    env.run("docker build --label \"STACK_ID=%s\" -t %s -f %s/%s %s" % (env.stack_id, name, path, docker_file, path), show=True)


def remove_image(name):
    env.run("docker rmi %s" % name, show=True)


def get_containers():
    with hide("running"):
        container_list = _parse_docker_list(
            env.run("docker ps -a --format \"{{ .Names }}\" --filter Label=\"STACK_ID=%s\"" % env.stack_id).stdout
        )

        return {
            container: json.loads(env.run("docker inspect %s" % container).stdout)[0]
            for container in container_list
        }


def add_container(image, name, privileged=False, network=None, expose=None, restart="always", volumes=None,
                  envs=None, nonce=None):
    envs = {str(k):str(v).replace("\"", "\\\"") for k, v in (envs or {}).items()}

    env_string = ""
    for env_name, env_value in (envs or {}).items():
        env_string += "-e %s " % env_name
    volume_string = ""
    for volume_in_container, volume_on_instance in (volumes or {}).items():
        volume_string += "--volume \"%s:%s\" " % (volume_on_instance, volume_in_container)
    expose_string = ""
    for port_in_container, port_on_instance in (expose or {}).items():
        expose_string += "-p %s:%s " % (port_on_instance, port_in_container)

    cmd = "docker run -d --label \"STACK_ID=%s\" --log-driver=journald " % env.stack_id
    if nonce:
        cmd += "--label \"NONCE=%s\" " % nonce
    cmd += "--name %s " % name
    if network:
        cmd += "--network %s " % network
    if restart:
        cmd += "--restart %s " % restart
    if privileged:
        cmd += "--privileged "
    cmd += volume_string
    cmd += env_string
    cmd += expose_string
    cmd += image

    with shell_env(**(envs or {})):
        env.run(cmd, show=True)


def remove_container(name):
    stop_container(name)
    env.run("docker rm %s" % name, show=True)


def stop_container(name):
    env.run("docker stop %s" % name, show=True)


def start_container(name):
    env.run("docker start %s" % name, show=True)


def restart_container(name):
    stop_container(name)
    start_container(name)


def logs(name, tail=None):
    env.run("docker logs --tail %d -t %s -f" % (int(tail) if tail else 100, name), show=True)


def inspect(name):
    env.run("docker inspect %s" % name, show=True)


def wipe():
    for container in get_containers():
        remove_container(container)
    for image in get_images():
        remove_image(image)
    for volume in get_volumes():
        remove_volume(volume)
    for network in get_networks():
        remove_network(network)
