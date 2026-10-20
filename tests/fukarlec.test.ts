import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { inKind, mood, statusLine, streak, tips } from '../hooks/format'
import { fetchActivity, makeConn, parseCustomHeaders, priceFor } from '../hooks/litellm'
import { BACSI_COLUMNS, BACSI_PIXEL_ROWS, BACSI_ROWS, bacsiMood, bacsiPixels, bacsiRasterCells } from '../hooks/bacsi'
import { fill, PACKS, packById, voice } from '../hooks/packs'
import { SKINS, skinById } from '../hooks/skins'
import { balance, buy, credit, creditFrom, dayXp, newLedger, rankOf, wear } from '../hooks/xp'
import type { ShopItem } from '../hooks/xp'
import type { Day, Prices } from '../hooks/litellm'
import {
  cacheExpiryWarning,
  cacheSoonWarning,
  cacheStatus,
  cacheTtlMs,
  cacheCountdownDone,
  cacheWarmSince,
  clearOrRewriteTip,
  clock,
  parallelUseTip,
  restartCosts,
  turnCost,
  compactEffectTip,
  contextGrowthTip,
  failedTip,
  forecast,
  forecastTip,
  outputTip,
  QUESTS,
  questFor,
  repeatReadTip,
  subagentTip,
  toolOutputTip,
  weekdayTip,
  condenseTranscript,
  pickSummaryModel,
  restartViaSummaryCost,
  restartWorthIt,
  contextLine,
  modelLine,
  tokenCount,
  canonicalArgs,
  handoverMarkdown,
  handoverTitle,
} from '../hooks/advice'

const NOW = Date.parse('2026-10-13T12:00:00Z')

const metrics = (spend: number, extra: Record<string, number> = {}) => ({
  spend,
  prompt_tokens: 1_000_000,
  completion_tokens: 10_000,
  cache_read_input_tokens: 900_000,
  cache_creation_input_tokens: 50_000,
  prompt_caching_savings_spend: spend * 4,
  api_requests: 10,
  ...extra,
})

const day = (date: string, spend: number) => ({
  date,
  metrics: metrics(spend),
  breakdown: { models: { 'azure_ai/claude-opus-5-5': { metrics: metrics(spend) } } },
})

/** A LiteLLM proxy: key spend moves by `keySpend()`, the month holds the given days. */
function proxy(on: On, keySpend: () => number, days: { date: string; spend: number }[], seen: string[] = []) {
  on('http.fetch', async ($, e) => {
    seen.push(e.url)
    const headers = e.init?.headers ?? {}
    if (headers.Authorization !== 'Bearer sk-test' || headers['CF-Access-Client-Id'] !== 'cf-id') {
      return { value: { status: 401, ok: false, headers: {}, text: '{"error":{"message":"nope"}}' } }
    }
    const url = new URL(e.url)
    if (url.pathname === '/model/info') {
      const info = { input_cost_per_token: 4e-6, output_cost_per_token: 2e-5, cache_read_input_token_cost: 2e-7, cache_creation_input_token_cost: 5e-6 }
      return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify({ data: [{ model_name: 'claude-opus-5-5', model_info: info }] }) } }
    }
    if (url.pathname === '/key/info') {
      return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify({ info: { spend: keySpend() } }) } }
    }
    const start = url.searchParams.get('start_date')!
    const end = url.searchParams.get('end_date')!
    const inRange = days.filter(d => d.date >= start && d.date <= end)
    const total = inRange.reduce((n, d) => n + d.spend, 0)
    const text = JSON.stringify({
      results: inRange.map(d => day(d.date, d.spend)).reverse(),
      metadata: { ...Object.fromEntries(Object.entries(metrics(total)).map(([k, v]) => [`total_${k}`, v])), total_spend: total, has_more: false },
    })
    return { value: { status: 200, ok: true, headers: {}, text } }
  })
}

