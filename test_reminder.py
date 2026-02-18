#!/usr/bin/env python3
"""
Script de teste manual para verificar a funcionalidade de lembretes.
Este script testa se o reminder_tool consegue criar lembretes no banco de dados.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta

# Adiciona o diretório do agente ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'agent'))

# Define variáveis de ambiente de teste
os.environ['DATABASE_URL'] = os.environ.get('DATABASE_URL', 'postgresql://chatbot:chatbot@localhost:5432/chatbot?schema=public')

from agent.tools.reminder_tool import build_reminder_tool


def test_criar_lembrete():
    """Testa a criação de um lembrete."""
    print("=== Teste de Criação de Lembrete ===\n")
    
    # Cria a ferramenta com um user_id de teste
    tool = build_reminder_tool("test-user-123")
    
    # Define uma data/hora futura (5 minutos a partir de agora)
    future_time = datetime.now() + timedelta(minutes=5)
    data_hora = future_time.isoformat()
    
    print(f"User ID: test-user-123")
    print(f"Mensagem: Teste de lembrete")
    print(f"Data/Hora: {data_hora}\n")
    
    # Tenta criar o lembrete
    try:
        result = tool._run(mensagem="Teste de lembrete", data_hora=data_hora)
        print(f"Resultado: {result}\n")
        
        if "✓" in result or "sucesso" in result.lower():
            print("✓ Teste PASSOU: Lembrete criado com sucesso!")
            return True
        else:
            print("✗ Teste FALHOU: Erro ao criar lembrete")
            return False
    except Exception as e:
        print(f"✗ Teste FALHOU com exceção: {e}")
        return False


def test_data_passada():
    """Testa se a validação de data passada funciona."""
    print("\n=== Teste de Validação: Data Passada ===\n")
    
    tool = build_reminder_tool("test-user-123")
    
    # Define uma data no passado
    past_time = datetime.now() - timedelta(hours=1)
    data_hora = past_time.isoformat()
    
    print(f"Data/Hora (passada): {data_hora}\n")
    
    try:
        result = tool._run(mensagem="Teste passado", data_hora=data_hora)
        print(f"Resultado: {result}\n")
        
        if "futuro" in result.lower() or "erro" in result.lower():
            print("✓ Teste PASSOU: Validação funcionou corretamente!")
            return True
        else:
            print("✗ Teste FALHOU: Deveria rejeitar data passada")
            return False
    except Exception as e:
        print(f"✗ Teste FALHOU com exceção: {e}")
        return False


def test_data_invalida():
    """Testa se a validação de formato de data funciona."""
    print("\n=== Teste de Validação: Data Inválida ===\n")
    
    tool = build_reminder_tool("test-user-123")
    
    data_hora = "data-invalida"
    
    print(f"Data/Hora (inválida): {data_hora}\n")
    
    try:
        result = tool._run(mensagem="Teste data inválida", data_hora=data_hora)
        print(f"Resultado: {result}\n")
        
        if "inválida" in result.lower() or "erro" in result.lower():
            print("✓ Teste PASSOU: Validação funcionou corretamente!")
            return True
        else:
            print("✗ Teste FALHOU: Deveria rejeitar data inválida")
            return False
    except Exception as e:
        print(f"✗ Teste FALHOU com exceção: {e}")
        return False


if __name__ == "__main__":
    print("Iniciando testes do reminder_tool...\n")
    print("NOTA: Este teste requer conexão com o banco de dados PostgreSQL.")
    print("Configure DATABASE_URL se necessário.\n")
    print("=" * 50)
    
    resultados = []
    
    # Executa os testes
    resultados.append(("Criação de lembrete", test_criar_lembrete()))
    resultados.append(("Validação: data passada", test_data_passada()))
    resultados.append(("Validação: data inválida", test_data_invalida()))
    
    # Resumo
    print("\n" + "=" * 50)
    print("\n=== RESUMO DOS TESTES ===\n")
    
    total = len(resultados)
    passou = sum(1 for _, result in resultados if result)
    falhou = total - passou
    
    for nome, resultado in resultados:
        status = "✓ PASSOU" if resultado else "✗ FALHOU"
        print(f"{status}: {nome}")
    
    print(f"\nTotal: {passou}/{total} testes passaram")
    
    sys.exit(0 if falhou == 0 else 1)
