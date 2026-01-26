# Transcrição de Mensagens de Áudio

## Visão Geral

Foi implementada a funcionalidade de transcrição automática de mensagens de áudio antes de serem salvas no banco de dados. A implementação segue o padrão de Clean Architecture do projeto.

## Alterações Realizadas

### 1. Camada de Domínio

#### Novos tipos e interfaces:
- **IMessageType.AUDIO**: Novo tipo de mensagem adicionado ao enum [`IMessageType`](src/main/protocols/IMessageType.ts)
- **AudioTranscriptionService**: Interface de serviço em [`src/domain/services/audio-transcription-service.ts`](src/domain/services/audio-transcription-service.ts)

#### Alterações nos repositórios:
- **SaveGroupMessageData**: Adicionados campos opcionais `isAudio` e `originalAudioTranscription` em [`src/domain/repositories/group-messages-repository.ts`](src/domain/repositories/group-messages-repository.ts)
- **SaveDirectMessageData**: Adicionados campos opcionais `isAudio` e `originalAudioTranscription` em [`src/domain/repositories/direct-messages-repository.ts`](src/domain/repositories/direct-messages-repository.ts)

### 2. Camada de Dados

#### Datasources:
- **AudioTranscriptionDatasource**: Interface em [`src/data/datasources/audio-transcription-datasource.ts`](src/data/datasources/audio-transcription-datasource.ts)

#### Services:
- **AudioTranscriptionServiceImpl**: Implementação do serviço em [`src/data/services/audio-transcription-service.ts`](src/data/services/audio-transcription-service.ts)

### 3. Camada de Infraestrutura

#### Implementações:
- **GroqAudioTranscriptionDatasource**: Implementação usando API do Groq (Whisper) em [`src/infra/groq-audio-transcription-datasource.ts`](src/infra/groq-audio-transcription-datasource.ts)
  - Usa o modelo `whisper-large-v3-turbo`
  - Transcrição em português brasileiro
  - Gerenciamento automático de arquivos temporários

#### Atualizações no Prisma:
- **PrismaGroupMessagesDatasource**: Atualizado para salvar campos de áudio em [`src/infra/prisma-group-messages-datasource.ts`](src/infra/prisma-group-messages-datasource.ts)
- **PrismaDirectMessagesDatasource**: Atualizado para salvar campos de áudio em [`src/infra/prisma-direct-messages-datasource.ts`](src/infra/prisma-direct-messages-datasource.ts)

### 4. Camada de Apresentação

#### Adapters:
- **messageAdapter**: Atualizado para detectar mensagens de áudio (tipos `ptt` e `audio`) em [`src/main/adapters/messageAdapter.ts`](src/main/adapters/messageAdapter.ts)

#### Middleware:
- **save-group-messages-middleware**: Atualizado para transcrever áudios antes de salvar em [`src/main/middleware/save-group-messages-middleware.ts`](src/main/middleware/save-group-messages-middleware.ts)
  - Detecta mensagens de tipo `AUDIO`
  - Baixa o arquivo de áudio via `client.downloadFile()`
  - Transcreve usando o serviço de transcrição
  - Salva o texto transcrito como conteúdo da mensagem
  - Marca a mensagem como áudio (`isAudio: true`)
  - Armazena a transcrição original

### 5. Banco de Dados

#### Schema Prisma:
Adicionados novos campos aos modelos:
- **GroupMessage**:
  - `isAudio Boolean @default(false)`
  - `originalAudioTranscription String?`
- **DirectMessage**:
  - `isAudio Boolean @default(false)`
  - `originalAudioTranscription String?`

#### Migration:
- Criada migration `20260126124512_add_audio_transcription_fields`

### 6. Testes

#### Testes unitários criados:
- [`src/infra/groq-audio-transcription-datasource.spec.ts`](src/infra/groq-audio-transcription-datasource.spec.ts)
- [`src/data/services/audio-transcription-service.spec.ts`](src/data/services/audio-transcription-service.spec.ts)

## Fluxo de Funcionamento

1. **Recepção da mensagem**: O bot recebe uma mensagem via WhatsApp
2. **Adaptação**: O `messageAdapter` identifica mensagens de áudio (tipos `ptt` ou `audio`) e define o tipo como `IMessageType.AUDIO`
3. **Middleware**: O `save-group-messages-middleware` intercepta a mensagem
4. **Detecção**: Verifica se `message.type === IMessageType.AUDIO`
5. **Download**: Faz o download do arquivo de áudio usando `client.downloadFile(message.id)`
6. **Transcrição**: Envia o buffer de áudio para o serviço de transcrição
7. **Processamento no Groq**: 
   - O datasource salva temporariamente o arquivo
   - Envia para a API do Groq (modelo Whisper)
   - Recebe a transcrição em texto
   - Remove o arquivo temporário
8. **Persistência**: Salva no banco de dados:
   - `content`: texto transcrito
   - `isAudio`: true
   - `originalAudioTranscription`: texto transcrito
9. **Limpeza**: Em caso de erro, a mensagem é ignorada e o fluxo continua

## Requisitos

- **GROQ_API_KEY**: Variável de ambiente necessária para usar a API de transcrição
- **Modelo**: whisper-large-v3-turbo (suporte a português)
- **Formatos suportados**: áudio/ogg (formato padrão do WhatsApp)

## Tratamento de Erros

- Se a transcrição falhar, a mensagem é ignorada (não salva)
- Erros são logados no console para debug
- Arquivos temporários são sempre removidos (try/finally)
- O middleware continua o fluxo mesmo em caso de erro

## Benefícios

1. **Pesquisabilidade**: Mensagens de áudio agora podem ser pesquisadas como texto
2. **Análise**: Possibilita análise de sentimento e sumarização de conversas com áudio
3. **Acessibilidade**: Conteúdo de áudio disponível em formato texto
4. **Histórico**: Preserva o indicador de que era uma mensagem de áudio original
5. **Padrão mantido**: Implementação segue Clean Architecture do projeto
