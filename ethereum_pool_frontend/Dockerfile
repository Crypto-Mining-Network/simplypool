FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y curl git perl nginx
RUN cd /tmp && \
    curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh && \
    bash ./nodesource_setup.sh && \
    apt-get install -y nodejs
RUN cd /usr/src && \
    git config --global http.https://gopkg.in.followRedirects true && \
    git clone https://github.com/sammy007/open-ethereum-pool.git && \
    cd open-ethereum-pool/www && \
    npm install -g ember-cli@2.9.1 && \
    npm install -g bower && \
    npm install && \
    bower install --allow-root
ADD main.sh /main.sh
RUN chmod +x /main.sh
ADD nginx.conf /nginx.conf
ADD environment.js.tmpl /environment.js.tmpl
ADD index.html /index.html

CMD ["/main.sh"]