/** What the engine itself would answer beneath the plugin. */
function engine(on: On) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'session-1' }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('ui.notify', () => ({ value: { isSent: true, channel: 'terminal_bell' } }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', ($, e) => ({ text: e.answer, usage: e.usage }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 120_000, window: 1_000_000 }, rateLimits: [] } }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('settings.read', () => ({ value: {} }))
}

function world(on: On) {
  engine(on)
  mock.clock(on, { now: NOW })
  mock.store(on)
  mock.env(on, {
    ANTHROPIC_BASE_URL: 'https://litellm.example.com/',
    ANTHROPIC_AUTH_TOKEN: 'sk-test',
    ANTHROPIC_CUSTOM_HEADERS: 'CF-Access-Client-Id: cf-id\nCF-Access-Client-Secret: cf-secret',
  })
  const statuses: (string | undefined)[] = []
  const toasts: string[] = []
  on('ui.status', ($, e) => (statuses.push(e.text), { value: undefined }))
  on('ui.toast', ($, e) => (toasts.push(e.text), { value: undefined }))
  return { statuses, toasts }
}

const COMMAND = (args: string) =>
  ({ command: 'fukarlec', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } }) as const

describe('pure parts', () => {
  test('custom headers and the connection', async () => {
    expect(parseCustomHeaders('A: 1\nB:  two words \n\nbroken')).toEqual({ A: '1', B: 'two words' })
    expect(makeConn({ baseUrl: 'https://api.anthropic.com', authToken: 'x' })).toBeUndefined()
    expect(makeConn({ authToken: 'x' })).toBeUndefined()
    expect(makeConn({ baseUrl: 'https://l.example/', apiKey: 'k', customHeaders: 'X: y' })).toEqual({
      baseUrl: 'https://l.example',
      headers: { X: 'y', Authorization: 'Bearer k' },
    })
  })

  test('mood, status line and lángos', async () => {
    expect(mood(0.2)).toBe('😇')
    expect(mood(0.95)).toBe('🥵')
    expect(mood(2)).toBe('💀')
    const line = statusLine({ session: 1.5, today: 45, month: 300 }, { session: 20, daily: 60, monthly: 800 }, true, false)
    expect(line).toBe('🪙 😬 session $1.50/$20.00 · ma $45.00/$60.00 · hó $300/$800')
    expect(inKind(4, 350)).toBe('≈ 1 lángos 🫓')
    expect(inKind(1000, 350)).toBe('≈ 2.3 Balaton-parti hétvége 🏖️')
  })

  test('streak counts days within budget up to yesterday', async () => {
    const d = (date: string, spend: number) => ({ date, metrics: { spend } }) as unknown as Day
    const days = [d('2026-10-05', 90), d('2026-10-08', 10), d('2026-10-12', 20), d('2026-10-13', 99)]
    expect(streak(days, '2026-10-13', 60)).toBe(7)
  })

  test('tips rest on the numbers', async () => {
    const today: Day = {
      date: '2026-10-13',
      metrics: { spend: 20, promptTokens: 3e6, completionTokens: 1e4, cacheRead: 1e6, cacheWrite: 0, cacheSaved: 0, requests: 1, failed: 0 },
      models: {
        'azure_ai/claude-opus-5-5': { spend: 19, promptTokens: 1e6, completionTokens: 0, cacheRead: 0, cacheWrite: 0, cacheSaved: 0, requests: 1, failed: 0 },
        'azure_ai/claude-sonnet-5-5': { spend: 1, promptTokens: 2e5, completionTokens: 0, cacheRead: 0, cacheWrite: 0, cacheSaved: 0, requests: 1, failed: 0 },
      },
    }
    const out = tips(today, 200_000)
    expect(out.length).toBe(3)
    expect(out[2]).toContain('3.8x drágább')
  })
})

