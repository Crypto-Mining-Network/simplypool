#!/bin/sh

monero-wallet-rpc --rpc-bind-ip=0.0.0.0 --confirm-external-bind --rpc-bind-port=8082 --wallet-file /root/wallet/pool --daemon-address=$DAEMON_ADDRESS --password-file=/root/wallet/password --log-file=/dev/stdout --disable-rpc-login --trusted-daemon