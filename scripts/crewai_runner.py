import json
import os
import re
import sys
import uuid
from datetime import datetime
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg2
from crewai import Agent, Crew, Task
from crewai import LLM


def _read_input() -> dict:
	raw = sys.stdin.read().strip()
	if raw == "":
		return {}
	try:
		return json.loads(raw)
	except json.JSONDecodeError:
		return {}


def _env(name: str) -> str:
	return str(os.getenv(name, "")).strip()


def _sanitize_database_url(url: str) -> str:
	if url.strip() == "":
		return url
	parts = urlsplit(url)
	if parts.query == "":
		return url
	query_items = [(k, v) for k, v in parse_qsl(parts.query) if k.lower() != "schema"]
	new_query = urlencode(query_items, doseq=True)
	return urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))


def _strip_think(text: str) -> str:
	if text.strip() == "":
		return text
	cleaned = re.sub(r"<\s*think\s*>[\s\S]*?<\s*/\s*think\s*>", "", text, flags=re.IGNORECASE)
	cleaned = re.sub(r"\bthink:\s*[\s\S]*$", "", cleaned, flags=re.IGNORECASE)
	return cleaned.strip()


def _current_datetime_str() -> str:
	return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


IMPORTANT_MEMORY_PATTERNS: tuple[re.Pattern, ...] = (
	re.compile(r"\bme\s+chamo\b", re.IGNORECASE),
	re.compile(r"\bmeu\s+nome\s+é\b", re.IGNORECASE),
	re.compile(r"\bmeu\s+email\b", re.IGNORECASE),
	re.compile(r"\bmeu\s+e-mail\b", re.IGNORECASE),
	re.compile(r"\bmeu\s+telefone\b", re.IGNORECASE),
	re.compile(r"\bmeu\s+n[úu]mero\b", re.IGNORECASE),
	re.compile(r"\bmeu\s+endere[cç]o\b", re.IGNORECASE),
	re.compile(r"\bminha\s+data\s+de\s+nascimento\b", re.IGNORECASE),
	re.compile(r"\bmeu\s+anivers[aá]rio\b", re.IGNORECASE),
	re.compile(r"\blembre\b", re.IGNORECASE),
	re.compile(r"\bprefer\w+\b", re.IGNORECASE),
)


def _is_important_memory_fallback(text: str) -> bool:
	if text.strip() == "":
		return False
	return any(pattern.search(text) for pattern in IMPORTANT_MEMORY_PATTERNS)


def _ensure_schema(cursor) -> None:
	cursor.execute(
		"""
		CREATE TABLE IF NOT EXISTS ai_memory_context (
			user_id TEXT NOT NULL,
			kind TEXT NOT NULL,
			content TEXT NOT NULL DEFAULT '',
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (user_id, kind)
		);
		"""
	)
	cursor.execute(
		"""
		CREATE INDEX IF NOT EXISTS ai_memory_context_user_kind_idx
		ON ai_memory_context (user_id, kind);
		"""
	)


def _get_user_context(cursor, user_id: str, kind: str) -> str:
	cursor.execute(
		"""
		SELECT content
		FROM ai_memory_context
		WHERE user_id = %s AND kind = %s;
		""",
		(user_id, kind),
	)
	row = cursor.fetchone()
	if row is None:
		return ""
	return str(row[0] or "")


def _upsert_user_context(cursor, user_id: str, kind: str, content: str) -> None:
	cursor.execute(
		"""
		INSERT INTO ai_memory_context (user_id, kind, content, updated_at)
		VALUES (%s, %s, %s, NOW())
		ON CONFLICT (user_id, kind)
		DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();
		""",
		(user_id, kind, content),
	)


def _summarize_context(llm: LLM, text: str, kind: str, max_chars: int) -> str:
	if text.strip() == "":
		return ""
	summarizer = Agent(
		role="Resumidor de memória",
		goal="Resumir o contexto do usuário de forma curta e útil.",
		backstory=(
			"Você comprime o contexto mantendo fatos importantes, preferências e detalhes duradouros."
		),
		llm=llm,
		allow_delegation=False,
		verbose=False,
	)

	if kind == "important":
		instructions = (
			"Resuma somente memórias importantes e de longo prazo."
			" Preserve dados pessoais estáveis e preferências duradouras."
			" Formate como linhas curtas, uma informação por linha, sempre começando com 'O usuario'."
			" Exemplo: 'O nome do usuario é Matheus'."
		)
	else:
		instructions = (
			"Resuma o contexto recente da conversa e mantenha detalhes úteis."
		)

	task = Task(
		description=(
			"{instructions}\n"
			"Limite o resumo a no máximo {max_chars} caracteres.\n\n"
			"Contexto atual:\n{context}"
		),
		expected_output="Um resumo curto em texto corrido.",
		agent=summarizer,
	)

	crew = Crew(agents=[summarizer], tasks=[task], verbose=False)
	result = crew.kickoff(inputs={"context": text, "max_chars": max_chars, "instructions": instructions})
	summary = _strip_think(str(result))
	if summary == "":
		return _strip_think(text)[:max_chars].rstrip()
	if kind == "important":
		lines = []
		for piece in re.split(r"[\n\.]+", summary):
			item = piece.strip()
			if item == "":
				continue
			if not item.lower().startswith("o usuario"):
				item = f"O usuario {item[0].lower() + item[1:] if len(item) > 1 else item.lower()}"
			lines.append(item)
		formatted = "\n".join(lines).strip()
		return formatted[:max_chars].rstrip() if formatted else summary[:max_chars].rstrip()
	return summary