describe('in a session', () => {
  test('status line from the proxy, then the monthly report', async ($, on) => {
    const { statuses } = world(on)
    let spend = 100
    const seen: string[] = []
    proxy(on, () => spend, [{ date: '2026-10-01', spend: 30 }, { date: '2026-10-13', spend: 12 }], seen)

    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
    spend = 103.25
    const text = (await $.command.run(COMMAND(''))).text ?? ''

    expect(seen[0]).toContain('https://litellm.example.com/')
    expect(statuses.at(-1)).toBe('🪙 😇 session $0.00/$20.00 · ma $12.00/$60.00 · hó $42.00/$800') // no turn yet
    expect(text).toContain('🪙 Fukarléc – 2026-10')
    expect(text).toContain('claude-opus-5-5')
    expect(text).toContain('Összesen: $42.00')
  })

  test('session cost comes from its own turns at the proxy prices', { options: { expensiveTurn: 0.05 } }, async ($, on) => {
    const { statuses, toasts } = world(on)
    let spend = 100
    proxy(on, () => spend, [{ date: '2026-10-13', spend: 12 }])
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
    await $.turn.start({ text: 'szia', turnId: 't1' })
    await $.turn.complete({
      answer: 'ok',
      durationMs: 1,
      isAborted: false,
      turnId: 't1',
      reason: 'answer',
      usage: { model: 'claude-opus-5-5', input_tokens: 1000, output_tokens: 1000, cache_read_input_tokens: 100_000, cache_creation_input_tokens: 10_000 },
    })
    // 1k × $4 + 1k × $20 + 100k × $0.20 + 10k × $5 per MTok = $0.094
    const tips = (await $.command.run(COMMAND('tippek'))).text ?? ''
    expect(statuses.at(-1)).toContain('session $0.09/$20.00')
    expect(toasts.some(t => t.includes('+$0.09'))).toBe(true) // over the 0.05 threshold, right at the turn's end
    expect(tips).not.toContain('👥')

    spend = 105 // someone else spent $5 on the same key
    const later = (await $.command.run(COMMAND('tippek'))).text ?? ''
    expect(later).toContain('👥')
    expect(statuses.at(-1)).toContain('session $0.09/$20.00') // the session's own spend did not move
  })

  test('block mode drops prompts over budget until /fukarlec allow', { options: { overBudget: 'block', dailyBudget: 10 } }, async ($, on) => {
    const { toasts } = world(on)
    proxy(on, () => 5, [{ date: '2026-10-13', spend: 12 }])
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
    await $.command.run(COMMAND('frissít'))

    expect(toasts.some(t => t.includes('napi'))).toBe(true)
    const dropped = await $.prompt.submit({ text: 'szia', wait: false, origin: { kind: 'composer' } })
    expect(dropped.drop).toContain('napi keret')

    await $.command.run(COMMAND('engedd'))
    const passed = await $.prompt.submit({ text: 'szia', wait: false, origin: { kind: 'composer' } })
    expect(passed.drop).toBeUndefined()
  })

  test('silent without a LiteLLM proxy', async ($, on) => {
    engine(on)
    mock.clock(on, { now: NOW })
    mock.store(on)
    mock.env(on, {})
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
    expect((await $.command.run(COMMAND(''))).text).toContain('nem LiteLLM')
  })
})

describe('Fukar bácsi', () => {
  test('every skin in every mood is a full sprite of its own colors', async () => {
    for (const skin of SKINS) {
      expect(skin.rows.length).toBe(BACSI_PIXEL_ROWS)
      for (const m of ['nyugodt', 'aggodo', 'merges'] as const) {
        const rows = bacsiPixels(skin, m)
        for (const row of rows) {
          expect(row.length).toBe(BACSI_COLUMNS)
          for (const ch of row) if (ch !== '.') expect(skin.palette[ch]).toBeDefined()
        }
        expect(atob(bacsiRasterCells(skin, m)).length).toBe(BACSI_COLUMNS * BACSI_ROWS * 3 * 4)
      }
      expect(bacsiPixels(skin, 'aggodo')).not.toEqual(bacsiPixels(skin, 'nyugodt'))
      expect(bacsiPixels(skin, 'merges')).not.toEqual(bacsiPixels(skin, 'nyugodt'))
    }
    expect(new Set(SKINS.map(s => s.id)).size).toBe(SKINS.length)
    expect(skinById('nincs ilyen').id).toBe('paraszt')
  })

  test('mood follows the worst budget', async () => {
    expect(bacsiMood(undefined)).toBe('nyugodt')
    expect(bacsiMood(0.5)).toBe('nyugodt')
    expect(bacsiMood(0.9)).toBe('aggodo')
    expect(bacsiMood(1.2)).toBe('merges')
  })

  test('packs fill their placeholders and have a saying for every mood', async () => {
    for (const p of PACKS) {
      for (const list of [p.warn, p.over, p.turn, p.xp, p.sayings.nyugodt, p.sayings.aggodo, p.sayings.merges]) {
        expect(list.length).toBeGreaterThan(0)
      }
      const vars = { keret: 'napi', pct: 85, spent: '$30.00', budget: '$25.00', cost: '$1.20', kind: '≈ 1 lángos 🫓', xp: 18 }
      for (const t of [...p.warn, ...p.over, ...p.turn, ...p.xp]) expect(fill(t, vars)).not.toContain('{')
    }
    expect(packById('nav').name).toBe('NAV-ellenőr')
  })
})

