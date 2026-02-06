from __future__ import annotations

import re

from crewai import Agent, Crew, Task

from config import get_memory_config
from utils import strip_think

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


def ensure_schema(cursor) -> None:
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


def get_user_context(cursor, user_id: str, kind: str) -> str:
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


def upsert_user_context(cursor, user_id: str, kind: str, content: str) -> None:
	cursor.execute(
		"""
		INSERT INTO ai_memory_context (user_id, kind, content, updated_at)
		VALUES (%s, %s, %s, NOW())
		ON CONFLICT (user_id, kind)
		DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();
		""",
		(user_id, kind, content),
	)


def summarize_context(llm, text: str, kind: str, max_chars: int) -> str:
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
	summary = strip_think(str(result))
	if summary == "":
		fallback = strip_think(text)
		return fallback[:max_chars].rstrip()
	return summary


def append_to_context(cursor, llm, user_id: str, kind: str, new_text: str) -> None:
	if new_text.strip() == "":
		return
	new_text = strip_think(new_text)
	memory_config = get_memory_config()
	max_chars = memory_config["context_max_chars"]
	summary_max_chars = memory_config["summary_max_chars"]
	current = strip_think(get_user_context(cursor, user_id, kind))
	combined = f"{current}\n{new_text}".strip() if current else new_text
	if kind == "important":
		combined = summarize_context(llm, combined, kind, summary_max_chars)
		if len(combined) > summary_max_chars:
			combined = combined[:summary_max_chars].rstrip()
	elif len(combined) > max_chars:
		combined = summarize_context(llm, combined, kind, summary_max_chars)
		if len(combined) > summary_max_chars:
			combined = combined[:summary_max_chars].rstrip()
	upsert_user_context(cursor, user_id, kind, combined)


def build_memory_context(cursor, user_id: str) -> str:
	conversation_context = get_user_context(cursor, user_id, "conversation")
	important_context = get_user_context(cursor, user_id, "important")

	parts = []
	if important_context.strip() != "":
		parts.append("Memórias importantes de longo prazo:")
		parts.append(important_context)
	if conversation_context.strip() != "":
		parts.append("Resumo da conversa recente:")
		parts.append(conversation_context)

	return strip_think("\n\n".join(parts).strip())


def is_important_memory_fallback(text: str) -> bool:
	if text.strip() == "":
		return False
	return any(pattern.search(text) for pattern in IMPORTANT_MEMORY_PATTERNS)


def classify_memory_kind(llm, message: str) -> str:
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
		return "important" if is_important_memory_fallback(message) else "conversation"
	return label
