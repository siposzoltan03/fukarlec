import type { Register } from 'claude-code'

import { fetchActivity, fetchKeySpend, makeConn } from './litellm'
import type { Activity, Conn, Day, Fetch } from './litellm'
import {
  addDays,
  money,
  overQuip,
  ratios,
  report,
  SCOPE_NAMES,
  statusLine,
  streak,
  tips,
  turnQuip,
  utcDate,
  warnQuip,
} from './format'
import type { Budgets, Scope, Spend } from './format'

const POLL_MS = 5 * 60_000
const MIN_REFRESH_MS = 10_000
const TIP_EVERY_MS = 30 * 60_000
const KEEP_MS = 40 * 86_400_000

type Snapshot = { at: number; keySpend: number; today: Day | undefined; activity: Activity; date: string }
type Stamped = { at: number; [k: string]: unknown }

/** What the helpers need from the engine; built once from session.start's `$`. */
type Io = {
  now: () => Promise<number>
  fetch: Fetch
  get: (key: string) => Promise<Stamped | undefined>
  set: (key: string, value: Stamped) => Promise<void>
  del: (key: string) => Promise<void>
  keys: () => Promise<string[]>
  status: (text: string | undefined) => void
  toast: (text: string, timeoutMs: number) => void
  notify: (text: string) => void
  debug: (text: string) => void
  every: (ms: number, fn: () => void) => void
  after: (ms: number, fn: () => void) => void
}

