#!/bin/sh

REV_ID="$(uuidgen)"

perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /nginx.conf > /etc/nginx/nginx.conf &&
perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /config.js > /srv/config.js &&
cat /srv/index.html | sed "s/REV_ID/$REV_ID/" > /tmp/index.html && cat /tmp/index.html > /srv/index.html &&
nginx -c /etc/nginx/nginx.conf