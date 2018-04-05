FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y curl git build-essential libboost-all-dev nodejs-dev nodejs-legacy npm cmake libssl-dev python python3
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.0/install.sh | bash
RUN ln -sf bash /bin/sh && \
    ln -sf /usr/bin/python /usr/bin/python2
RUN cd /usr/src && \
    git clone https://github.com/Karbovanets/karbo-pool && \
    cd karbo-pool && \
    source ~/.nvm/nvm.sh && \
    nvm install v0.10.36 && \
    npm update && \
    cd .. && \
    mv karbo-pool /opt/pool

ADD config.json /config.json
ADD main.sh /main.sh
RUN chmod +x /main.sh

CMD ["/main.sh"]