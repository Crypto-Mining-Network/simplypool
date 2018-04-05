FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y git python-virtualenv python3-virtualenv curl ntp build-essential screen cmake pkg-config libboost-all-dev libevent-dev libunbound-dev libminiupnpc-dev libunwind8-dev liblzma-dev libldns-dev libexpat1-dev libgtest-dev lmdb-utils libzmq3-dev mysql-client
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.0/install.sh | bash
RUN ln -sf bash /bin/sh
RUN cd /usr/src && \
    cd gtest && \
    cmake . && \
    make && \
    mv libg* /usr/lib/ && \
    cd .. && \
    git clone https://github.com/Snipa22/nodejs-pool.git && \
    source ~/.nvm/nvm.sh && \
    nvm install v8.9.3 && \
    cd nodejs-pool && \
    npm install && \
    npm install -g pm2 && \
    openssl req -subj "/C=IT/ST=Pool/L=Daemon/O=Mining Pool/CN=mining.pool" -newkey rsa:2048 -nodes -keyout cert.key -x509 -out cert.pem -days 36500 && \
    cd /usr/src && \
    mv nodejs-pool /opt/pool && \
    mkdir /root/pool_db/
RUN cd /usr/src && \
    git clone https://github.com/LMDB/lmdb && \
    cd lmdb && \
    git checkout 4d2154397afd90ca519bfa102b2aad515159bd50 && \
    cd libraries/liblmdb/ && \
    make -j `nproc` && \
    cp mdb_copy /usr/bin && \
    cp mdb_load /usr/bin && \
    cp mdb_stat /usr/bin

ADD config.json /config.json
ADD apply_config.sql /apply_config.sql
ADD main.sh /main.sh
RUN chmod +x /main.sh

CMD ["/main.sh"]