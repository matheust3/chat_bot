# Funcionalidade de Lembretes

## Visão Geral

Esta funcionalidade permite que o agente do chatbot crie lembretes para os usuários. Os usuários podem solicitar ao agente que os lembre de algo em uma data e hora específicas, e o sistema enviará automaticamente uma mensagem de lembrete no momento agendado.

## Como Funciona

### 1. Criação de Lembretes

O usuário pode pedir ao agente para criar um lembrete usando linguagem natural. Por exemplo:

- "Me lembre de comprar pão amanhã às 10h"
- "Crie um lembrete para ligar para o médico em 2 horas"
- "Lembre-me da reunião em 20/02/2026 às 14:30"

O agente utiliza a ferramenta `criar_lembrete` que:
- Extrai a mensagem do lembrete
- Converte a data/hora para formato ISO 8601
- Valida se a data é futura
- Salva o lembrete no banco de dados

### 2. Armazenamento

Os lembretes são armazenados na tabela `reminders` do PostgreSQL com os seguintes campos:

- `id`: Identificador único
- `user_id`: ID do usuário
- `message`: Texto do lembrete
- `scheduled_at`: Data/hora agendada
- `sent`: Status de envio (boolean)
- `sent_at`: Data/hora do envio
- `created_at`: Data/hora de criação

### 3. Verificação e Envio

O `reminder_worker` executa em background e:
- Verifica a cada 60 segundos (configurável) por lembretes pendentes
- Identifica lembretes cuja data/hora agendada já passou
- Envia notificações para a fila Redis
- Marca os lembretes como enviados

### 4. Notificação via WhatsApp

O `ReminderNotificationService` (TypeScript):
- Monitora a fila Redis de notificações
- Busca informações do usuário no banco
- Envia a mensagem de lembrete via WhatsApp
- Formata a mensagem com emoji 🔔

## Arquitetura

```
┌─────────────┐
│   Usuário   │
└──────┬──────┘
       │ "Me lembre de X em Y"
       ▼
┌─────────────────────┐
│   WhatsApp Bot      │
│   (TypeScript)      │
└──────┬──────────────┘
       │ Mensagem via Redis
       ▼
┌─────────────────────┐
│   CrewAI Worker     │
│   (Python)          │
└──────┬──────────────┘
       │ Usa reminder_tool
       ▼
┌─────────────────────┐
│   PostgreSQL        │
│   (Tabela reminders)│
└─────────────────────┘
       ▲
       │ Verifica lembretes
┌──────┴──────────────┐
│  Reminder Worker    │
│  (Python)           │
└──────┬──────────────┘
       │ Notificações via Redis
       ▼
┌─────────────────────────────┐
│ ReminderNotificationService │
│ (TypeScript)                │
└──────┬──────────────────────┘
       │ Envia WhatsApp
       ▼
┌─────────────┐
│   Usuário   │
└─────────────┘
```

## Componentes

### Python (Agent)

1. **reminder_tool.py**: Ferramenta CrewAI para criar lembretes
   - Valida data/hora
   - Insere no banco de dados
   - Retorna confirmação ao usuário

2. **reminder_worker.py**: Worker que verifica e envia lembretes
   - Executa em loop contínuo
   - Busca lembretes pendentes
   - Envia para fila Redis

3. **tools_registry.py**: Registro da ferramenta
   - Exporta `get_reminder_tool(user_id)`

4. **agents.py**: Configuração do agente
   - Adiciona reminder_tool ao agente principal

### TypeScript (App)

1. **reminder-notification-service.ts**: Serviço de notificação
   - Monitora fila Redis
   - Busca dados do usuário
   - Envia mensagens via WhatsApp

2. **app.ts**: Integração no aplicativo principal
   - Inicializa ReminderNotificationService
   - Conecta com cliente WhatsApp

### Banco de Dados

**Migração**: `20260218055420_add_reminders_table`
- Cria tabela `reminders`
- Adiciona índices para performance

## Configuração

### Database Migration

Antes de usar a funcionalidade de lembretes, é necessário executar a migração do banco de dados:

```bash
# Se estiver usando Docker
docker compose exec api npx prisma migrate deploy

# Ou localmente
npx prisma migrate deploy
```

A migração `20260218055420_add_reminders_table` criará a tabela `reminders` com os índices necessários.

### Variáveis de Ambiente

```bash
# Intervalo de verificação de lembretes (em segundos)
REMINDER_CHECK_INTERVAL=60

# Nome da fila Redis para notificações
REMINDER_QUEUE=reminders.notifications

# Intervalo de verificação no serviço TypeScript (em milissegundos)
REMINDER_CHECK_INTERVAL_MS=5000

# URL do banco de dados PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/db

# URL do Redis
REDIS_URL=redis://localhost:6379
```

### Docker Compose

O `docker-compose.yml` inclui um novo serviço:

```yaml
reminder_worker:
  container_name: chat_bot_reminder_worker
  # ... configuração do worker
```

## Testes

Execute o script de teste manual:

```bash
python3 test_reminder.py
```

Este script testa:
- Criação de lembretes
- Validação de data passada
- Validação de formato de data inválido

## Exemplos de Uso

### Usuário pergunta:
"Me lembre de tomar o remédio às 20:00 hoje"

### Agente responde:
"✓ Lembrete criado com sucesso! Você será lembrado em 18/02/2026 às 20:00."

### Às 20:00:
🔔 Lembrete: tomar o remédio

## Melhorias Futuras

- [ ] Suporte a lembretes recorrentes (diário, semanal, mensal)
- [ ] Cancelamento de lembretes
- [ ] Listagem de lembretes ativos
- [ ] Edição de lembretes existentes
- [ ] Notificações por email além de WhatsApp
- [ ] Timezone personalizado por usuário
