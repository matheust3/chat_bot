import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg2

try:
	from crewai import tool as crewai_tool
except Exception:  # noqa: BLE001
	try:
		from crewai import tools as crewai_tools
		crewai_tool = crewai_tools.tool  # type: ignore[attr-defined]
	except Exception:  # noqa: BLE001
		def crewai_tool(_name: str):
			def decorator(func):
				return func
			return decorator


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


def _ensure_context_schema(cursor) -> None:
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


@crewai_tool("buscar_memorias_usuario")
def memory_search_tool(query: str, user_id: str) -> str:
	"""Retorna o contexto resumido do usuário (conversa e memórias importantes)."""
	database_url = _sanitize_database_url(_env("DATABASE_URL"))
	if database_url == "":
		return "Não consegui acessar a base de memórias."

	try:
		with psycopg2.connect(database_url) as conn:
			with conn.cursor() as cursor:
				_ensure_context_schema(cursor)
				important_context = _get_user_context(cursor, user_id, "important")
				conversation_context = _get_user_context(cursor, user_id, "conversation")
	except Exception:
		return "Não consegui acessar a base de memórias."

	parts = []
	if important_context.strip() != "":
		parts.append("Memórias importantes de longo prazo:")
		parts.append(important_context)
	if conversation_context.strip() != "":
		parts.append("Resumo da conversa recente:")
		parts.append(conversation_context)

	result = "\n\n".join(parts).strip()
	return result if result != "" else "Nenhuma memória relevante encontrada."
