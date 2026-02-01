import json
import os
import sys


def main() -> None:
    try:
        from crewai import Agent, Task, Crew, Process
        try:
            from crewai import LLM  # type: ignore
        except Exception:
            LLM = None  # type: ignore
    except Exception:
        print(json.dumps({"error": "crewai não instalado. Execute: pip install crewai"}))
        return

    try:
        payload = json.load(sys.stdin)
    except Exception:
        print(json.dumps({"error": "Entrada inválida para o CrewAI."}))
        return

    message = str(payload.get("message", "")).strip()
    context = str(payload.get("context", "")).strip()
    user_id = str(payload.get("userId", "")).strip() or "default"

    if message == "":
        print(json.dumps({"error": "Mensagem vazia."}))
        return

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

    llm = None
    if LLM is not None:
        try:
            llm = LLM(model=model, api_key=api_key or None, base_url=base_url or None)
        except Exception:
            llm = None

    agent = Agent(
        role="Assistente",
        goal="Responder o usuário com clareza e objetividade.",
        backstory="Você é um assistente útil e direto.",
        allow_delegation=False,
        verbose=False,
        llm=llm,
    )

    prompt = (
        f"{context}\n\nUsuário: {message}\n\n"
        "Responda ao usuário de forma útil e objetiva."
    ).strip()

    task = Task(description=prompt, agent=agent)

    crew_kwargs = dict(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=False,
    )

    memory_enabled = os.getenv("CREWAI_MEMORY", "true").lower() not in {
        "0",
        "false",
        "no",
    }
    if memory_enabled:
        memory_dir = os.getenv("CREWAI_MEMORY_DIR") or "/tmp/crewai_memory"
        user_memory_dir = os.path.join(memory_dir, user_id)
        os.makedirs(user_memory_dir, exist_ok=True)
        try:
            crew = Crew(
                **crew_kwargs,
                memory=True,
                memory_config={
                    "storage": {"path": user_memory_dir},
                    "user_id": user_id,
                },
            )
        except TypeError:
            try:
                crew = Crew(
                    **crew_kwargs,
                    memory=True,
                    memory_config={"storage": {"path": user_memory_dir}},
                )
            except TypeError:
                crew = Crew(**crew_kwargs, memory=True)
    else:
        crew = Crew(**crew_kwargs)

    try:
        result = crew.kickoff()
    except Exception as exc:
        print(json.dumps({"error": f"Erro no CrewAI: {exc}"}))
        return

    answer = str(result).strip()
    print(json.dumps({"answer": answer}))


if __name__ == "__main__":
    main()
