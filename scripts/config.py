from __future__ import annotations

from utils import env


def get_ai_config() -> dict:
	return {
		"base_url": env("AI_BASE_URL"),
		"api_key": env("AI_API_KEY"),
		# "model": env("AI_MODEL"),
		"model": "openai/stepfun/step-3.5-flash:free",
	}


def get_memory_config() -> dict:
	return {
		"context_max_chars": int(float(env("AI_MEMORY_CONTEXT_MAX_CHARS") or "4000")),
		"summary_max_chars": int(float(env("AI_MEMORY_CONTEXT_SUMMARY_MAX_CHARS") or "1200")),
	}


def get_database_url() -> str:
	return env("DATABASE_URL")
