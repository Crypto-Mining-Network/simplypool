UPDATE pool.config SET item_value = '${DAEMON_ADDRESS}' WHERE module = 'daemon' AND item = 'address';
UPDATE pool.config SET item_value = '${DAEMON_PORT}' WHERE module = 'daemon' AND item = 'port';
UPDATE pool.config SET item_value = '${WALLET_ADDRESS}' WHERE module = 'wallet' AND item = 'address';
UPDATE pool.config SET item_value = '${WALLET_PORT}' WHERE module = 'wallet' AND item = 'port';
UPDATE pool.config SET item_value = '${SHARE_HOST}' WHERE module = 'general' AND item = 'shareHost';
UPDATE pool.users SET email = '${ADMINISTRATOR_PASSWORD}' WHERE username = 'Administrator';
