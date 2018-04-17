#!/bin/sh
set -o noglob

if [ "$TESTNET" = "true" ]; then
  UNLOCK_WALLET="$(ls /root/.ethereum/testnet/keystore/ | sed "s/.*--//")"
else
  UNLOCK_WALLET="$(ls /root/.ethereum/keystore/ | sed "s/.*--//")"
fi

ARGS="--rpc --fast --cache 2048 --maxpeers 128 --rpcaddr 0.0.0.0 --rpcvhosts * --nat extip:$EXT_IP"

if ! [ -z "$UNLOCK_WALLET" ]; then
  ARGS="$ARGS --unlock $UNLOCK_WALLET --password /root/.ethereum/password"
fi

if [ "$TESTNET" = "true" ]; then
  ARGS="$ARGS --testnet --port 30302 --bootnodes \"enode://20c9ad97c081d63397d7b685a412227a40e23c8bdc6688c6f37e97cfbc22d2b4d1db1510d8f61e6a8866ad7f0e17c02b14182d37ea7c3c8b9c2683aeb6b733a1@52.169.14.227:30303,enode://6ce05930c72abc632c58e2e4324f7c7ea478cec0ed4fa2528982cf34483094e9cbc9216e7aa349691242576d552a2a56aaeae426c5303ded677ce455ba1acd9d@13.84.180.240:30303\""
fi

geth $ARGS