FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y wget unzip
RUN cd /usr/src && \
    wget https://github.com/seredat/karbowanec/releases/download/v.1.5.1/karbo-cli-1.5.1-64bit.tar.gz && \
    tar xvf karbo-cli-1.5.1-64bit.tar.gz && \
    cp simplewallet /usr/bin
ADD main.sh /main.sh
RUN chmod +x /main.sh
RUN mkdir /root/wallet

CMD ["/main.sh"]