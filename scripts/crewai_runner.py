import json
import os
import re
import sys

from crewai import Agent, Crew, Task
from crewai import LLM

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS_DIR not in sys.path:
	sys.path.insert(0, SCRIPTS_DIR)

from agents import build_main_agent, build_web_agent
from config import get_ai_config
from crew_builder import build_crew
from db import get_db_cursor
from memory_context import (
	append_to_context,
	build_memory_context,
	classify_memory_kind,
	ensure_schema,
)
from tools_registry import get_web_search_tool
from utils import current_datetime_str, strip_think


def _read_input() -> dict:
	raw = sys.stdin.read().strip()
	if raw == "":
		return {}
	try:
		return json.loads(raw)
	except json.JSONDecodeError:
		return {}




def main() -> None:
	payload = _read_input()
	message = str(payload.get("message", "")).strip()
	user_id = str(payload.get("userId", "")).strip()

	ai_config = get_ai_config()
	base_url = ai_config["base_url"]
	api_key = ai_config["api_key"]
	model = ai_config["model"]

	if message == "":
		print(json.dumps({"error": "Mensagem vazia."}, ensure_ascii=False))
		return

	if base_url == "" or api_key == "" or model == "":
		print(
			json.dumps(
				{
					"error": "Variáveis de ambiente ausentes: AI_BASE_URL, AI_API_KEY, AI_MODEL."
				},
				ensure_ascii=False,
			)
		)
		return

	llm = LLM(
		model=model,
		base_url=base_url,
		api_key=api_key,
		temperature=0.2,
	)

	agent = build_main_agent(llm)
	web_search_tool = get_web_search_tool()
	web_agent = build_web_agent(llm, web_search_tool)

	memory_context = ""
	if user_id != "":
		try:
			with get_db_cursor() as cursor:
				ensure_schema(cursor)
				memory_context = build_memory_context(cursor, user_id)
		except Exception as exc:  # noqa: BLE001
			print(json.dumps({"error": f"Erro ao carregar memória: {exc}"}, ensure_ascii=False))
			return


	description_parts = []
	description_parts.append(f"IMPORTANTE: Data e hora atuais: {current_datetime_str()}")
	description_parts.append(
		"Se precisar de pesquisa na web, delegue para o agente 'Pesquisador web'."
	)
	if memory_context != "":
		description_parts.append("Contexto de memória (use apenas se for útil):")
		description_parts.append(memory_context)
	description_parts.append("Mensagem do usuário:")
	description_parts.append("{message}")

	crew = build_crew(agent, web_agent, "\n\n".join(description_parts))

	try:
		result = crew.kickoff(inputs={"message": message})
		answer = strip_think(str(result))
		if answer == "":
			print(json.dumps({"error": "Não consegui responder agora."}, ensure_ascii=False))
			return

		if user_id != "":
			try:
				with get_db_cursor() as cursor:
					ensure_schema(cursor)
					kind = classify_memory_kind(llm, message)
					content = f"Usuário: {message}\nAssistente: {answer}"
					append_to_context(cursor, llm, user_id, "conversation", content)
					if kind == "important":
						append_to_context(cursor, llm, user_id, "important", content)
			except Exception as exc:  # noqa: BLE001
				print(json.dumps({"error": f"Erro ao salvar memória: {exc}"}, ensure_ascii=False))
				return

		print(json.dumps({"answer": answer}, ensure_ascii=False))
	except Exception as exc:  # noqa: BLE001
		print(json.dumps({"error": str(exc)}, ensure_ascii=False))


if __name__ == "__main__":
	main()