def _append_to_context(cursor, llm: LLM, user_id: str, kind: str, new_text: str) -> None:
	if new_text.strip() == "":
		return
	new_text = _strip_think(new_text)
	max_chars = int(float(_env("AI_MEMORY_CONTEXT_MAX_CHARS") or "4000"))
	summary_max_chars = int(float(_env("AI_MEMORY_CONTEXT_SUMMARY_MAX_CHARS") or "1200"))
	current = _strip_think(_get_user_context(cursor, user_id, kind))
	combined = f"{current}\n{new_text}".strip() if current else new_text
	if len(combined) > max_chars:
		combined = _summarize_context(llm, combined, kind, summary_max_chars)
		if len(combined) > summary_max_chars:
			combined = combined[:summary_max_chars].rstrip()
	_upsert_user_context(cursor, user_id, kind, combined)


def _build_memory_context(cursor, user_id: str) -> str:
	conversation_context = _get_user_context(cursor, user_id, "conversation")
	important_context = _get_user_context(cursor, user_id, "important")

	parts = []
	if important_context.strip() != "":
		parts.append("Memórias importantes de longo prazo:")
		parts.append(important_context)
	if conversation_context.strip() != "":
		parts.append("Resumo da conversa recente:")
		parts.append(conversation_context)

	return _strip_think("\n\n".join(parts).strip())


def _classify_memory_kind(llm: LLM, message: str) -> str:
	classifier = Agent(
		role="Classificador de memória",
		goal="Classificar se a mensagem do usuário deve ser salva como memória importante.",
		backstory=(
			"Você é responsável apenas por classificar mensagens como 'important' "
			"quando contêm dados pessoais, preferências duradouras ou instruções de lembrar."
		),
		llm=llm,
		allow_delegation=False,
		verbose=False,
	)

	task = Task(
		description=(
			"Responda somente com 'important' ou 'conversation'.\n"
			"Marque 'important' apenas se houver dados pessoais estáveis, preferências duradouras "
			"ou instruções de lembrar.\n\nMensagem:\n{message}"
		),
		expected_output="Uma única palavra: 'important' ou 'conversation'.",
		agent=classifier,
	)

	crew = Crew(agents=[classifier], tasks=[task], verbose=False)
	result = crew.kickoff(inputs={"message": message})
	label = str(result).strip().lower()
	if label not in {"important", "conversation"}:
		return "important" if _is_important_memory_fallback(message) else "conversation"
	return label


def main() -> None:
	payload = _read_input()
	message = str(payload.get("message", "")).strip()
	user_id = str(payload.get("userId", "")).strip()

	base_url = _env("AI_BASE_URL")
	api_key = _env("AI_API_KEY")
	model = _env("AI_MODEL")

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

	agent = Agent(
		role="Assistente do chatbot",
		goal="Responder de forma útil, clara e objetiva à mensagem do usuário.",
		backstory="Você é o assistente principal do chatbot e ajuda usuários em PT-BR.",
		llm=llm,
		allow_delegation=False,
		verbose=False,
	)

	memory_context = ""
	if user_id != "":
		database_url = _sanitize_database_url(_env("DATABASE_URL"))
		if database_url != "":
			try:
				with psycopg2.connect(database_url) as conn:
					with conn.cursor() as cursor:
						_ensure_schema(cursor)
						memory_context = _build_memory_context(cursor, user_id)
						conn.commit()
			except Exception as exc:  # noqa: BLE001
				print(json.dumps({"error": f"Erro ao carregar memória: {exc}"}, ensure_ascii=False))
				return


	description_parts = []
	description_parts.append(f"IMPORTANTE: Data e hora atuais: {_current_datetime_str()}")
	if memory_context != "":
		description_parts.append("Contexto de memória (use apenas se for útil):")
		description_parts.append(memory_context)
	description_parts.append("Mensagem do usuário:")
	description_parts.append("{message}")

	task = Task(
		description="\n\n".join(description_parts),
		expected_output="Uma resposta curta, útil e em PT-BR.",
		agent=agent,
	)

	crew = Crew(agents=[agent], tasks=[task], verbose=False)

	try:
		result = crew.kickoff(inputs={"message": message})
		answer = _strip_think(str(result))
		if answer == "":
			print(json.dumps({"error": "Não consegui responder agora."}, ensure_ascii=False))
			return

		if user_id != "":
			database_url = _sanitize_database_url(_env("DATABASE_URL"))
			if database_url != "":
				try:
					with psycopg2.connect(database_url) as conn:
						with conn.cursor() as cursor:
							_ensure_schema(cursor)
							kind = _classify_memory_kind(llm, message)
							content = f"Usuário: {message}\nAssistente: {answer}"
							_append_to_context(cursor, llm, user_id, "conversation", content)
							if kind == "important":
								_append_to_context(cursor, llm, user_id, "important", content)
							conn.commit()
				except Exception as exc:  # noqa: BLE001
					print(json.dumps({"error": f"Erro ao salvar memória: {exc}"}, ensure_ascii=False))
					return

		print(json.dumps({"answer": answer}, ensure_ascii=False))
	except Exception as exc:  # noqa: BLE001
		print(json.dumps({"error": str(exc)}, ensure_ascii=False))


if __name__ == "__main__":
	main()
