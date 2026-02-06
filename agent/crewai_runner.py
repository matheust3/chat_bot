import json
import os
import sys

AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
if AGENT_DIR not in sys.path:
	sys.path.insert(0, AGENT_DIR)

from crewai_service import run_crewai


def _read_input() -> dict:
	raw = sys.stdin.read().strip()
	if raw == "":
		return {}
	try:
		return json.loads(raw)
	except json.JSONDecodeError:
		return {}




def main() -> None:
	payload = _read_input()
	result = run_crewai(payload)
	print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
	main()
