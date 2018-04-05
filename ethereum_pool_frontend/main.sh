#!/bin/sh

cd /usr/src/open-ethereum-pool/www &&
perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /nginx.conf > /etc/nginx/nginx.conf &&
perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /environment.js.tmpl > config/environment.js &&
./build.sh &&
cp -R dist/* /srv &&
cp /index.html /srv &&
nginx -c /etc/nginx/nginx.conf