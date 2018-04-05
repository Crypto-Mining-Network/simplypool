#!/bin/sh

source /root/.nvm/nvm.sh &&
cd /opt/pool &&
perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /config.json > config.json &&
perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /apply_config.sql > apply_config.sql  &&
mysql -h $MYSQL_HOST -u pool --password=$MYSQL_POOL_USER_PASSWORD < apply_config.sql &&
pm2 install pm2-logrotate &&
pm2 start init.js --name=api --log-date-format="YYYY-MM-DD HH:mm Z" -- --module=api &&
pm2 start init.js --name=blockManager --log-date-format="YYYY-MM-DD HH:mm Z"  -- --module=blockManager &&
pm2 start init.js --name=worker --log-date-format="YYYY-MM-DD HH:mm Z" -- --module=worker &&
pm2 start init.js --name=payments --log-date-format="YYYY-MM-DD HH:mm Z" -- --module=payments &&
pm2 start init.js --name=remoteShare --log-date-format="YYYY-MM-DD HH:mm Z" -- --module=remoteShare &&
pm2 start init.js --name=longRunner --log-date-format="YYYY-MM-DD HH:mm Z" -- --module=longRunner &&
pm2 start init.js --name=pool --log-date-format="YYYY-MM-DD HH:mm Z" -- --module=pool &&
pm2 restart payments &&
pm2 logs