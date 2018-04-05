#!/bin/sh

if [ ! -f /root/.bitmonero/.bootstrapped ]; then
    cd /root/.bitmonero/ &&
    wget -c https://downloads.getmonero.org/blockchain.raw &&
    monero-blockchain-import --verify 0 --input-file ./blockchain.raw &&
    rm -rf ./blockchain.raw &&
    touch /root/.bitmonero/.bootstrapped
fi

monerod --non-interactive --rpc-bind-ip=0.0.0.0 --confirm-external-bind