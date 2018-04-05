import json

from io import StringIO

import yaml
from fabric.state import env
from jinja2 import FileSystemLoader, Environment


class Stack(dict):
    def __init__(self, stack_file):
        super(Stack, self).__init__()

        loader = FileSystemLoader('.')
        j2_env = Environment(loader=loader)

        def jsonify(x):
            return json.dumps(x).replace("\n", " ")

        j2_env.filters["jsonify"] = jsonify
        stack_j2_template = j2_env.get_template(stack_file)
        buf = StringIO(stack_j2_template.render(**env))
        stack = yaml.load(buf)

        for domain, instances in stack.items():
            self[domain] = {}
            for instance, instance_opts in instances.items():
                instance = "%s.%s" % (instance, domain)
                containers = instance_opts.pop("containers", {}) or {}
                volumes = instance_opts.pop("volumes", [])
                self[domain][instance] = instance_opts
                self[domain][instance]["containers"] = {}
                self[domain][instance]["volumes"] = []
                for container, container_opts in containers.items():
                    container = "%s.%s" % (container, instance)
                    container_opts["volumes"] = {
                        volume_in_container: (
                            "%s.%s" % (volume_on_instance, instance) if not volume_on_instance.startswith("/")
                            else volume_on_instance
                        )
                        for volume_in_container, volume_on_instance in container_opts.get("volumes", {}).items()
                    }
                    self[domain][instance]["containers"][container] = container_opts
                for volume in volumes:
                    volume = "%s.%s" % (volume, instance)
                    self[domain][instance]["volumes"].append(volume)