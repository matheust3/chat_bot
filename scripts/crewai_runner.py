import json
import math
import os
import re
import sys
import uuid
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


def _normalize_text(text: str) -> str:
	return re.sub(r"[^\w\sÀ-ÿ]+", " ", text.lower(), flags=re.UNICODE).strip()


def _hash_embedding(text: str, dimensions: int = 256) -> list[float]:
	vector = [0.0] * dimensions
	normalized = _normalize_text(text)
	if normalized == "":
		return vector

	for token in re.split(r"\s+", normalized):
		hash_value = 0
		for ch in token:
			hash_value = ((hash_value << 5) - hash_value) + ord(ch)
			hash_value &= 0xFFFFFFFF
		index = abs(hash_value) % dimensions
		vector[index] += 1.0

	return _normalize_vector(vector)


def _normalize_vector(vector: list[float]) -> list[float]:
	norm = math.sqrt(sum(value * value for value in vector))
	if norm == 0:
		return vector
	return [value / norm for value in vector]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
	size = min(len(a), len(b))
	if size == 0:
		return 0.0
	dot = sum(a[i] * b[i] for i in range(size))
	norm_a = math.sqrt(sum(a[i] * a[i] for i in range(size)))
	norm_b = math.sqrt(sum(b[i] * b[i] for i in range(size)))
	if norm_a == 0 or norm_b == 0:
		return 0.0
	return dot / (norm_a * norm_b)


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
		CREATE TABLE IF NOT EXISTS ai_memory (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			content TEXT NOT NULL,
			embedding JSONB NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			kind TEXT NOT NULL DEFAULT 'conversation'
		);
		"""
	)
	cursor.execute(
		"""
		ALTER TABLE ai_memory
		ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'conversation';
		"""
	)
	cursor.execute(
		"""
		CREATE INDEX IF NOT EXISTS ai_memory_user_created_idx
		ON ai_memory (user_id, created_at DESC);
		"""
	)
	cursor.execute(
		"""
		CREATE INDEX IF NOT EXISTS ai_memory_user_kind_created_idx
		ON ai_memory (user_id, kind, created_at DESC);
		"""
	)


def _list_recent(cursor, user_id: str, limit: int) -> list[dict]:
	cursor.execute(
		"""
		SELECT id, content, embedding, created_at, kind
		FROM ai_memory
		WHERE user_id = %s
		ORDER BY created_at DESC
		LIMIT %s;
		""",
		(user_id, limit),
	)
	rows = cursor.fetchall()
	result: list[dict] = []
	for row in rows:
		embedding = row[2]
		if isinstance(embedding, str):
			try:
				embedding = json.loads(embedding)
			except json.JSONDecodeError:
				embedding = []
		result.append(
			{
				"id": str(row[0]),
				"content": str(row[1]),
				"embedding": embedding if isinstance(embedding, list) else [],
				"created_at": row[3],
				"kind": str(row[4]) if row[4] is not None else "conversation",
			}
		)
	return result


def _prune_by_max(cursor, kind: str, max_per_user: int) -> None:
	if not isinstance(max_per_user, int) or max_per_user <= 0:
		return
	cursor.execute(
		"""
		DELETE FROM ai_memory
		WHERE id IN (
			SELECT id FROM (
				SELECT id,
					ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
				FROM ai_memory
				WHERE kind = %s
			) ranked
			WHERE ranked.rn > %s
		);
		""",
		(kind, max_per_user),
	)


def _parse_json_array(content: str) -> list[str] | None:
	match = re.search(r"\[[\s\S]*\]", content)
	if match is None:
		return None
	try:
		parsed = json.loads(match.group(0))
		if isinstance(parsed, list):
			return [str(item) for item in parsed]
	except json.JSONDecodeError:
		return None
	return None


def _select_important_to_keep(llm: LLM, memories: list[dict], max_keep: int) -> list[str] | None:
	if max_keep <= 0:
		return []
	classifier = Agent(
		role="Curador de memória",
		goal="Escolher as memórias importantes mais relevantes para manter.",
		backstory=(
			"Você seleciona as memórias mais úteis e duradouras (dados pessoais, preferências estáveis,"
			" informações de longo prazo) e descarta as menos relevantes."
		),
		llm=llm,
		allow_delegation=False,
		verbose=False,
	)

	formatted = []
	for record in memories:
		formatted.append(
			{
				"id": record.get("id"),
				"created_at": str(record.get("created_at")),
				"content": record.get("content", ""),
			}
		)

	task = Task(
		description=(
			"Retorne SOMENTE um JSON array com os IDs das memórias a manter. "
			"Mantenha exatamente {max_keep} IDs (ou menos se houver menos itens).\n\n"
			"Memórias:\n{memories}"
		),
		expected_output="Um JSON array com IDs para manter.",
		agent=classifier,
	)

	crew = Crew(agents=[classifier], tasks=[task], verbose=False)
	result = crew.kickoff(inputs={"memories": json.dumps(formatted, ensure_ascii=False), "max_keep": max_keep})
	parsed = _parse_json_array(str(result))
	if parsed is None:
		return None
	return parsed[:max_keep]


def _prune_important_by_relevance(cursor, llm: LLM, user_id: str, max_keep: int) -> None:
	if not isinstance(max_keep, int) or max_keep <= 0:
		return

	cursor.execute(
		"""
		SELECT id, content, created_at
		FROM ai_memory
		WHERE user_id = %s AND kind = 'important'
		ORDER BY created_at DESC;
		""",
		(user_id,),
	)
	rows = cursor.fetchall()
	if len(rows) <= max_keep:
		return

	memories = [
		{"id": str(row[0]), "content": str(row[1]), "created_at": row[2]}
		for row in rows
	]

	keep_ids = _select_important_to_keep(llm, memories, max_keep)
	if keep_ids is None or len(keep_ids) == 0:
		_prune_by_max(cursor, "important", max_keep)
		return

	cursor.execute(
		"""
		DELETE FROM ai_memory
		WHERE user_id = %s AND kind = 'important' AND id <> ALL(%s);
		""",
		(user_id, keep_ids),
	)


def _build_memory_context(cursor, user_id: str, query: str) -> str:
	context_limit = int(float(_env("AI_MEMORY_CONTEXT_LIMIT") or "8"))
	threshold = float(_env("AI_MEMORY_SIMILARITY_THRESHOLD") or "0.25")

	if query.strip() == "":
		return ""

	recent = _list_recent(cursor, user_id, 60)
	if len(recent) == 0:
		return ""

	query_embedding = _hash_embedding(query)

	scored = [
		{
			"record": record,
			"score": _cosine_similarity(query_embedding, record.get("embedding", [])),
		}
		for record in recent
	]

	important = sorted(
		[entry for entry in scored if entry["record"].get("kind") == "important"],
		key=lambda item: item["record"].get("created_at"),
		reverse=True,
	)[:3]

	relevant = sorted(
		[entry for entry in scored if entry["score"] >= threshold],
		key=lambda item: item["score"],
		reverse=True,
	)

	picked: list[dict] = []
	seen: set[str] = set()

	for item in important:
		record = item["record"]
		record_id = record.get("id")
		if record_id in seen:
			continue
		picked.append(record)
		seen.add(record_id)

	for item in relevant:
		if len(picked) >= context_limit:
			break
		record = item["record"]
		record_id = record.get("id")
		if record_id in seen:
			continue
		picked.append(record)
		seen.add(record_id)

	if len(picked) == 0:
		return ""

	lines = []
	for record in picked:
		prefix = "[importante] " if record.get("kind") == "important" else ""
		lines.append(f"- {prefix}{record.get('content', '')}")

	return "\n".join(lines)


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
						memory_context = _build_memory_context(cursor, user_id, message)
						conn.commit()
			except Exception as exc:  # noqa: BLE001
				print(json.dumps({"error": f"Erro ao carregar memória: {exc}"}, ensure_ascii=False))
				return


	description_parts = []
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
		answer = str(result).strip()
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
							embedding = _hash_embedding(f"{message}\n{answer}")
							cursor.execute(
								"""
								INSERT INTO ai_memory (id, user_id, content, embedding, kind)
								VALUES (%s, %s, %s, %s::jsonb, %s);
								""",
								(str(uuid.uuid4()), user_id, content, json.dumps(embedding), kind),
							)
							max_conversation = int(float(_env("AI_MEMORY_MAX_CONVERSATION") or "200"))
							max_important = int(float(_env("AI_MEMORY_MAX_IMPORTANT") or "50"))
							_prune_by_max(cursor, "conversation", max_conversation)
							_prune_important_by_relevance(cursor, llm, user_id, max_important)
							conn.commit()
				except Exception as exc:  # noqa: BLE001
					print(json.dumps({"error": f"Erro ao salvar memória: {exc}"}, ensure_ascii=False))
					return

		print(json.dumps({"answer": answer}, ensure_ascii=False))
	except Exception as exc:  # noqa: BLE001
		print(json.dumps({"error": str(exc)}, ensure_ascii=False))


if __name__ == "__main__":
	main()
