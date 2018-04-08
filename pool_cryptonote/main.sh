#!/bin/sh

source /root/.nvm/nvm.sh &&
cd /opt/pool &&
perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /config.json > config.json &&
node init.js