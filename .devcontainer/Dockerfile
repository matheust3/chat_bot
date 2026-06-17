FROM ubuntu:latest
# Pré requisitos
RUN apt update && apt upgrade -y
RUN apt update && apt install -y ffmpeg curl git wget tree imagemagick git-flow vim nano
# Instala o docker
RUN apt-get install ca-certificates curl
RUN install -m 0755 -d /etc/apt/keyrings
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
RUN chmod a+r /etc/apt/keyrings/docker.asc
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
RUN apt-get update
RUN apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
# Copia o id do usuário docker da maquina host (para usar o CLI no devcontainer) esse argumento é passado na construção da imagem
ARG HOST_DOCKER_GROUP_ID
RUN if getent group "${HOST_DOCKER_GROUP_ID}" >/dev/null; then \
    usermod -aG "$(getent group "${HOST_DOCKER_GROUP_ID}" | cut -d: -f1)" ubuntu; \
  else \
    groupmod -g "${HOST_DOCKER_GROUP_ID}" docker && usermod -aG docker ubuntu; \
  fi
# Instala o google chrome
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN apt install ./google-chrome-stable_current_amd64.deb -y
# Usuario de desenvolvimento
USER ubuntu
WORKDIR /home/developer
# Instala o opencode
RUN curl -fsSL https://opencode.ai/install | bash
# Instala o node
RUN wget https://nodejs.org/dist/v20.19.1/node-v20.19.1-linux-x64.tar.xz -O node.tar.xz
RUN tar -xf node.tar.xz
ENV PATH "$PATH:/home/developer/node-v20.19.1-linux-x64/bin"
