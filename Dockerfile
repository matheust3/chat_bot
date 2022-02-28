FROM debian:buster
USER root
RUN rm /etc/apt/sources.list
RUN echo 'deb http://mirror.unesp.br/debian/ buster main contrib non-free' > /etc/apt/sources.list
RUN echo 'deb-src http://mirror.unesp.br/debian/ buster main contrib non-free\n' >> /etc/apt/sources.list
RUN echo 'deb http://mirror.unesp.br/debian/ buster-updates main contrib non-free\n' >> /etc/apt/sources.list
RUN echo 'deb-src http://mirror.unesp.br/debian/ buster-updates main contrib non-free\n' >> /etc/apt/sources.list
RUN echo 'deb http://deb.debian.org/debian buster-backports main' > /etc/apt/sources.list.d/backports.list
RUN apt update && apt install -y netselect-apt
# RUN netselect-apt -o -t -n -o /etc/apt/sources.list
# Prerequisites
RUN apt update && apt upgrade -y && apt install -y curl git wget tree chromium imagemagick ffmpeg xz-utils python3.7
# Add user so we don't need --no-sandbox.
RUN groupadd -r matheus
RUN groupmod -g 1000 matheus 
RUN useradd -ms /bin/bash -g matheus -G audio,video matheus 
RUN mkdir -p /home/matheus/Downloads \
  && chown -R matheus:matheus /home/matheus 
RUN newgrp matheus
USER matheus
WORKDIR /home/matheus
# install nodejs
RUN mkdir /home/developer/nvm
ENV NVM_DIR /home/developer/nvm
ENV NODE_VERSION 16.14.0

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/v$NODE_VERSION/bin:$PATH