describe('XP', () => {
  const d = (date: string, spend: number) => ({ date, metrics: { spend } }) as unknown as Day

  test('a thrifty day earns base + thrift + streak; a day over budget earns nothing and breaks the streak', async () => {
    expect(dayXp(0, 25, 0)).toBe(0) // idle
    expect(dayXp(30, 25, 3)).toBe(0) // over
    expect(dayXp(12.5, 25, 0)).toBe(15) // 10 + 5
    expect(dayXp(5, 25, 9)).toBe(10 + 8 + 10) // streak capped at +10

    const start = newLedger('2026-10-14', 0) // since 2026-10-07
    const days = [d('2026-10-05', 1), d('2026-10-07', 20), d('2026-10-08', 10), d('2026-10-09', 40), d('2026-10-12', 5), d('2026-10-14', 1)]
    const { ledger, gained, credited } = credit(start, days, '2026-10-14', 25)
    expect(credited).toEqual(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12']) // not before `since`, not today
    expect(ledger.days).toEqual({ '2026-10-07': 12, '2026-10-08': 18, '2026-10-09': 0, '2026-10-12': 18 })
    const questBonus = Object.values(ledger.quests).reduce((n, xp) => n + xp, 0)
    expect(gained).toBe(48 + questBonus) // days + the quests met on them
    expect(Object.keys(ledger.quests).every(d => ledger.days[d]! > 0)).toBe(true) // never on a day over budget
    expect(creditFrom(ledger)).toBe('2026-10-13')

    // frozen: crediting again with a bigger budget changes nothing
    expect(credit(ledger, days, '2026-10-14', 1000).gained).toBe(0)
  })

  test('shop: spend garas, wear what you own, refuse what you cannot afford', async () => {
    const l = { ...newLedger('2026-10-14', 0), days: { '2026-10-10': 100, '2026-10-11': 60 } }
    const csikos: ShopItem = { kind: 'skin', id: 'csikos', name: 'Csikós', description: '', price: 150 }
    const matyo: ShopItem = { kind: 'skin', id: 'matyo', name: 'Matyó', description: '', price: 300 }

    const bought = buy(l, csikos)
    if (!('ledger' in bought)) throw new Error(bought.error)
    expect(balance(bought.ledger)).toBe(10)
    expect(bought.ledger.skin).toBe('csikos')

    const poor = buy(bought.ledger, matyo)
    expect('error' in poor && poor.error).toContain('Még 290 kell')

    const again = buy(bought.ledger, csikos)
    expect('error' in again && again.error).toContain('már a tiéd') // no second charge

    const unowned = wear(bought.ledger, matyo)
    expect('error' in unowned && unowned.error).toContain('/fukarlec buy matyo') // wearing never buys

    const paraszt: ShopItem = { kind: 'skin', id: 'paraszt', name: 'Paraszt bácsi', description: '', price: 0 }
    const back = wear(bought.ledger, paraszt)
    expect('ledger' in back && back.ledger.skin).toBe('paraszt')
    expect('ledger' in back && balance(back.ledger)).toBe(10)
  })

  test('ranks', async () => {
    expect(rankOf(0).name).toBe('Napszámos')
    expect(rankOf(160).name).toBe('Béres')
    expect(rankOf(250).progress).toBe(0.5)
    expect(rankOf(5000).next).toBeUndefined()
  })
})

describe('advice', () => {
  const opus: Prices = { input: 4e-6, output: 2e-5, cacheRead: 2e-7, cacheWrite: 5e-6 }
  const sonnet: Prices = { input: 2e-6, output: 1e-5, cacheRead: 2e-7, cacheWrite: 2.5e-6 }
  const metrics = (spend: number, extra: Partial<Day['metrics']> = {}) => ({
    spend, promptTokens: 0, completionTokens: 0, cacheRead: 0, cacheWrite: 0, cacheSaved: 0, requests: 10, failed: 0, ...extra,
  })

  test('model prices match however the model is spelled', async () => {
    const prices = { 'claude-opus-5-5': opus, 'claude-sonnet-5-5': sonnet }
    expect(priceFor(prices, 'azure_ai/claude-opus-5-5')).toEqual(opus)
    expect(priceFor(prices, 'claude-opus-5-5[1m]')).toEqual(opus)
    expect(priceFor(prices, 'sonnet')).toEqual(sonnet)
    expect(priceFor(prices, 'gpt-4o')).toBeUndefined()
  })

  test('session tips: expired cache, fat context, big outputs, rereads, subagents', async () => {
    expect(cacheExpiryWarning(4 * 60_000, 300_000, opus)).toBeUndefined() // still warm
    expect(cacheExpiryWarning(8 * 60_000, 20_000, opus)).toBeUndefined() // small context
    expect(cacheExpiryWarning(8 * 60_000, 300_000, opus)).toContain('300k tokent ír újra ≈ $1.50')
    expect(contextGrowthTip(200_000, opus)).toBeUndefined()
    expect(contextGrowthTip(400_000, opus)).toContain('≥ $0.08')
    expect(toolOutputTip('Bash', 'npm test', 40_000)).toBeUndefined()
    expect(toolOutputTip('Bash', 'npm test', 160_000)).toContain('~40k token')
    expect(repeatReadTip('/a/b/register.tsx', 3)).toBeUndefined()
    expect(repeatReadTip('/a/b/register.tsx', 4)).toContain('register.tsx-t már 4×')
    expect(subagentTip(2_000_000, 500_000)).toBeUndefined()
    expect(subagentTip(1_000_000, 1_500_000)).toContain('60%')
  })

  test('cache countdown starts at the last request of the turn, not at its end', () => {
    // The final answer's request started at 100 s and the turn ended at 160 s: the cache has been
    // ageing since 100 s, so 5 minutes later it is gone, 60 s before "turn end + 5 min".
    expect(cacheWarmSince(100_000, 160_000)).toBe(100_000)
    // No request start seen: fall back to the turn's end.
    expect(cacheWarmSince(0, 160_000)).toBe(160_000)
    // A request start after the turn's end is not this turn's: fall back too.
    expect(cacheWarmSince(170_000, 160_000)).toBe(160_000)
  })

  test('a turn whose answer outlasted the cache still reports the expiry once', () => {
    // Ended 40 s after the cache expired, nothing said yet: keep going and say it.
    expect(cacheCountdownDone(-40_000, false)).toBe(false)
    // Said already: nothing more to do.
    expect(cacheCountdownDone(-40_000, true)).toBe(true)
    // Just expired: still within the grace window either way.
    expect(cacheCountdownDone(-1_000, true)).toBe(false)
  })

  test('cache countdown: TTL, clock, status, the warning 30 s before', async () => {
    expect(cacheTtlMs(undefined)).toBe(5 * 60_000)
    expect(cacheTtlMs('1h')).toBe(60 * 60_000)
    expect(clock(222_000)).toBe('3:42')
    expect(clock(6_100)).toBe('0:07')
    expect(cacheStatus(222_000)).toBe('⏳ cache 3:42')
    expect(cacheStatus(42_000)).toBe('⌛ cache 0:42!')
    expect(cacheStatus(-1)).toBe('❄️ cache lejárt')
    expect(cacheSoonWarning(45_000, 300_000, opus)).toBeUndefined() // not yet
    expect(cacheSoonWarning(25_000, 20_000, opus)).toBeUndefined() // small context
    expect(cacheSoonWarning(25_000, 300_000, opus)).toContain('25 mp múlva')
    expect(cacheSoonWarning(25_000, 300_000, opus)).toContain('≈ $1.50')
    expect(cacheExpiryWarning(10 * 60_000, 300_000, opus, 60 * 60_000)).toBeUndefined() // 1h cache still warm
  })

  test('keep, /compact or /clear: priced for the next 10 turns', async () => {
    const cents = (x: number) => Math.round(x * 100)
    // 300k context, cache expired: rewriting 300k ($1.50) is paid either way, so keep wins over 10 turns
    const cold = restartCosts(300_000, 30_000, opus, false)
    expect([cents(cold.keep), cents(cold.compact), cents(cold.clear)]).toEqual([204, 192, 20])
    expect(cold.best).toBe('keep')
    // 600k context: the cheaper turns after a compact pay for it
    expect(restartCosts(600_000, 30_000, opus, false).best).toBe('compact')
    // still warm: compacting reads the context at cache-read price, so it pays off much sooner
    expect(restartCosts(300_000, 30_000, opus, true).best).toBe('compact')
    expect(clearOrRewriteTip(30_000, 20_000, opus)).toBeUndefined()
    expect(clearOrRewriteTip(300_000, 30_000, opus)).toContain('folytatás ~$2.04 · /compact ~$1.92 · /clear ~$0.20')
    expect(clearOrRewriteTip(300_000, 30_000, opus)).toContain('folytasd nyugodtan')
    expect(cacheSoonWarning(25_000, 300_000, opus)).toContain('/compact most (~$0.22, amíg meleg)')
  })

  test('turn cost and the shared-key check', async () => {
    const u = { input: 1000, output: 1000, cacheRead: 100_000, cacheWrite: 10_000 }
    expect(Math.round(turnCost(u, opus) * 1000)).toBe(94)
    expect(Math.round(turnCost(u, opus, true) * 1000)).toBe(124) // 1 h cache writes cost 2× input
    expect(parallelUseTip(2, 2.4)).toBeUndefined() // within the noise
    expect(parallelUseTip(2, 6)).toContain('$6.00')
  })

  test('forecast and its tip', async () => {
    expect(forecast(100, '2026-10-11')).toBe((100 / 10.5) * 31)
    expect(forecastTip(10, '2026-10-02', 800)).toBeUndefined() // too early to tell
    expect(forecastTip(600, '2026-10-15', 800)).toContain('keret $800')
    expect(forecastTip(600, '2026-10-15', 800)).toContain('/nap')
    expect(forecastTip(100, '2026-10-15', 800)).toContain('📊')
    expect(forecastTip(900, '2026-10-15', 800)).toContain('már elfogyott')
  })

  test('output share, failures and the dear weekday rest on LiteLLM numbers', async () => {
    const heavy: Day = {
      date: '2026-10-14',
      metrics: metrics(10),
      models: { 'azure_ai/claude-opus-5-5': metrics(10, { completionTokens: 250_000 }) },
    }
    const prices = (m: string) => priceFor({ 'claude-opus-5-5': opus }, m)
    expect(outputTip(heavy, prices)).toContain('50%')
    expect(failedTip({ ...heavy, metrics: metrics(10, { failed: 1, requests: 100 }) })).toBeUndefined()
    expect(failedTip({ ...heavy, metrics: metrics(10, { failed: 6, requests: 100 }) })).toContain('6 kérés')

    const days: Day[] = []
    for (let i = 0; i < 28; i++) {
      const date = new Date(Date.UTC(2026, 8, 14 + i)).toISOString().slice(0, 10) // starts on a Monday
      const tuesday = new Date(`${date}T00:00:00Z`).getUTCDay() === 2
      days.push({ date, metrics: metrics(tuesday ? 90 : 20), models: {} })
    }
    expect(weekdayTip(days)).toContain('keddi')
    expect(weekdayTip(days.slice(0, 9))).toBeUndefined() // not enough history
  })

  test('compact effect needs three turns on each side', async () => {
    expect(compactEffectTip([100, 100, 100], [60, 60])).toBeUndefined()
    expect(compactEffectTip([100, 100, 100], [60, 60, 60])).toContain('40%')
    expect(compactEffectTip([100, 100, 100], [95, 95, 95])).toBeUndefined()
  })

  test('quests: one a day, deterministic, and they pay only within budget', async () => {
    expect(questFor('2026-10-15').id).toBe(questFor('2026-10-15').id)
    expect(new Set(Array.from({ length: 30 }, (_, i) => questFor(`2026-10-${String(i + 1).padStart(2, '0')}`).id)).size).toBeGreaterThan(2)

    const cheap = QUESTS.find(q => q.id === 'fel')!
    const date = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14'].find(d => questFor(d).id === 'fel')
    if (date) {
      const ledger = newLedger('2026-10-15', 0)
      const day = { date, metrics: metrics(5), models: {} } as Day
      expect(cheap.done(day, 25)).toBe(true)
      const result = credit(ledger, [day], '2026-10-15', 25)
      expect(result.quests).toEqual([date])
      expect(result.ledger.quests[date]).toBe(5)
    }
  })

  test('the cache quest shows the day\'s own hit rate, not the month\'s', async () => {
    const cache = QUESTS.find(q => q.id === 'cache')!
    const day = { date: '2026-10-20', metrics: { ...metrics(1), promptTokens: 828_378, cacheRead: 552_953 }, models: {} } as Day
    expect(cache.progress(day)).toBe('ma 67%')
    expect(cache.done(day, 25)).toBe(false)
  })

  test('the per-request quest rewards a lean context', async () => {
    const q = QUESTS.find(x => x.id === 'kerdij')!
    expect(q.done({ date: '2026-10-20', metrics: metrics(1.36, { requests: 17 }), models: {} } as Day, 25)).toBe(true)
    expect(q.done({ date: '2026-10-19', metrics: metrics(40, { requests: 210 }), models: {} } as Day, 25)).toBe(false)
  })

  test('tips speak in the pack voice', async () => {
    expect(voice('📈 Ezzel a tempóval sok lesz.', packById('paraszt'), 2)).toBe('📈 Ezzel a tempóval sok lesz.')
    expect(voice('📈 Ezzel a tempóval sok lesz.', packById('nagymama'), 0)).toBe('📈 Kisfiam, ezzel a tempóval sok lesz.')
    expect(voice('📦 A Bash kimenete nagy.', packById('nav'), 0)).toBe('📦 Hatósági javaslat: a Bash kimenete nagy.')
    expect(voice('🧠 Opus túl sok.', packById('nav'), 0)).toBe('🧠 Hatósági javaslat: Opus túl sok.')
  })
})

describe('újrakezdés egy kis modell átadásából', () => {
  const opus = { input: 4e-6, output: 2e-5, cacheRead: 2e-7, cacheWrite: 5e-6 }
  const haiku = { input: 1e-6, output: 5e-6, cacheRead: 1e-7, cacheWrite: 1.25e-6, maxInput: 200_000 }
  const sonnet = { input: 2e-6, output: 1e-5, cacheRead: 2e-7, cacheWrite: 2.5e-6, maxInput: 1_000_000 }
  const prices = { 'claude-opus-5-5': opus, 'claude-haiku-4-5': haiku, 'claude-sonnet-5-5': sonnet }

  test('the transcript keeps every word and clips long tool output', () => {
    const rows = [
      { role: 'user' as const, text: 'Fix the vendor sync retry.', toolUses: [] },
      { role: 'assistant' as const, text: 'Reading the listener.', toolUses: [{ tool: 'Read', input: { file_path: 'src/a.ts' }, text: 'x'.repeat(5_000) }] },
    ]
    const t = condenseTranscript(rows, 100_000)
    expect(t).toContain('USER: Fix the vendor sync retry.')
    expect(t).toContain('[tool Read {"file_path":"src/a.ts"}]')
    expect(t).toContain('[… 3500 characters clipped …]')
    const long = condenseTranscript([...rows, { role: 'assistant' as const, text: 'y'.repeat(3_000) + 'END', toolUses: [] }], 2_000)
    expect(long.startsWith('USER: Fix the vendor sync retry.')).toBe(true)
    expect(long.endsWith('END')).toBe(true)
  })

  test('the cheapest small model with room is picked', () => {
    expect(pickSummaryModel(prices, 100_000)?.name).toBe('claude-haiku-4-5')
    expect(pickSummaryModel(prices, 180_000)?.name).toBe('claude-sonnet-5-5')
    expect(pickSummaryModel(prices, 100_000, true)?.name).toBe('claude-sonnet-5-5')
    expect(pickSummaryModel({ 'claude-opus-5-5': opus }, 10_000)).toBeUndefined()
  })

  test('priced against keep and /compact, suggested only when clearly cheaper', () => {
    const restart = restartViaSummaryCost(105_000, 30_000, haiku, opus)
    expect(Math.round(restart * 10_000)).toBe(3_326)
    expect(restartWorthIt(restart, restartCosts(300_000, 30_000, opus, false))).toBe(true)
    expect(restartWorthIt(restart, restartCosts(60_000, 30_000, opus, false))).toBe(false)
    const tip = clearOrRewriteTip(300_000, 30_000, opus, restart)
    expect(tip).toContain('/fukarlec restart ~$0.33')
    expect(tip).toContain('Ugyanazon a feladaton: /fukarlec restart')
    expect(cacheExpiryWarning(8 * 60_000, 300_000, opus, 5 * 60_000, { cost: restart, baseTokens: 30_000 })).toContain(
      'Előtte /compact vagy /fukarlec restart (~$0.33)?',
    )
  })
})

describe('a dashboard modell- és context-sora', () => {
  const opus = { input: 4e-6, output: 2e-5, cacheRead: 2e-7, cacheWrite: 5e-6 }

  test('token counts read like the status line', () => {
    expect(tokenCount(182_400)).toBe('182k')
    expect(tokenCount(1_000_000)).toBe('1M')
    expect(tokenCount(1_500_000)).toBe('1.5M')
  })

  test('the model with its prices per million tokens', () => {
    expect(modelLine('azure_ai/claude-opus-5-5', opus)).toBe('Modell: claude-opus-5-5 · $4.00 be · $20.00 ki · $0.20 cache-olvasás /MTok')
    expect(modelLine('claude-opus-5-5', undefined)).toBe('Modell: claude-opus-5-5')
  })

  test('how full the window is and what a turn pays to read it', () => {
    expect(contextLine(182_000, 1_000_000, opus, '▰▰▱')).toBe('Context: 182k / 1M ▰▰▱ 18% · minden kör legalább $0.04-ért olvassa')
    expect(contextLine(0, 200_000, undefined)).toBe('Context: 0k / 200k 0%')
  })
})

describe('saved handovers', () => {
  const text = '## Goal\n- Make vendor publish retries idempotent per vendor id\n\n## Next steps\n1. Add the test'

  test('a handover file says when, by whom and where', () => {
    const md = handoverMarkdown({ id: 'mgx3k2a1', at: Date.UTC(2026, 9, 19, 15, 40), model: 'claude-haiku-4-5', cwd: '/repo', text })
    expect(md.startsWith('# Handover mgx3k2a1\n\n- Written: 2026-10-19 15:40 UTC\n- By: claude-haiku-4-5\n- Project: /repo')).toBe(true)
    expect(md).toContain('## Goal')
  })

  test('its one-line title comes from the Goal section', () => {
    expect(handoverTitle(text)).toBe('Make vendor publish retries idempotent per vendor id')
    expect(handoverTitle('## Cél\n**Az árazás javítása**')).toBe('Az árazás javítása')
    expect(handoverTitle('Just one line')).toBe('Just one line')
    expect(handoverTitle('x'.repeat(200)).length).toBe(80)
  })

  test('the old Hungarian subcommands still work', () => {
    expect(canonicalArgs('Újrakezd sonnet')).toBe('restart sonnet')
    expect(canonicalArgs('vesz matyo')).toBe('buy matyo')
    expect(canonicalArgs('engedd')).toBe('allow')
    expect(canonicalArgs(' tips ')).toBe('tips')
    expect(canonicalArgs('7')).toBe('7')
  })
})

describe('LiteLLM daily activity over several pages', () => {
  const day = (date: string, spend: number, model: string) => ({
    date,
    metrics: { spend, prompt_tokens: spend * 1000, api_requests: 1 },
    breakdown: { models: { [model]: { metrics: { spend, prompt_tokens: spend * 1000, api_requests: 1 } } } },
  })
  const pages = [
    { results: [day('2026-10-20', 1, 'opus'), day('2026-10-05', 20, 'opus')], metadata: { total_spend: 21, total_api_requests: 2, has_more: true } },
    { results: [day('2026-10-05', 31, 'sonnet'), day('2026-10-03', 27, 'opus')], metadata: { total_spend: 58, total_api_requests: 2, has_more: false } },
  ]
  const fetch = async (url: string) => {
    const page = Number(/[?&]page=(\d+)/.exec(url)?.[1] ?? 1)
    return { ok: true, status: 200, text: JSON.stringify(pages[page - 1]) } as never
  }

  test('the total adds up every page, not just the first', async () => {
    const a = await fetchActivity(fetch, { baseUrl: 'https://l.example', headers: {} }, '2026-10-01', '2026-10-20')
    expect(a.total.spend).toBe(79)
    expect(a.total.requests).toBe(4)
  })

  test('a day split across two pages is one day', async () => {
    const a = await fetchActivity(fetch, { baseUrl: 'https://l.example', headers: {} }, '2026-10-01', '2026-10-20')
    expect(a.days.map(d => d.date)).toEqual(['2026-10-03', '2026-10-05', '2026-10-20'])
    const oct5 = a.days[1]!
    expect(oct5.metrics.spend).toBe(51)
    expect(Object.keys(oct5.models).sort()).toEqual(['opus', 'sonnet'])
  })
})

