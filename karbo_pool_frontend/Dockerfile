FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y curl git perl nginx
RUN cd /usr/src && \
    git clone https://github.com/Karbovanets/karbo-pool && \
    cp -R karbo-pool/website/* /srv
ADD nginx.conf /nginx.conf
ADD config.js /config.js
ADD main.sh /main.sh
RUN chmod +x /main.sh
ADD index.html /srv/index.html
ADD admin.html /srv/admin.html

CMD ["/main.sh"]