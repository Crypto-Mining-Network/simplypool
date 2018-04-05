import os

import docker_manager
from fabric.context_managers import cd
from fabric.contrib.project import rsync_project
from fabric.decorators import parallel, serial, task
from fabric.operations import sudo
from fabric.state import env
from fabric.tasks import execute
from stack import Stack
from utils import wait_for_port, wait_for_cloud_init, get_nonce, parse_vault, parse_stack_vars


def sync_addrs():
    env.do_hosts = {
        x["public_ip"]: instance
        for domain, x in env.stack.items()
        for instance, x in x.items()
    }


@task
def deploy(container_to_deploy=None):
    sync_addrs()
    execute(bootstrap, hosts=env.do_hosts.keys())
    execute(deploy_prod_services, hosts=env.do_hosts.keys(), container_to_deploy=container_to_deploy)


@parallel
def bootstrap():
    wait_for_port(22)
    wait_for_cloud_init()
    this_instance = env.do_hosts[env.host_string]

    env.run("apt-get install -y curl software-properties-common")

    if "command not found" in env.run("docker --version"):
        print("Setting up docker")
        env.run("curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -", show=True)
        env.run("apt-key fingerprint 0EBFCD88", show=True)
        env.run("add-apt-repository \"deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable\"", show=True)
        env.run("apt-get update -y", show=True)
        env.run("apt-get install -y docker-ce", show=True)
        env.run("systemctl enable docker")
        env.run("systemctl restart docker")

    if not env.run("ls / | grep swapfile").stdout.strip():
        print("Setting up swap")
        env.run("dd if=/dev/zero of=/swapfile bs=1M count=4096", show=True)
        env.run("chmod 0600 /swapfile", show=True)
        env.run("mkswap /swapfile", show=True)
        env.run("swapon /swapfile", show=True)

    if not env.run("cat /etc/fstab | grep swapfile").stdout.strip():
        print("Adding swap to fstab")
        env.run("echo '/swapfile   none    swap    sw    0   0' >> /etc/fstab", show=True)


@serial
def deploy_prod_services(container_to_deploy=None):
    wait_for_port(22)
    wait_for_cloud_init()
    this_instance = env.do_hosts[env.host_string]

    sudo("mkdir -p /home/ubuntu/serv_files")
    rsync_project(
        local_dir=".",
        exclude=[".git"],
        remote_dir="/home/ubuntu/serv_files",
        delete=True,
        extra_opts="--rsync-path=\"sudo rsync\"",
        ssh_opts='-oStrictHostKeyChecking=no'
    )

    with cd("/home/ubuntu/serv_files"):
        active_networks = []
        active_volumes = []
        active_containers = []

        for domain, x in env.stack.items():
            if domain not in docker_manager.get_networks():
                docker_manager.add_network(domain, subnet="11.0.0.0/16", gateway="11.0.0.1")
            active_networks.append(domain)

            for instance, x in x.items():
                if instance != this_instance:
                    continue

                for volume in x.get("volumes", []):
                    if volume not in docker_manager.get_volumes():
                        docker_manager.add_volume(volume)
                    active_volumes.append(volume)

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
                            not docker_manager.get_containers()[container]["Image"].startswith("sha256:%s" % image["Id"])
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
            for volume in docker_manager.get_volumes():
                if volume not in active_volumes:
                    print("Unneeded volume detected: %s, you need to remove it manually" % volume)

            for network in docker_manager.get_networks():
                if network not in active_networks:
                    print("Unneeded network found: %s " % network)
                    docker_manager.remove_network(network)


def get_public_ip_by_instance(instance_to_find):
    for domain, x in env.stack.items():
        for instance, x in x.items():
            if instance == instance_to_find:
                return x["public_ip"]

    raise ValueError("Can't find instance: %s" % instance_to_find)


def logs(service, tail=100):
    _, instance = service.split(".", 1)
    env.host_string = get_public_ip_by_instance(instance)
    docker_manager.logs(service, tail=tail)


def inspect(service):
    _, instance = service.split(".", 1)
    env.host_string = get_public_ip_by_instance(instance)
    docker_manager.inspect(service)


def ls():
    containers = {}
    volumes = []
    for domain, x in env.stack.items():
        for instance, x in x.items():
            env.host_string = x["public_ip"]
            volumes += docker_manager.get_volumes()
            containers.update(docker_manager.get_containers())

    print("Containers:")
    for container, x in containers.items():
        print("\t%s\t%s" % (container, "+" if x["State"]["Running"] else "-"))
    print("")
    print("Volumes:")
    for volume in volumes:
        print("\t%s" % volume)


def stop(service):
    _, instance = service.split(".", 1)
    env.host_string = get_public_ip_by_instance(instance)
    docker_manager.stop_container(service)


def start(service):
    _, instance = service.split(".", 1)
    env.host_string = get_public_ip_by_instance(instance)
    docker_manager.start_container(service)


def restart(service):
    _, instance = service.split(".", 1)
    env.host_string = get_public_ip_by_instance(instance)
    docker_manager.restart_container(service)


def wipe(subject=None):
    for domain, x in env.stack.items():
        for instance, x in x.items():
            public_ip = x["public_ip"]
            for container, x in x["containers"].items():
                if subject is None or (len(subject.split(".")) == 2 and subject == instance) or (len(subject.split(".")) == 3 and subject == container):
                    env.host_string = public_ip
                    docker_manager.remove_container(container)