FROM ubuntu:latest
# Pré requisitos
RUN apt update && apt upgrade -y
RUN apt update && apt install -y ffmpeg curl git wget tree imagemagick vim nano xz-utils
# Instala o google chrome
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN apt install ./google-chrome-stable_current_amd64.deb -y
# Usuario de desenvolvimento
USER ubuntu
# Cria a pasta developer
WORKDIR /home/developer
# Instala o node
RUN wget https://nodejs.org/dist/v20.12.1/node-v20.12.1-linux-x64.tar.xz -O node.tar.xz
RUN tar -xf node.tar.xz
ENV PATH "$PATH:/home/developer/node-v20.12.1-linux-x64/bin"