export const register: Register = (on, options) => {
  const budgets: Budgets = {
    session: Number(options.sessionBudget ?? 0),
    daily: Number(options.dailyBudget ?? 0),
    monthly: Number(options.monthlyBudget ?? 0),
  }
  const isBlocking = options.overBudget === 'block'
  const isFun = options.fun !== false
  const hufRate = Number(options.hufRate ?? 350)
  const expensiveTurn = Number(options.expensiveTurn ?? 0)

  let io: Io | undefined
  let conn: Conn | undefined
  let sessionId = ''
  let baseline: number | undefined
  let snap: Snapshot | undefined
  let lastError: string | undefined
  let inflight: Promise<Snapshot | undefined> | undefined
  let lastTipAt = 0
  const shownTips = new Set<string>()

  const spendOf = (s: Snapshot): Spend => ({
    session: Math.max(0, s.keySpend - (baseline ?? s.keySpend)),
    today: s.today?.metrics.spend ?? 0,
    month: s.activity.total.spend,
  })

  function showStatus($: Io) {
    if (!conn) return $.status(undefined)
    if (!snap) return $.status(lastError ? `🪙 ⚠︎ ${lastError}` : '🪙 …')
    $.status(statusLine(spendOf(snap), budgets, isFun, lastError !== undefined))
  }

  async function load($: Io): Promise<Snapshot> {
    const now = await $.now()
    const date = utcDate(now)
    const fetch = $.fetch
    const [keySpend, activity] = await Promise.all([
      fetchKeySpend(fetch, conn!),
      fetchActivity(fetch, conn!, `${date.slice(0, 7)}-01`, date),
    ])
    return { at: now, keySpend, activity, date, today: activity.days.find(d => d.date === date) }
  }

  async function refresh($: Io, force = false): Promise<Snapshot | undefined> {
    if (!conn) return undefined
    if (inflight && !force) return inflight
    if (inflight) await inflight // a forced refresh wants numbers newer than the one in flight
    if (snap && !force && (await $.now()) - snap.at < MIN_REFRESH_MS) return snap
    inflight = (async () => {
      try {
        snap = await load($)
        lastError = undefined
        if (baseline === undefined) {
          baseline = snap.keySpend
          await $.set(`baseline:${sessionId}`, { at: snap.at, spend: baseline })
        }
        await checkBudgets($, snap)
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        $.debug(`fukarlec: ${lastError}`)
      } finally {
        inflight = undefined
        showStatus($)
      }
      return snap
    })()
    return inflight
  }

  function periodOf(scope: Scope, s: Snapshot): string {
    if (scope === 'session') return sessionId
    if (scope === 'daily') return s.date
    return s.date.slice(0, 7)
  }

  /** Announce each scope once per period as it crosses 80% and again at 100%. */
  async function checkBudgets($: Io, s: Snapshot) {
    const spend = spendOf(s)
    const spentBy: Record<Scope, number> = { session: spend.session, daily: spend.today, monthly: spend.month }
    for (const [scope, ratio] of Object.entries(ratios(spend, budgets)) as [Scope, number][]) {
      const level = ratio >= 1 ? 2 : ratio >= 0.8 ? 1 : 0
      if (level === 0) continue
      const key = `warned:${scope}:${periodOf(scope, s)}`
      const told = Number((await $.get(key))?.level ?? 0)
      if (level <= told) continue
      await $.set(key, { at: s.at, level })
      if (level === 1) {
        $.toast(isFun ? warnQuip(scope, ratio, s.at) : `fukarléc: ${SCOPE_NAMES[scope]} keret ${Math.round(ratio * 100)}%`, 8000)
      } else {
        const text = isFun
          ? overQuip(scope, spentBy[scope], budgets[scope], hufRate, s.at)
          : `fukarléc: ${SCOPE_NAMES[scope]} keret túllépve (${money(spentBy[scope])}/${money(budgets[scope])})`
        $.toast(text, 12_000)
        $.notify(text)
        if (isBlocking) $.toast('🔒 Új prompt csak /fukarlec engedd után.', 12_000)
      }
    }
  }

  function overScopes(): Scope[] {
    if (!snap) return []
    return (Object.entries(ratios(spendOf(snap), budgets)) as [Scope, number][]).filter(([, r]) => r >= 1).map(([s]) => s)
  }

  async function afterTurn(cacheWrite: number) {
    const $ = io
    if (!$ || !conn) return
    const before = snap?.keySpend
    const s = await refresh($, true)
    if (!s) return
    if (before !== undefined && expensiveTurn > 0 && s.keySpend - before >= expensiveTurn) {
      $.toast(turnQuip(s.keySpend - before, hufRate, isFun), 8000)
    }
    if (s.at - lastTipAt < TIP_EVERY_MS) return
    const tip = tips(s.today, cacheWrite).find(t => !shownTips.has(`${s.date}:${t.slice(0, 2)}`))
    if (!tip) return
    shownTips.add(`${s.date}:${tip.slice(0, 2)}`)
    lastTipAt = s.at
    $.toast(isFun ? tip : tip.replace(/^\S+\s/, 'Tipp: '), 15_000)
  }

  async function prune($: Io) {
    const now = await $.now()
    for (const key of await $.keys()) {
      const value = await $.get(key)
      if (typeof value?.at === 'number' && now - value.at > KEEP_MS) await $.del(key)
    }
  }

  on('session.start', async ($, e, next) => {
    io = {
      now: () => $.clock.now(),
      fetch: (url, init) => $.http.fetch(url, init),
      get: async key => (await $.store.get(key)) as Stamped | undefined,
      set: (key, value) => $.store.set(key, value),
      del: key => $.store.delete(key),
      keys: () => $.store.keys(),
      status: text => $.ui.status(text),
      toast: (text, timeoutMs) => $.ui.toast(text, { timeoutMs }),
      notify: text => void $.ui.notify(text, { title: 'Fukarléc' }).catch(() => {}),
      debug: text => $.ui.log(text, { to: 'debug' }),
      every: (ms, fn) => void $.clock.every(ms, fn),
      after: (ms, fn) => void $.clock.after(ms, fn),
    }
    await $.command.register({
      name: 'fukarlec',
      description: 'LiteLLM költségriport: /fukarlec [hó | <napok száma> | frissít | engedd]',
    })
    conn = makeConn({
      baseUrl: await $.env.get('ANTHROPIC_BASE_URL'),
      authToken: await $.env.get('ANTHROPIC_AUTH_TOKEN'),
      apiKey: await $.env.get('ANTHROPIC_API_KEY'),
      customHeaders: await $.env.get('ANTHROPIC_CUSTOM_HEADERS'),
    })
    if (conn) {
      const $io = io
      sessionId = await $.session.id()
      const kept = await $io.get(`baseline:${sessionId}`)
      baseline = typeof kept?.spend === 'number' ? kept.spend : undefined
      showStatus($io)
      void refresh($io)
      void prune($io).catch(() => {})
      $io.every(POLL_MS, () => void refresh($io))
    }
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (conn && io && e.agentId === undefined) {
      const cacheWrite = e.usage?.cache_creation_input_tokens ?? 0
      io.after(0, () => void afterTurn(cacheWrite))
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (!isBlocking || !conn || !snap || (e.origin.kind !== 'composer' && e.origin.kind !== 'bridge')) return next(e)
    const over = overScopes()
    if (over.length === 0 || (await $.store.get(`unlock:${snap.date}`)) !== undefined) return next(e)
    const names = over.map(s => SCOPE_NAMES[s]).join(', ')
    return { drop: `🔒 Fukarléc: elfogyott a ${names} keret. Ha mégis kell: /fukarlec engedd (ma éjfélig, UTC, feloldja).` }
  }).catch(($, e, next) => next(e)) // a cost monitor fails open

  on('command.run', { command: 'fukarlec' }, async ($, e) => {
    const $io = io
    if (!conn || !$io) {
      return {
        text: 'Fukarléc: ez a session nem LiteLLM proxyn fut (nincs ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN), nincs mit figyelni.',
      }
    }
    const arg = e.args.trim().toLowerCase()

    if (arg === 'help' || arg === '?') {
      return {
        text: [
          '/fukarlec            – e havi riport',
          '/fukarlec <N>        – az utolsó N nap',
          '/fukarlec frissít    – adatok újratöltése',
          '/fukarlec engedd     – keret feletti blokk feloldása mára',
          '',
          `Keretek: session ${money(budgets.session)}, napi ${money(budgets.daily)}, havi ${money(budgets.monthly)} · mód: ${isBlocking ? 'block' : 'warn'} (/config → fukarlec)`,
        ].join('\n'),
      }
    }

    if (arg === 'engedd') {
      const now = await $.clock.now()
      await $.store.set(`unlock:${utcDate(now)}`, { at: now })
      return { text: '🔓 Rendben, mára feloldva. Fukar bácsi csendben szenved.' }
    }

    const s = await refresh($io, true)
    if (!s) return { text: `Fukarléc: a LiteLLM nem válaszol (${lastError ?? 'ismeretlen hiba'}).` }

    if (arg === 'frissít' || arg === 'frissit' || arg === 'refresh') {
      return { text: statusLine(spendOf(s), budgets, isFun, false) }
    }

    const fetch = $io.fetch
    const days = /^\d+$/.test(arg) ? Math.min(92, Math.max(1, Number(arg))) : 0
    const start = days > 0 ? addDays(s.date, -(days - 1)) : `${s.date.slice(0, 7)}-01`
    const activity = days > 0 ? await fetchActivity(fetch, conn, start, s.date) : s.activity
    const history = budgets.daily > 0 ? await fetchActivity(fetch, conn, addDays(s.date, -60), s.date) : undefined

    return {
      text: report({
        title: days > 0 ? `🪙 Fukarléc – utolsó ${days} nap (${start} → ${s.date}, UTC)` : `🪙 Fukarléc – ${s.date.slice(0, 7)}`,
        activity,
        spend: spendOf(s),
        budgets,
        todayDate: s.date,
        fun: isFun,
        hufRate,
        streakDays: history ? streak(history.days, s.date, budgets.daily) : 0,
      }),
    }
  })
}
