from __future__ import annotations

import os
import re
from datetime import datetime
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def env(name: str) -> str:
	return str(os.getenv(name, "")).strip()


def sanitize_database_url(url: str) -> str:
	if url.strip() == "":
		return url
	parts = urlsplit(url)
	if parts.query == "":
		return url
	query_items = [(k, v) for k, v in parse_qsl(parts.query) if k.lower() != "schema"]
	new_query = urlencode(query_items, doseq=True)
	return urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))


def strip_think(text: str) -> str:
	if text.strip() == "":
		return text
	cleaned = re.sub(r"<\s*think\s*>[\s\S]*?<\s*/\s*think\s*>", "", text, flags=re.IGNORECASE)
	cleaned = re.sub(r"\bthink:\s*[\s\S]*$", "", cleaned, flags=re.IGNORECASE)
	cleaned = re.sub(r"<\s*tool_call\s*>[\s\S]*?<\s*/\s*tool_call\s*>", "", cleaned, flags=re.IGNORECASE)
	cleaned = re.sub(r"<\s*function\s*=\s*delegate_work_to_coworker[\s\S]*?<\s*/\s*function\s*>", "", cleaned, flags=re.IGNORECASE)
	return cleaned.strip()


def current_datetime_str() -> str:
	return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
