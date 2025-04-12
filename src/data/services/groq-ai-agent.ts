import { IAAgent } from "../../domain/services/ai-agent";
import Groq from "groq-sdk";
import { ExpensesDatasource } from "../datasources/expenses-datasource";
import { Expense } from "../../domain/models/expense";

// Interface para nosso histórico de mensagens interno
interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
}

export class GroqAiAgent implements IAAgent {
  private readonly client: Groq;
  private readonly expenseDb: ExpensesDatasource;

  constructor(db: ExpensesDatasource) {
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.expenseDb = db;
  }

  async handleMessage(message: string): Promise<string> {
    // Primeiro, determine a intenção usando um modelo LLM
    const intentResponse = await this.client.chat.completions.create({
      model: process.env.BASIC_MODEL || "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: "Você é um assistente financeiro. Sua tarefa é ajudar o usuário a registrar e consultar gastos"
        },
        {
          role: "system",
          content: "Classifique a intenção do usuário em uma das seguintes categorias: ADD_EXPENSE, QUERY_EXPENSES, ou OTHER. Responda apenas retornando um objeto JSON com a intenção, sem explicações adicionais. Exemplo: {\"intent\": \"ADD_EXPENSE\"}"
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    const intent = this.extractJsonFromText(intentResponse.choices[0].message.content?.trim() || '{"intent":"OTHER"}') as { intent: string } | null;

    console.log("Intenção detectada:", intent?.intent);

    // Com base na intenção, execute a lógica apropriada
    if (intent?.intent.includes("ADD_EXPENSE")) {
      // Use o LLM para extrair os parâmetros estruturados
      const extractionResponse = await this.client.chat.completions.create({
        model: process.env.BASIC_MODEL || "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "Você é um assistente financeiro. Sua tarefa é ajudar o usuário a registrar e consultar gastos do usuário. Para titulo de conhecimento essa é a data de hoje: " + new Date().toISOString().split('T')[0]
          },
          {
            role: "system",
            content: "Extraia as informações de gasto da mensagem do usuário e retorne apenas um objeto JSON com os campos: description (string), amount (number), category (string), date (opcional, formato YYYY-MM-DD). É de extrema importância que as informações estejam no padrão pt-BR"
          },
          {
            role: "user",
            content: message
          }
        ]
      });

      try {
        const extractedJson = this.extractJsonFromText(extractionResponse.choices[0].message.content || "");
        console.log("Dados do gasto extraídos (processados):", extractedJson);

        if (extractedJson.description && extractedJson.amount) {
          const expenseToSave: Expense = {
            amount: Number(extractedJson.amount),
            description: extractedJson.description,
            date: extractedJson.date ? new Date(extractedJson.date) : new Date(),
            category: extractedJson.category || 'Outros',
            id: new Date().toISOString() + Math.random().toString(36).substring(2, 15) // Gerar um ID único,
          }

          const expense = await this.expenseDb.saveExpense(expenseToSave);
          return `✅ Gasto salvo: ${expense.description} - R$ ${expense.amount} (${expense.category || 'Sem categoria'})`;
        }
      } catch (e) {
        // Falha ao parsear JSON
      }



      return "Não consegui entender os detalhes do gasto. Tente ser mais específico.";
    }

    else if (intent?.intent.includes("QUERY_EXPENSES")) {
      // Extrair parâmetros de consulta da mensagem
      const queryExtractionResponse = await this.client.chat.completions.create({
        model: process.env.BASIC_MODEL || "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "Você é um assistente financeiro. Sua tarefa é ajudar o usuário a registrar e consultar gastos do usuário. Para titulo de conhecimento essa é a data de hoje: " + new Date().toISOString().split('T')[0]
          },
          {
            role: "system",
            content: "Extraia os parâmetros de consulta da mensagem do usuário e retorne apenas um objeto JSON com os campos: category (string, opcional), startDate (string no formato YYYY-MM-DD, opcional), endDate (string no formato YYYY-MM-DD, opcional), minAmount (number, opcional), maxAmount (number, opcional), description (string, opcional). Se o usuário mencionar períodos como 'este mês', 'hoje', 'última semana', converta para datas reais."
          },
          {
            role: "user",
            content: message
          }
        ]
      });

