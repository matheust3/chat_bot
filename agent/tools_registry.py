from __future__ import annotations

from tools.reminder_tool import build_reminder_tool
from tools.web_search_tool import build_web_search_tool


def get_web_search_tool():
	return build_web_search_tool()


def get_reminder_tool(user_id: str = ""):
	return build_reminder_tool(user_id)
