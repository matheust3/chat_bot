"""Minimal CrewAI runner.

Reads a JSON payload from stdin and returns a JSON response to stdout.
This script is intentionally small and avoids external memory/storage.

Input (stdin JSON):
    {"message":"...","context":"..."}

Output (stdout JSON):
    {"answer":"..."} or {"error":"..."}
"""

import json
import os
import sys
import io
import contextlib
import re


def main() -> None:
    """Entry point for running a single CrewAI task."""
    # Disable tracing/telemetry to keep stdout clean (JSON only).
    os.environ.setdefault("CREWAI_TRACING_ENABLED", "false")
    os.environ.setdefault("CREWAI_TRACING_DISABLED", "true")
    os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")

    try:
        from crewai import Agent, Task, Crew, Process
        try:
            from crewai import LLM  # type: ignore
        except Exception:
            LLM = None  # type: ignore
    except Exception as e:
        print(json.dumps({"error": f"Erro ao importar CrewAI: {e}"}))
        return

    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(json.dumps({"error": "Entrada inválida para o CrewAI."}))
        return

    # Basic inputs
    message = str(payload.get("message", "")).strip()
    context = str(payload.get("context", "")).strip()

    if message == "":
        print(json.dumps({"error": "Mensagem vazia."}))
        return

    # Model configuration (OpenAI-compatible envs supported).
    model = (
        os.getenv("CREWAI_MODEL")
        or os.getenv("AI_MODEL")
        or os.getenv("BASIC_MODEL")
        or "gpt-4o-mini"
    )
    api_key = (
        os.getenv("CREWAI_API_KEY")
        or os.getenv("AI_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("GROQ_API_KEY")
        or ""
    )
    base_url = (
        os.getenv("CREWAI_BASE_URL")
        or os.getenv("AI_BASE_URL")
        or os.getenv("OPENAI_BASE_URL")
        or ""
    )

    if os.getenv("OPENAI_API_KEY") is None and api_key != "":
        os.environ["OPENAI_API_KEY"] = api_key
    if os.getenv("OPENAI_BASE_URL") is None and base_url != "":
        os.environ["OPENAI_BASE_URL"] = base_url
    if os.getenv("OPENAI_MODEL_NAME") is None and model != "":
        os.environ["OPENAI_MODEL_NAME"] = model

    # Build LLM instance when available; fallback to CrewAI defaults.
    llm = None
    if LLM is not None:
        try:
            llm = LLM(model=model, api_key=api_key or None, base_url=base_url or None)
        except Exception:
            llm = None

    # Single agent, single task.
    agent = Agent(
        role="Assistente",
        goal="Responder o usuário com clareza e objetividade.",
        backstory="Você é um assistente útil e direto.",
        allow_delegation=False,
        verbose=False,
        llm=llm,
    )

    # Prompt includes optional context plus the user's message.
    prompt = (
        f"{context}\n\nUsuário: {message}\n\n"
        "Responda ao usuário de forma útil e objetiva."
    ).strip()

    task = Task(
        description=prompt,
        agent=agent,
        expected_output="Resposta clara e objetiva ao usuário, em português.",
    )

    crew = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=False,
    )

    # Capture stdout/stderr from CrewAI to keep JSON-only output.
    try:
        stdout_buffer = io.StringIO()
        stderr_buffer = io.StringIO()
        with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(stderr_buffer):
            result = crew.kickoff()
    except Exception as exc:
        err_logs = stderr_buffer.getvalue().strip()
        if err_logs != "":
            sys.stderr.write(err_logs + "\n")
        print(json.dumps({"error": f"Erro no CrewAI: {exc}"}))
        return

    answer = str(result).strip()
    err_logs = stderr_buffer.getvalue().strip()
    if err_logs != "":
        sys.stderr.write(err_logs + "\n")
    if "<think>" in answer.lower():
        answer = re.sub(r"<think>[\s\S]*?</think>", "", answer, flags=re.IGNORECASE).strip()

    print(json.dumps({"answer": answer}))


if __name__ == "__main__":
    main()
