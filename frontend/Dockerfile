FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y uuid-runtime curl git perl nginx libjpeg62 libjpeg62-dev libpng-dev
RUN cd /tmp && \
    curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh && \
    bash ./nodesource_setup.sh && \
    apt-get install -y nodejs
RUN npm install --global webpack@3.10.0

COPY ./package.json /
RUN cd / && npm install

RUN mkdir /usr/src/frontend
RUN rm -R /srv && \
    ln -s /usr/src/frontend/static /srv

ADD nginx.conf /nginx.conf
ADD main_dev.sh /main.sh
RUN chmod +x /main.sh
ADD config.js /config.js

CMD ["/main.sh"]