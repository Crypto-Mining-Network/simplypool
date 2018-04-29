FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y wget software-properties-common && \
    add-apt-repository ppa:gophers/archive && \
    apt-get update && \
    apt-get install -y build-essential make git golang-1.10-go
RUN cd /usr/src && \
    wget https://github.com/ethereum/go-ethereum/archive/v1.8.6.tar.gz && \
    tar xvf v1.8.6.tar.gz && \
    cd go-ethereum-1.8.6 && \
    PATH=$PATH:/usr/lib/go-1.10/bin make all && \
    cp build/bin/* /usr/bin
ADD main.sh /main.sh
RUN chmod +x /main.sh

CMD ["/main.sh"]