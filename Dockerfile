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
# Instala o node
RUN wget https://nodejs.org/dist/v16.13.2/node-v16.13.2-linux-x64.tar.xz -O node.tar.xz
RUN tar -xf node.tar.xz
ENV PATH "$PATH:/home/matheus/node-v16.13.2-linux-x64/bin"