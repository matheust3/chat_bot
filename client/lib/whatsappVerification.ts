type VerificationEntry = {
  email: string
  phone: string
  code: string
  expiresAt: number
}

const store = new Map<string, VerificationEntry>()

const normalizeEmail = (value: string): string => value.trim().toLowerCase()
const normalizePhone = (value: string): string => value.replace(/\s+/g, '')

const getKey = (email: string, phone: string): string => {
  return `${normalizeEmail(email)}::${normalizePhone(phone)}`
}

const generateCode = (): string => {
  const value = Math.floor(100000 + Math.random() * 900000)
  return String(value)
}

export const createWhatsAppCode = (email: string, phone: string): VerificationEntry => {
  const code = generateCode()
  const expiresAt = Date.now() + 5 * 60 * 1000
  const entry: VerificationEntry = {
    email: normalizeEmail(email),
    phone: normalizePhone(phone),
    code,
    expiresAt
  }
  store.set(getKey(email, phone), entry)
  return entry
}

export const verifyWhatsAppCode = (email: string, phone: string, code: string): boolean => {
  const entry = store.get(getKey(email, phone))
  if (entry == null) {
    return false
  }
  if (entry.phone !== normalizePhone(phone)) {
    return false
  }
  if (entry.code !== code) {
    return false
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(getKey(email, phone))
    return false
  }
  store.delete(getKey(email, phone))
  return true
}
