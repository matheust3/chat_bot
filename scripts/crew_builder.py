from __future__ import annotations

from crewai import Crew, Task


def build_crew(agent, web_agent, description: str) -> Crew:
	task = Task(
		description=description,
		expected_output="Uma resposta curta, útil e em PT-BR.",
		agent=agent,
	)
	return Crew(agents=[agent, web_agent], tasks=[task], verbose=False)
