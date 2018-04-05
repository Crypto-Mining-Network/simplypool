from fabric.state import env
from jinja2 import Template

import docker_manager
from utils import get_nonce


def deploy(container_to_deploy=None):
    active_containers = []

    for domain, x in env.stack.items():
        if domain not in docker_manager.get_networks():
            docker_manager.add_network(domain)

        for instance, x in x.items():
            for volume in x.get("volumes", []):
                if volume not in docker_manager.get_volumes():
                    docker_manager.add_volume(volume)

            for container, x in x["containers"].items():
                if container_to_deploy and container != container_to_deploy:
                    continue
                volumes = x.get("volumes", {})
                image_name = None
                if "build" in x:
                    image_name = container
                    docker_manager.build_image(x["build"], container, docker_file=x.get("docker_file", "Dockerfile"))
                elif "run" in x:
                    image_name = x["run"]
                    docker_manager.pull_image(x["run"])
                image = docker_manager.get_images(get_all=True)[image_name]
                add_container_parms = {
                    "image": image_name,
                    "name": container,
                    "privileged": x.get("privileged", False),
                    "network": domain,
                    "volumes": volumes,
                    "expose": x.get("expose", {}),
                    "envs": x.get("env"),
                }
                nonce = get_nonce(add_container_parms)

                if (container in docker_manager.get_containers() and (
                                docker_manager.get_containers()[container]["Config"]["Labels"].get("NONCE") != nonce or
                            not docker_manager.get_containers()[container]["Image"].startswith(
                                    "sha256:%s" % image["Id"])
                )
                    ):
                    docker_manager.remove_container(container)

                if container not in docker_manager.get_containers():
                    add_container_parms["nonce"] = nonce
                    docker_manager.add_container(**add_container_parms)
                active_containers.append(container)

    if not container_to_deploy:
        for container in docker_manager.get_containers():
            if container not in active_containers:
                print("Unneeded container found: %s " % container)
                docker_manager.remove_container(container)

    openvpn_j2_template = Template(open(".deploy/gateway.ovpn.j2").read())
    rendered_data = openvpn_j2_template.render(mode=env.mode, instances=["127.0.0.1"])
    if rendered_data:
        open("ovpn_dev.ovpn", "w").write(rendered_data)


def logs(service, tail=100):
    docker_manager.logs(service, tail=tail)


def inspect(service):
    docker_manager.inspect(service)


def ls():
    print("Containers:")
    for container, x in docker_manager.get_containers().items():
        print("\t%s\t%s" % (container, "+" if x["State"]["Running"] else "-"))
    print("")
    print("Volumes:")
    for volume in docker_manager.get_volumes():
        print("\t%s" % volume)


def stop(service):
    docker_manager.stop_container(service)


def start(service):
    docker_manager.start_container(service)


def restart(service):
    docker_manager.restart_container(service)


def wipe(subject=None):
    if subject is None:
        docker_manager.wipe()
    elif len(subject.split(".")) == 2:
        for container in docker_manager.get_containers():
            if container.endswith(subject):
                docker_manager.remove_container(container)
    elif len(subject.split(".")) == 3:
        docker_manager.remove_container(subject)
