FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y curl git perl nginx
RUN cd /tmp && \
    curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh && \
    bash ./nodesource_setup.sh && \
    apt-get install -y nodejs
RUN cd /usr/src && \
    git clone https://github.com/mesh0000/poolui.git && \
    cd poolui && \
    npm install && \
    ./node_modules/bower/bin/bower --allow-root update && \
    ./node_modules/gulp/bin/gulp.js build && \
    cd build && \
    cp -R * /srv
ADD nginx.conf /nginx.conf
ADD globals.js /globals.js
ADD main.sh /main.sh
RUN chmod +x /main.sh
ADD index.html /srv/index.html
ADD admin.html /srv/admin.html

CMD ["/main.sh"]