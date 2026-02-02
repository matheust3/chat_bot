FROM ubuntu:latest
# Pré requisitos
RUN apt update && apt upgrade -y
RUN apt update && apt install -y ffmpeg curl git wget tree imagemagick vim nano xz-utils python3 python3-pip python3-venv
# Instala o google chrome
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN apt install ./google-chrome-stable_current_amd64.deb -y
# Usuario de desenvolvimento
USER ubuntu
# Instala CrewAI (Python)
RUN python3 -m pip install --no-cache-dir --break-system-packages crewai ollama litellm langchain-postgres psycopg2-binary langchain-openai
# Cria a pasta developer
WORKDIR /home/developer
# Instala o node
RUN wget https://nodejs.org/dist/v20.19.1/node-v20.19.1-linux-x64.tar.xz -O node.tar.xz
RUN tar -xf node.tar.xz
ENV PATH "$PATH:/home/developer/node-v20.19.1-linux-x64/bin"
