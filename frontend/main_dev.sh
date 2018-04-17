#!/bin/sh

REV_ID=uuidgen

cd /usr/src/frontend/ && webpack -w &
perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /nginx.conf > /etc/nginx/nginx.conf &&
perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /config.js > /srv/config.js &&
cat /src/index.html | sed
nginx -c /etc/nginx/nginx.conf