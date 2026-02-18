from __future__ import annotations

from crewai import Agent


def build_main_agent(llm, reminder_tool=None) -> Agent:
	tools = []
	if reminder_tool is not None:
		tools.append(reminder_tool)
	
	return Agent(
		role="Assistente do chatbot",
		goal="Responder de forma útil, clara e objetiva à mensagem do usuário.",
		backstory="Você é o assistente principal do chatbot e ajuda usuários em PT-BR.",
		llm=llm,
		tools=tools,
		allow_delegation=True,
		verbose=False,
	)


def build_web_agent(llm, web_search_tool) -> Agent:
	return Agent(
		role="Pesquisador web",
		goal="Informar que no momento não é possível realizar pesquisas na web.",
		backstory=(
			"Você é responsável por pesquisas na web e retorna respostas objetivas com base no que encontrou. "
			"Mas no momento, não é possível realizar pesquisas na web."
		),
		llm=llm,
		allow_delegation=False,
		verbose=False,
	)
