// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class JsonExtractor {
  static extract<T>(text: string): T | null {
    if (text.length === 0) return null

    try {
      // Tenta parsear diretamente
      try {
        return JSON.parse(text)
      } catch (e) {
        // Continua com limpeza
      }

      // Remove tags <think> e markdown
      const cleanedText = text
        .replace(/<think>([\s\S]*?)<\/think>/g, '$1')
        .replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1')
        .trim()

      // Tenta parsear texto limpo
      try {
        return JSON.parse(cleanedText)
      } catch (e) {
        // Continua com regex
      }

      // Extrai JSON com regex
      const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g
      const matches = text.match(jsonRegex)

      if (matches != null) {
        for (const match of matches) {
          try {
            return JSON.parse(match)
          } catch (e) {
            continue
          }
        }
      }

      // Extrai campos individuais como última tentativa
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const possibleObject: any = {}
      let hasValidField = false
      const keyValueRegex = /"([^"]+)"\s*:\s*(?:"([^"]*)"|(\d+(?:\.\d+)?)|(\w+))/g
      let keyValueMatch

      while ((keyValueMatch = keyValueRegex.exec(text)) !== null) {
        const key = keyValueMatch[1]
        const value =
          keyValueMatch[2] !== undefined
            ? keyValueMatch[2]
            : keyValueMatch[3] !== undefined
              ? parseFloat(keyValueMatch[3])
              : keyValueMatch[4] === 'true'
                ? true
                : keyValueMatch[4] === 'false'
                  ? false
                  : keyValueMatch[4]

        possibleObject[key] = value
        hasValidField = true
      }

      if (hasValidField) {
        return possibleObject as T
      }

      console.warn('Não foi possível extrair JSON válido de:', text)
      return null
    } catch (e) {
      console.error('Erro ao tentar extrair JSON:', e)
      return null
    }
  }
}
