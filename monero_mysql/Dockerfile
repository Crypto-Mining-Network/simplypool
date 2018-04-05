FROM mysql

RUN apt-get update && apt-get install -y git curl perl
RUN cd /tmp && \
    curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh && \
    bash ./nodesource_setup.sh && \
    apt-get install -y nodejs
RUN cd /usr/src && \
    git clone https://github.com/Snipa22/nodejs-pool && \
    chmod -R 777 nodejs-pool && \
    npm install promise-mysql async

ADD base.sql /base.sql
ADD sql_sync.sh /docker-entrypoint-initdb.d/sql_sync.sh
ADD config.json /config.json