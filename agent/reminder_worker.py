from __future__ import annotations

import json
import os
import time
from datetime import datetime

import psycopg2
import redis

from config import get_database_url
from utils import env, sanitize_database_url

REMINDER_CHECK_INTERVAL = int(env("REMINDER_CHECK_INTERVAL") or "60") if (env("REMINDER_CHECK_INTERVAL") or "60").isdigit() else 60
REMINDER_QUEUE = env("REMINDER_QUEUE") or "reminders.notifications"


def get_redis_client() -> redis.Redis:
	"""Obtém cliente Redis."""
	redis_url = env("REDIS_URL")
	if redis_url == "":
		raise ValueError("REDIS_URL não definida")
	return redis.Redis.from_url(redis_url, decode_responses=True)


def check_and_send_reminders() -> None:
	"""Verifica lembretes pendentes e os envia."""
	database_url = sanitize_database_url(get_database_url())
	if database_url == "":
		print("DATABASE_URL não configurada")
		return

	redis_client = get_redis_client()

	try:
		with psycopg2.connect(database_url) as conn:
			with conn.cursor() as cursor:
				# Busca lembretes que devem ser enviados
				cursor.execute(
					"""
					SELECT id, user_id, message, scheduled_at
					FROM reminders
					WHERE sent = false AND scheduled_at <= CURRENT_TIMESTAMP
					ORDER BY scheduled_at ASC
					LIMIT 100
					"""
				)
				reminders = cursor.fetchall()

				for reminder_id, user_id, message, scheduled_at in reminders:
					try:
						# Envia notificação para fila Redis
						notification = {
							"type": "reminder",
							"userId": user_id,
							"message": f"🔔 Lembrete: {message}",
							"reminderId": reminder_id,
						}
						redis_client.rpush(REMINDER_QUEUE, json.dumps(notification, ensure_ascii=False))

						# Marca como enviado
						cursor.execute(
							"""
							UPDATE reminders
							SET sent = true, sent_at = CURRENT_TIMESTAMP
							WHERE id = %s
							""",
							(reminder_id,),
						)
						conn.commit()

						print(f"Lembrete {reminder_id} enviado para usuário {user_id}")
					except Exception as e:  # noqa: BLE001
						print(f"Erro ao enviar lembrete {reminder_id}: {e}")
						conn.rollback()

	except psycopg2.Error as e:
		print(f"Erro ao buscar lembretes: {e}")
	except Exception as e:  # noqa: BLE001
		print(f"Erro ao processar lembretes: {e}")
	finally:
		try:
			redis_client.close()
		except Exception:  # noqa: BLE001
			pass


def main() -> None:
	"""Loop principal do verificador de lembretes."""
	print(f"Iniciando verificador de lembretes (intervalo: {REMINDER_CHECK_INTERVAL}s)")
	while True:
		try:
			check_and_send_reminders()
		except Exception as e:  # noqa: BLE001
			print(f"Erro no loop principal: {e}")
		time.sleep(REMINDER_CHECK_INTERVAL)


if __name__ == "__main__":
	main()
