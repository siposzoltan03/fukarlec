import type { HttpInit, HttpResponse } from 'claude-code'

// The LiteLLM proxy's own spend bookkeeping, read with the same virtual key
// and headers Claude Code uses (ANTHROPIC_BASE_URL / _AUTH_TOKEN / _CUSTOM_HEADERS).

export type Fetch = (url: string, init?: HttpInit) => Promise<HttpResponse>

export type Conn = { baseUrl: string; headers: Record<string, string> }

export type Metrics = {
  spend: number
  promptTokens: number
  completionTokens: number
  cacheRead: number
  cacheWrite: number
  cacheSaved: number
  requests: number
  failed: number
}

export type Day = { date: string; metrics: Metrics; models: Record<string, Metrics> }

export type Activity = { days: Day[]; total: Metrics }

export const emptyMetrics = (): Metrics => ({
  spend: 0,
  promptTokens: 0,
  completionTokens: 0,
  cacheRead: 0,
  cacheWrite: 0,
  cacheSaved: 0,
  requests: 0,
  failed: 0,
})

export function addMetrics(a: Metrics, b: Metrics): Metrics {
  return {
    spend: a.spend + b.spend,
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    cacheSaved: a.cacheSaved + b.cacheSaved,
    requests: a.requests + b.requests,
    failed: a.failed + b.failed,
  }
}

/** `ANTHROPIC_CUSTOM_HEADERS` is newline-separated `Name: value` pairs. */
export function parseCustomHeaders(raw: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const line of (raw ?? '').split(/\r?\n/)) {
    const at = line.indexOf(':')
    if (at <= 0) continue
    const name = line.slice(0, at).trim()
    const value = line.slice(at + 1).trim()
    if (name && value) headers[name] = value
  }
  return headers
}

export function makeConn(env: {
  baseUrl?: string
  authToken?: string
  apiKey?: string
  customHeaders?: string
}): Conn | undefined {
  const token = env.authToken || env.apiKey
  if (!env.baseUrl || !token) return undefined
  if (/(^|\.)anthropic\.com/.test(new URL(env.baseUrl).hostname)) return undefined
  return {
    baseUrl: env.baseUrl.replace(/\/+$/, ''),
    headers: { ...parseCustomHeaders(env.customHeaders), Authorization: `Bearer ${token}` },
  }
}

async function getJson(fetch: Fetch, conn: Conn, path: string): Promise<any> {
  const res = await fetch(conn.baseUrl + path, { headers: conn.headers })
  if (!res.ok) {
    let reason = ''
    try {
      reason = JSON.parse(res.text)?.error?.message ?? ''
    } catch {}
    throw new Error(`LiteLLM ${path.split('?')[0]}: HTTP ${res.status}${reason ? ` – ${reason.slice(0, 120)}` : ''}`)
  }
  return JSON.parse(res.text)
}

/** Lifetime spend on the virtual key; a session's cost is its delta. */
export async function fetchKeySpend(fetch: Fetch, conn: Conn): Promise<number> {
  const body = await getJson(fetch, conn, '/key/info')
  return Number(body?.info?.spend ?? 0)
}

function toMetrics(m: any): Metrics {
  return {
    spend: Number(m?.spend ?? 0),
    promptTokens: Number(m?.prompt_tokens ?? 0),
    completionTokens: Number(m?.completion_tokens ?? 0),
    cacheRead: Number(m?.cache_read_input_tokens ?? 0),
    cacheWrite: Number(m?.cache_creation_input_tokens ?? 0),
    cacheSaved: Number(m?.prompt_caching_savings_spend ?? 0),
    requests: Number(m?.api_requests ?? 0),
    failed: Number(m?.failed_requests ?? 0),
  }
}

/** Per-day, per-model spend of the key's user, `start`..`end` inclusive (YYYY-MM-DD, UTC). */
export async function fetchActivity(fetch: Fetch, conn: Conn, start: string, end: string): Promise<Activity> {
  const days: Day[] = []
  let total = emptyMetrics()
  for (let page = 1; page <= 20; page++) {
    const body = await getJson(fetch, conn, `/user/daily/activity?start_date=${start}&end_date=${end}&page=${page}`)
    for (const r of body?.results ?? []) {
      const models: Record<string, Metrics> = {}
      for (const [name, entry] of Object.entries<any>(r?.breakdown?.models ?? {})) {
        models[name] = toMetrics(entry?.metrics)
      }
      days.push({ date: String(r.date), metrics: toMetrics(r.metrics), models })
    }
    const meta = body?.metadata ?? {}
    if (page === 1) {
      total = toMetrics({
        spend: meta.total_spend,
        prompt_tokens: meta.total_prompt_tokens,
        completion_tokens: meta.total_completion_tokens,
        cache_read_input_tokens: meta.total_cache_read_input_tokens,
        cache_creation_input_tokens: meta.total_cache_creation_input_tokens,
        prompt_caching_savings_spend: meta.total_prompt_caching_savings_spend,
        api_requests: meta.total_api_requests,
        failed_requests: meta.total_failed_requests,
      })
    }
    if (!meta.has_more) break
  }
  days.sort((a, b) => a.date.localeCompare(b.date))
  return { days, total }
}

/** USD per token, as the proxy bills it. */
export type Prices = { input: number; output: number; cacheRead: number; cacheWrite: number }

/** Every model's prices from `/model/info`, keyed by the model name the proxy serves it under. */
export async function fetchPrices(fetch: Fetch, conn: Conn): Promise<Record<string, Prices>> {
  const body = await getJson(fetch, conn, '/model/info')
  const prices: Record<string, Prices> = {}
  for (const m of body?.data ?? []) {
    const i = m?.model_info ?? {}
    const input = Number(i.input_cost_per_token ?? 0)
    if (!m?.model_name || input <= 0) continue
    prices[String(m.model_name)] = {
      input,
      output: Number(i.output_cost_per_token ?? input * 5),
      cacheRead: Number(i.cache_read_input_token_cost ?? input * 0.1),
      cacheWrite: Number(i.cache_creation_input_token_cost ?? input * 1.25),
    }
  }
  return prices
}

const bareModel = (name: string) => name.replace(/^.*\//, '').replace(/\[.*\]$/, '').toLowerCase()

/** A model's prices by its name as Claude Code or the daily breakdown spells it (`azure_ai/…`, `…[1m]`, `opus`). */
export function priceFor(prices: Readonly<Record<string, Prices>>, model: string): Prices | undefined {
  const want = bareModel(model)
  const names = Object.keys(prices)
  const exact = names.find(n => bareModel(n) === want)
  if (exact) return prices[exact]
  const family = ['opus', 'sonnet', 'haiku'].find(f => want.includes(f))
  const same = family && names.filter(n => bareModel(n).includes(family)).sort().reverse()[0]
  return same ? prices[same] : undefined
}
