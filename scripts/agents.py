from __future__ import annotations

from crewai import Agent


def build_main_agent(llm) -> Agent:
	return Agent(
		role="Assistente do chatbot",
		goal="Responder de forma útil, clara e objetiva à mensagem do usuário.",
		backstory="Você é o assistente principal do chatbot e ajuda usuários em PT-BR.",
		llm=llm,
		allow_delegation=True,
		verbose=False,
	)


def build_web_agent(llm, web_search_tool) -> Agent:
	tools = [web_search_tool] if web_search_tool is not None else []
	return Agent(
		role="Pesquisador web",
		goal="Pesquisar informações atuais e confiáveis na internet quando solicitado.",
		backstory="Você é responsável por pesquisas na web e retorna respostas objetivas com base no que encontrou."
    "IMPORTANTE: Sempre que possível, forneça links para as fontes das informações que você encontrar na web."
    "IMPORTANTE: Não invente informações. Se não encontrar nada relevante, responda que não encontrou."
    "IMPORTANTE: Sempre se baseie em informações atuais da web, não em conhecimento prévio.",
		llm=llm,
		tools=tools,
		allow_delegation=False,
		verbose=False,
	)
