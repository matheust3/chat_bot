import type { Browser, KeyInput, Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { IToolDefinition } from '../../domain/services/ai-tool'

type Step =
  | { action: 'goto', url: string, waitUntil?: 'load' | 'domcontentloaded' | 'networkidle', timeoutMs?: number }
  | { action: 'click', selector: string, timeoutMs?: number }
  | { action: 'type', selector: string, text: string, delayMs?: number, timeoutMs?: number }
  | { action: 'press', key: KeyInput, delayMs?: number }
  | { action: 'wait_for_selector', selector: string, timeoutMs?: number }
  | { action: 'wait_for_timeout', timeoutMs: number }
  | { action: 'wait', timeoutMs: number }
  | { action: 'extract_text', selector: string, multiple?: boolean, maxResults?: number }
  | { action: 'extract_html', selector: string }
  | { action: 'extract_body_text' }
  | { action: 'extract_body_html' }
  | { action: 'extract_links', selector?: string, maxResults?: number }
  | { action: 'scroll_to_bottom', stepPx?: number, maxScrolls?: number }

interface BrowserOptions {
  userAgent?: string
  locale?: string
  timezoneId?: string
  headers?: Record<string, string>
}

const DEFAULT_NAV_TIMEOUT = 15000
const DEFAULT_ACTION_TIMEOUT = 10000
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const ensureNumber = (value: unknown, fallback: number): number => {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : fallback
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

const runSteps = async (page: Page, steps: Step[]): Promise<string[]> => {
  const outputs: string[] = []

  for (const step of steps) {
    switch (step.action) {
      case 'goto': {
        const timeout = ensureNumber(step.timeoutMs, DEFAULT_NAV_TIMEOUT)
        const waitUntil = step.waitUntil === 'networkidle' ? 'networkidle2' : (step.waitUntil ?? 'domcontentloaded')
        await page.goto(step.url, { waitUntil, timeout })
        outputs.push(`goto:${step.url}`)
        break
      }
      case 'click': {
        const timeout = ensureNumber(step.timeoutMs, DEFAULT_ACTION_TIMEOUT)
        await page.waitForSelector(step.selector, { timeout })
        await page.click(step.selector)
        outputs.push(`click:${step.selector}`)
        break
      }
      case 'type': {
        const timeout = ensureNumber(step.timeoutMs, DEFAULT_ACTION_TIMEOUT)
        await page.waitForSelector(step.selector, { timeout })
        await page.evaluate((selector) => {
          const element = document.querySelector(selector)
          if (element != null && 'value' in element) {
            (element as HTMLInputElement | HTMLTextAreaElement).value = ''
          }
        }, step.selector)
        await page.type(step.selector, step.text, { delay: ensureNumber(step.delayMs, 0) })
        outputs.push(`type:${step.selector}`)
        break
      }
      case 'press': {
        const delay = ensureNumber(step.delayMs, 0)
        await page.keyboard.press(step.key, delay > 0 ? { delay } : undefined)
        outputs.push(`press:${step.key}`)
        break
      }
      case 'wait_for_selector': {
        const timeout = ensureNumber(step.timeoutMs, DEFAULT_ACTION_TIMEOUT)
        await page.waitForSelector(step.selector, { timeout })
        outputs.push(`wait_for_selector:${step.selector}`)
        break
      }
      case 'wait_for_timeout': {
        const timeout = ensureNumber(step.timeoutMs, 1000)
        await sleep(timeout)
        outputs.push(`wait_for_timeout:${timeout}`)
        break
      }
      case 'wait': {
        const timeout = ensureNumber(step.timeoutMs, 1000)
        await sleep(timeout)
        outputs.push(`wait:${timeout}`)
        break
      }
      case 'extract_text': {
        if (step.multiple ?? false) {
          const maxResults = ensureNumber(step.maxResults, 20)
          const items = await page.$$eval(step.selector, (nodes) => nodes.map((node) => (node as HTMLElement).innerText?.trim()).filter(Boolean))
          outputs.push(JSON.stringify(items.slice(0, maxResults)))
        } else {
          const text = await page.$eval(step.selector, (node) => (node as HTMLElement).innerText?.trim())
          outputs.push(text?.trim() ?? '')
        }
        break
      }
      case 'extract_html': {
        const html = await page.$eval(step.selector, (node) => (node as HTMLElement).innerHTML)
        outputs.push(html ?? '')
        break
      }
      case 'extract_body_text': {
        const text = await page.evaluate(() => document.body?.innerText ?? '')
        outputs.push(text.trim())
        break
      }
      case 'extract_body_html': {
        const html = await page.evaluate(() => document.body?.innerHTML ?? '')
        outputs.push(html)
        break
      }
      case 'extract_links': {
        const selector = step.selector ?? 'a'
        const maxResults = ensureNumber(step.maxResults, 20)
        const items = await page.$$eval(selector, (nodes) => nodes.map((node) => ({
          text: (node as HTMLElement).innerText?.trim() ?? '',
          href: (node as HTMLAnchorElement).href ?? ''
        })).filter((item) => item.href !== ''))
        outputs.push(JSON.stringify(items.slice(0, maxResults)))
        break
      }
      case 'scroll_to_bottom': {
        const stepPx = ensureNumber(step.stepPx, 800)
        const maxScrolls = ensureNumber(step.maxScrolls, 10)
        for (let i = 0; i < maxScrolls; i += 1) {
          const before = await page.evaluate('document.body.scrollHeight')
          await page.evaluate((y) => window.scrollBy(0, y), stepPx)
          await sleep(500)
          const after = await page.evaluate('document.body.scrollHeight')
          if (after === before) break
        }
        outputs.push(`scroll_to_bottom:${maxScrolls}`)
        break
      }
      default:
        outputs.push('unknown_step')
        break
    }
  }

  return outputs
}

puppeteer.use(StealthPlugin())

const launchBrowser = async (): Promise<Browser> => {
  const executablePath = String(process.env.PUPPETEER_EXECUTABLE_PATH ?? '').trim()
  const baseOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  }

  if (executablePath !== '') {
    return await puppeteer.launch({ ...baseOptions, executablePath })
  }

  return await puppeteer.launch(baseOptions)
}

const buildContextOptions = (options?: BrowserOptions): {
  userAgent: string
  locale: string
  timezoneId: string
  extraHTTPHeaders: Record<string, string>
} => {
  const userAgent = (options?.userAgent ?? '').trim()
  const locale = (options?.locale ?? '').trim()
  const timezoneId = (options?.timezoneId ?? '').trim()
  return {
    userAgent: userAgent !== '' ? userAgent : DEFAULT_USER_AGENT,
    locale: locale !== '' ? locale : 'pt-BR',
    timezoneId: timezoneId !== '' ? timezoneId : 'America/Sao_Paulo',
    extraHTTPHeaders: options?.headers ?? {}
  }
}

const applyPageOptions = async (page: Page, options?: BrowserOptions): Promise<void> => {
  const { userAgent, locale, timezoneId, extraHTTPHeaders } = buildContextOptions(options)
  await page.setUserAgent(userAgent)
  if (timezoneId !== '') {
    try {
      await page.emulateTimezone(timezoneId)
    } catch {
      // ignore timezone errors
    }
  }
  if (locale !== '') {
    await page.setExtraHTTPHeaders({ ...extraHTTPHeaders, 'Accept-Language': locale })
  } else if (Object.keys(extraHTTPHeaders).length > 0) {
    await page.setExtraHTTPHeaders(extraHTTPHeaders)
  }
}

const runBrowserAutomation = async (steps: Step[], options?: BrowserOptions): Promise<string> => {
  let browser: Browser | null = null
  try {
    browser = await launchBrowser()
    const page = await browser.newPage()
    await applyPageOptions(page, options)
    const outputs = await runSteps(page, steps)
    return JSON.stringify({ outputs })
  } catch (err) {
    return `Falha na automação do navegador: ${(err as Error).message}`
  } finally {
    if (browser != null) {
      await browser.close()
    }
  }
}

const tool: IToolDefinition = {
  name: 'browser_automation',
  description: 'Controla um navegador headless para navegar, clicar e extrair conteúdo. Muito util para fazer pesquisas ou raspar dados de sites dinâmicos.',
  input: '{"steps":[{"action":"goto","url":"https://example.com"},{"action":"wait","timeoutMs":1500},{"action":"press","key":"Enter"},{"action":"extract_body_text"}],"options":{"userAgent":"opcional","locale":"pt-BR","timezoneId":"America/Sao_Paulo","headers":{"Accept-Language":"pt-BR,pt;q=0.9"}}}',
  run: async (args) => {
    const steps = Array.isArray(args.steps) ? args.steps as Step[] : []
    if (steps.length === 0) return 'Nenhuma ação fornecida.'
    const options = typeof args.options === 'object' && args.options != null ? args.options as BrowserOptions : undefined
    return await runBrowserAutomation(steps, options)
  }
}

export default tool
