#!/bin/sh

perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /nginx.conf > /etc/nginx/nginx.conf &&
perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /globals.js > /srv/globals.js &&
nginx -c /etc/nginx/nginx.conf