from __future__ import annotations

import json
import time

import redis

from crewai_service import run_crewai
from utils import env


REQUEST_QUEUE = env("AI_REQUEST_QUEUE") or "ai.requests"
RESPONSE_PREFIX = env("AI_RESPONSE_PREFIX") or "ai.responses."
RESPONSE_TTL_SECONDS = int(env("AI_RESPONSE_TTL_SECONDS") or "60")


def _get_redis_client() -> redis.Redis:
	redis_url = env("REDIS_URL")
	if redis_url == "":
		raise ValueError("REDIS_URL não definida")
	return redis.Redis.from_url(redis_url, decode_responses=True)


def _build_response_key(payload: dict) -> str:
	response_key = str(payload.get("responseKey", "")).strip()
	if response_key != "":
		return response_key
	request_id = str(payload.get("id", "")).strip()
	return f"{RESPONSE_PREFIX}{request_id}"


def _handle_message(client: redis.Redis, raw_message: str) -> None:
	try:
		payload = json.loads(raw_message)
	except json.JSONDecodeError:
		return

	response_key = _build_response_key(payload)
	if response_key.strip() == "":
		return

	result = run_crewai(payload)
	client.rpush(response_key, json.dumps(result, ensure_ascii=False))
	client.expire(response_key, RESPONSE_TTL_SECONDS)


def main() -> None:
	client = _get_redis_client()
	while True:
		try:
			item = client.brpop(REQUEST_QUEUE, timeout=5)
			if item is None:
				continue
			_, raw_message = item
			_handle_message(client, raw_message)
		except Exception as exc:  # noqa: BLE001
			print(f"Erro no worker: {exc}")
			time.sleep(1)


if __name__ == "__main__":
	main()
