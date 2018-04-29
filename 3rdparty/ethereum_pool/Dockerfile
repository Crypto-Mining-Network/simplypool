FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y wget software-properties-common && \
    add-apt-repository ppa:gophers/archive && \
    apt-get update && \
    apt-get install -y build-essential make git golang-1.10-go
#ADD open-ethereum-pool-nh /usr/src/open-ethereum-pool-nh
RUN cd /usr/src && \
    git config --global http.https://gopkg.in.followRedirects true && \
    git clone https://github.com/sammy007/open-ethereum-pool && \
    cd open-ethereum-pool && \
    PATH=$PATH:/usr/lib/go-1.10/bin make && \
    cp build/bin/open-ethereum-pool /usr/bin
ADD main.sh /main.sh
RUN chmod +x /main.sh
ADD config.json.tmpl /config.json.tmpl

CMD ["/main.sh"]