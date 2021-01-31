FROM debian:buster
USER root
RUN rm /etc/apt/sources.list
RUN echo 'deb http://mirror.unesp.br/debian/ buster main contrib non-free' > /etc/apt/sources.list
RUN echo 'deb-src http://mirror.unesp.br/debian/ buster main contrib non-free\n' >> /etc/apt/sources.list
RUN echo 'deb http://mirror.unesp.br/debian/ buster-updates main contrib non-free\n' >> /etc/apt/sources.list
RUN echo 'deb-src http://mirror.unesp.br/debian/ buster-updates main contrib non-free\n' >> /etc/apt/sources.list
RUN echo 'deb http://deb.debian.org/debian buster-backports main' > /etc/apt/sources.list.d/backports.list
# Prerequisites
RUN apt update && apt upgrade -y && apt install -y curl git wget tree docker docker-compose chromium imagemagick ffmpeg
# Setup new user
RUN groupmod -g 126 docker
RUN useradd -ms /bin/bash developer
RUN usermod -aG docker developer
RUN newgrp docker 
USER developer
WORKDIR /home/developer
# install snap core
RUN wget https://nodejs.org/dist/v14.15.1/node-v14.15.1-linux-x64.tar.xz -O node.tar.xz
RUN tar -xf node.tar.xz
ENV PATH "$PATH:/home/developer/node-v14.15.1-linux-x64/bin"