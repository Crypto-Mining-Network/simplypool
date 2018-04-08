FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y build-essential wget libtool autotools-dev autoconf pkg-config libssl-dev libboost-all-dev git npm nodejs nodejs-legacy libminiupnpc-dev
RUN cd /usr/src && \
    wget https://dlsrc.getmonero.org/cli/monero-linux-x64-v0.12.0.0.tar.bz2 && \
    tar -xjvf monero-linux-x64-v0.12.0.0.tar.bz2 && \
    mv monero-v0.12.0.0/* /usr/bin && \
    rm -R monero*
ADD main.sh /main.sh
RUN chmod +x /main.sh
RUN mkdir /root/.bitmonero

CMD ["/main.sh"]