from __future__ import annotations

import json
from datetime import datetime

import psycopg2
from crewai.tools import BaseTool

from config import get_database_url
from utils import sanitize_database_url


class ReminderTool(BaseTool):
	name: str = "criar_lembrete"
	description: str = (
		"Cria um lembrete para o usuário. "
		"Use quando o usuário pedir para ser lembrado de algo. "
		"Aceita: mensagem (texto do lembrete) e data_hora (formato ISO 8601, ex: '2026-02-20T14:30:00')."
	)
	user_id: str = ""

	def _run(self, mensagem: str, data_hora: str) -> str:
		"""Cria um lembrete para o usuário."""
		try:
			# Valida e parseia a data/hora
			try:
				scheduled_dt = datetime.fromisoformat(data_hora.replace("Z", "+00:00"))
			except (ValueError, AttributeError):
				return "Erro: Data/hora inválida. Use formato ISO 8601 (ex: '2026-02-20T14:30:00')."

			# Verifica se a data é futura
			if scheduled_dt <= datetime.now(scheduled_dt.tzinfo):
				return "Erro: A data/hora do lembrete deve ser no futuro."

			# Obtém o user_id do contexto
			if not self.user_id:
				return "Erro: Não foi possível identificar o usuário."

			# Conecta ao banco e insere o lembrete
			database_url = sanitize_database_url(get_database_url())
			if database_url == "":
				return "Erro: Banco de dados não configurado."

			with psycopg2.connect(database_url) as conn:
				with conn.cursor() as cursor:
					cursor.execute(
						"""
						INSERT INTO reminders (id, user_id, message, scheduled_at, sent, created_at)
						VALUES (gen_random_uuid()::text, %s, %s, %s, false, CURRENT_TIMESTAMP)
						RETURNING id
						""",
						(self.user_id, mensagem, scheduled_dt),
					)
					reminder_id = cursor.fetchone()[0]
					conn.commit()

			formatted_date = scheduled_dt.strftime("%d/%m/%Y às %H:%M")
			return f"✓ Lembrete criado com sucesso! Você será lembrado em {formatted_date}."

		except psycopg2.Error as e:
			return f"Erro ao criar lembrete no banco de dados: {e}"
		except Exception as e:  # noqa: BLE001
			return f"Erro ao criar lembrete: {e}"


def build_reminder_tool(user_id: str = "") -> ReminderTool:
	"""Constrói a ferramenta de lembretes com o contexto do usuário."""
	return ReminderTool(user_id=user_id)
