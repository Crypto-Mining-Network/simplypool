FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y wget software-properties-common && \
    add-apt-repository ppa:gophers/archive && \
    apt-get update && \
    apt-get install -y build-essential make git golang-1.10-go
RUN cd /usr/src && \
    git clone https://github.com/ethereum/go-ethereum && \
    cd go-ethereum && \
    PATH=$PATH:/usr/lib/go-1.10/bin make all && \
    cp build/bin/* /usr/bin
ADD main.sh /main.sh
RUN chmod +x /main.sh

CMD ["/main.sh"]