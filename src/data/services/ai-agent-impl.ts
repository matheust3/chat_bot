import { IAAgent } from "../../domain/services/ai-agent";

export class AiAgentImpl implements IAAgent{
  async handleMessage (message: string) : Promise<string>{
    return ''
  }
}