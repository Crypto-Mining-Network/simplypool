#!/bin/sh

perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /config.json.tmpl > /config.json &&
open-ethereum-pool /config.json