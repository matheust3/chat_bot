from __future__ import annotations

from contextlib import contextmanager

import psycopg2

from config import get_database_url
from utils import sanitize_database_url


@contextmanager
def get_db_cursor():
	database_url = sanitize_database_url(get_database_url())
	if database_url == "":
		raise ValueError("DATABASE_URL ausente.")
	with psycopg2.connect(database_url) as conn:
		with conn.cursor() as cursor:
			yield cursor
			conn.commit()
