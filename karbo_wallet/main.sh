#!/bin/sh

simplewallet --rpc-bind-ip=0.0.0.0 --rpc-bind-port=8082 --wallet-file /root/wallet/pool.wallet --password `cat /root/wallet/password` --daemon-host=$DAEMON_HOST --daemon-port=$DAEMON_PORT --log-file=/dev/stdout