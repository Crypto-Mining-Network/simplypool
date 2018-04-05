#!/bin/sh

cd /usr/src/nodejs-pool &&
perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /base.sql > base.sql  &&
perl -p -i -e 's/\$\{([^}]+)\}/defined $ENV{$1} ? $ENV{$1} : $&/eg' < /config.json > config.json &&
mysql -u root --password=$MYSQL_ROOT_PASSWORD < base.sql &&
mysql -u root --password=$MYSQL_ROOT_PASSWORD pool -e "INSERT INTO pool.config (module, item, item_value, item_type, Item_desc) VALUES ('api', 'authKey', '`cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1`', 'string', 'Auth key sent with all Websocket frames for validation.')" &&
mysql -u root --password=$MYSQL_ROOT_PASSWORD pool -e "INSERT INTO pool.config (module, item, item_value, item_type, Item_desc) VALUES ('api', 'secKey', '`cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1`', 'string', 'HMAC key for Passwords.  JWT Secret Key.  Changing this will invalidate all current logins.')" &&
cd sql_sync &&
node sql_sync.js