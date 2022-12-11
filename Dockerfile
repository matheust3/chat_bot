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
RUN groupadd -r developer
RUN groupmod -g 1000 developer 
RUN useradd -ms /bin/bash -g developer -G audio,video developer 
RUN mkdir -p /home/developer/Downloads \
  && chown -R developer:developer /home/developer 
RUN newgrp developer
USER developer
WORKDIR /home/developer
# Instala o node
RUN wget https://nodejs.org/dist/v18.12.1/node-v18.12.1-linux-x64.tar.xz -O node.tar.xz
RUN tar -xf node.tar.xz
ENV PATH "$PATH:/home/developer/node-v18.12.1-linux-x64/bin"