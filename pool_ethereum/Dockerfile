FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y wget software-properties-common && \
    add-apt-repository ppa:gophers/archive && \
    apt-get update && \
    apt-get install -y build-essential git make golang-1.10-go
ADD . /usr/src/open-ethereum-pool
RUN cd /usr/src && \
    cd open-ethereum-pool && \
    PATH=$PATH:/usr/lib/go-1.10/bin make && \
    cp build/bin/open-ethereum-pool /usr/bin
ADD main.sh /main.sh
RUN chmod +x /main.sh
ADD config.json /config.json.tmpl

CMD ["/main.sh"]