from __future__ import annotations


def build_web_search_tool():
	try:
		from crewai_tools import SerperDevTool

		return SerperDevTool()
	except Exception:
		try:
			from crewai_tools import DuckDuckGoSearchTool

			return DuckDuckGoSearchTool()
		except Exception:
			try:
				from crewai_tools import WebsiteSearchTool

				return WebsiteSearchTool()
			except Exception:
				return None
