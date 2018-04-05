#!/bin/sh

UNLOCK_WALLET="$(ls /root/.ethereum/keystore/ | sed "s/.*--//")";

if [ -z "$UNLOCK_WALLET" ]; then
  geth --rpc --fast --cache 2048 --maxpeers 128 --rpcaddr 0.0.0.0 --rpcvhosts "*"
else
  geth --rpc --cache 2048 --maxpeers 128 --rpcaddr 0.0.0.0 --unlock $UNLOCK_WALLET --password /root/.ethereum/password --rpcvhosts "*"
fi