      try {
        // Extrair e processar os parâmetros de consulta
        const queryParams = this.extractJsonFromText(queryExtractionResponse.choices[0].message.content || "{}");
        console.log("Parâmetros de consulta extraídos:", queryParams);

        // Consultar o banco de dados
        const expenses = await this.expenseDb.getExpenses(queryParams);

        if (expenses.length === 0) {
          return "Nenhum gasto encontrado com os critérios informados.";
        }

        let response = "Aqui estão os gastos encontrados:\n";
        expenses.forEach(expense => {
          response += `- ${expense.description}: R$ ${expense.amount} (${expense.category || 'Sem categoria'}) em ${expense.date}\n`;
        });

        return response;
      } catch (e) {
        // Falha ao parsear JSON
      }

      return "Não consegui entender os critérios de consulta. Tente ser mais específico.";
    }

    // Resposta genérica para outras intenções
    return "Como posso ajudar com suas finanças? Você pode me pedir para registrar gastos ou consultar seus gastos existentes.";
  }

  private removeThinkTags(text: string): string {
    return text
      // Remover tags <think></think>
      .replace(/<think>([\s\S]*?)<\/think>/g, '$1')
      // Remover blocos de código markdown
      .replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1')
      // Remover espaços extras no início e fim
      .trim();
  }

  /**
 * Extrai um objeto JSON válido de uma resposta, mesmo quando o JSON está
 * dentro de tags, formatação markdown, ou misturado com texto adicional.
 * @param text Texto que contém um objeto JSON
 * @returns O objeto JSON extraído ou null se nenhum JSON válido for encontrado
 */
  private extractJsonFromText(text: string): any {
    if (!text) return null;

    try {
      // Primeiro tenta parsear diretamente, caso o texto seja um JSON válido
      try {
        return JSON.parse(text);
      } catch (e) {
        // Se falhar, continue com métodos alternativos
      }

      // Remover tags comuns que podem envolver o JSON
      let cleanedText = this.removeThinkTags(text);

      // Tenta parsear o texto limpo
      try {
        return JSON.parse(cleanedText);
      } catch (e) {
        // Continuar com outras abordagens se falhar
      }

      // Encontra qualquer estrutura JSON que comece com { e termine com }
      const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g;
      const matches = text.match(jsonRegex);

      if (matches && matches.length > 0) {
        // Tente cada correspondência até encontrar uma válida
        for (const match of matches) {
          try {
            return JSON.parse(match);
          } catch (e) {
            continue;
          }
        }
      }

      // Se todas as tentativas falharem, tente extrair campos individuais
      const possibleObject: any = {};
      let hasValidField = false;

      // Tenta encontrar pares chave-valor no formato "chave": valor
      const keyValueRegex = /"([^"]+)"\s*:\s*(?:"([^"]*)"|(\d+(?:\.\d+)?)|(\w+))/g;
      let keyValueMatch;

      while ((keyValueMatch = keyValueRegex.exec(text)) !== null) {
        const key = keyValueMatch[1];
        // Captura o valor, que pode ser string, número ou booleano
        const value = keyValueMatch[2] !== undefined
          ? keyValueMatch[2]  // string
          : keyValueMatch[3] !== undefined
            ? parseFloat(keyValueMatch[3])  // número
            : keyValueMatch[4] === "true"
              ? true
              : keyValueMatch[4] === "false"
                ? false
                : keyValueMatch[4];  // outro valor

        possibleObject[key] = value;
        hasValidField = true;
      }

      if (hasValidField) {
        return possibleObject;
      }

      // Se todas as tentativas falharem
      console.warn("Não foi possível extrair JSON válido de:", text);
      return null;
    } catch (e) {
      console.error("Erro ao tentar extrair JSON:", e);
      return null;
    }
  }

}