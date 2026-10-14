import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { addMetrics, emptyMetrics, fetchActivity, fetchKeySpend, makeConn } from './litellm'
import type { Activity, Conn, Day, Fetch, Metrics } from './litellm'
import {
  addDays,
  colorDotRasterCells,
  gaugeRasterCells,
  inKind,
  MODEL_COLORS,
  modelBarRasterCells,
  money,
  mood,
  overQuip,
  ratios,
  report,
  SCOPE_NAMES,
  sparklineRasterCells,
  statusLine,
  streak,
  tips,
  turnQuip,
  utcDate,
  warnQuip,
  worst,
} from './format'
import type { Budgets, Scope, Spend } from './format'
import type { SnapshotState, TurnCost } from '../types'
import { BACSI_COLUMNS, BACSI_ROWS, bacsiMood, bacsiRasterCells, bacsiSays } from './bacsi'

const POLL_MS = 5 * 60_000
const MIN_REFRESH_MS = 10_000
const TIP_EVERY_MS = 30 * 60_000
const KEEP_MS = 40 * 86_400_000
const PANE_ID = 'fukarlec-dashboard'
const TURN_DISPLAY_MS = 8_000

type Snapshot = { at: number; keySpend: number; today: Day | undefined; activity: Activity; date: string }
type Stamped = { at: number; [k: string]: unknown }

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

const snapshotAtom = atom({ plugin: 'fukarlec', key: 'snapshot' } as const, null as SnapshotState | null)
const lastTurnAtom = atom({ plugin: 'fukarlec', key: 'lastTurn' } as const, null as TurnCost | null)
const bandHiddenAtom = atom({ plugin: 'fukarlec', key: 'bandHidden' } as const, false)

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

  function showStatus($io: Io) {
    if (!conn) return $io.status(undefined)
    if (!snap) return $io.status(lastError ? `🪙 ⚠︎ ${lastError}` : '🪙 …')
    $io.status(statusLine(spendOf(snap), budgets, isFun, lastError !== undefined))
  }

  async function load($io: Io): Promise<Snapshot> {
    const now = await $io.now()
    const date = utcDate(now)
    const fetch = $io.fetch
    const [keySpend, activity] = await Promise.all([
      fetchKeySpend(fetch, conn!),
      fetchActivity(fetch, conn!, `${date.slice(0, 7)}-01`, date),
    ])
    return { at: now, keySpend, activity, date, today: activity.days.find(d => d.date === date) }
  }

  async function refresh($io: Io, force = false): Promise<Snapshot | undefined> {
    if (!conn) return undefined
    if (inflight && !force) return inflight
    if (inflight) await inflight
    if (snap && !force && (await $io.now()) - snap.at < MIN_REFRESH_MS) return snap
    inflight = (async () => {
      try {
        snap = await load($io)
        lastError = undefined
        if (baseline === undefined) {
          baseline = snap.keySpend
          await $io.set(`baseline:${sessionId}`, { at: snap.at, spend: baseline })
        }
        await checkBudgets($io, snap)
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        $io.debug(`fukarlec: ${lastError}`)
      } finally {
        inflight = undefined
        showStatus($io)
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

  async function checkBudgets($io: Io, s: Snapshot) {
    const spend = spendOf(s)
    const spentBy: Record<Scope, number> = { session: spend.session, daily: spend.today, monthly: spend.month }
    for (const [scope, ratio] of Object.entries(ratios(spend, budgets)) as [Scope, number][]) {
      const level = ratio >= 1 ? 2 : ratio >= 0.8 ? 1 : 0
      if (level === 0) continue
      const key = `warned:${scope}:${periodOf(scope, s)}`
      const told = Number((await $io.get(key))?.level ?? 0)
      if (level <= told) continue
      await $io.set(key, { at: s.at, level })
      if (level === 1) {
        $io.toast(isFun ? warnQuip(scope, ratio, s.at) : `fukarléc: ${SCOPE_NAMES[scope]} keret ${Math.round(ratio * 100)}%`, 8000)
      } else {
        const text = isFun
          ? overQuip(scope, spentBy[scope], budgets[scope], hufRate, s.at)
          : `fukarléc: ${SCOPE_NAMES[scope]} keret túllépve (${money(spentBy[scope])}/${money(budgets[scope])})`
        $io.toast(text, 12_000)
        $io.notify(text)
        if (isBlocking) $io.toast('🔒 Új prompt csak /fukarlec engedd után.', 12_000)
      }
    }
  }

  function paneTipFromActivity(activity: Activity, today: Day | undefined, _b: Budgets): string | undefined {
    const t = activity.total
    if (!today) return undefined
    const m = today.metrics
    const todayModels = Object.entries(today.models).filter(([, mm]) => mm.spend > 0.1)
    const opus = todayModels.find(([n]) => /opus/i.test(n))
    if (opus && m.spend > 0 && opus[1].spend / m.spend > 0.7) {
      const pct = Math.round((opus[1].spend / m.spend) * 100)
      return `🧠 Ma ${pct}% Opus. Rutinmunkára /model sonnet olcsóbb.`
    }
    const input = m.promptTokens
    if (input > 500_000 && m.cacheRead / input < 0.7) {
      return `🧊 Cache hit ma ${Math.round((m.cacheRead / input) * 100)}%. Modellváltás és /clear rontja.`
    }
    if (m.completionTokens > 0 && m.promptTokens / m.completionTokens > 15) {
      return '📐 Hosszú context, kevés output — /compact csökkenti a prompt tokent.'
    }
    if (todayModels.length > 3) {
      return `🔀 Ma ${todayModels.length} modellt használtál. Modellváltás cache-t invalidál.`
    }
    if (t.cacheSaved > 0) {
      return `🦸 A cache eddig ${money(t.cacheSaved)}-t spórolt — ${Math.round(t.cacheSaved / (t.spend + t.cacheSaved) * 100)}% megtakarítás.`
    }
    return '💡 /compact a session közepén: kisebb context = kevesebb token/kör.'
  }

  function overScopes(): Scope[] {
    if (!snap) return []
    return (Object.entries(ratios(spendOf(snap), budgets)) as [Scope, number][]).filter(([, r]) => r >= 1).map(([s]) => s)
  }

  async function prune($io: Io) {
    const now = await $io.now()
    for (const key of await $io.keys()) {
      const value = await $io.get(key)
      if (typeof value?.at === 'number' && now - value.at > KEEP_MS) await $io.del(key)
    }
  }

  // --- session.start -----------------------------------------------------------

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
      description: 'LiteLLM költségriport: /fukarlec [hó | <napok száma> | frissít | engedd | panel]',
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
      void refresh($io).then(s => {
        if (s) {
          void update($, snapshotAtom, () => ({
            spend: spendOf(s),
            activity: s.activity,
            date: s.date,
            stale: false,
          }))
        }
      })
      void prune($io).catch(() => {})
      $io.every(POLL_MS, () => {
        void refresh($io).then(s => {
          if (s) {
            void update($, snapshotAtom, () => ({
              spend: spendOf(s),
              activity: s.activity,
              date: s.date,
              stale: lastError !== undefined,
            }))
          }
        })
      })
    }
    return next(e)
  })

  // --- turn.complete -----------------------------------------------------------

  on('turn.complete', async ($, e, next) => {
    if (conn && io && e.agentId === undefined) {
      const $io = io
      const cacheWrite = e.usage?.cache_creation_input_tokens ?? 0
      $io.after(0, () => {
        const before = snap?.keySpend
        void refresh($io, true).then(async s => {
          if (!s) return
          await update($, snapshotAtom, () => ({
            spend: spendOf(s),
            activity: s.activity,
            date: s.date,
            stale: lastError !== undefined,
          }))
          if (before !== undefined && expensiveTurn > 0 && s.keySpend - before >= expensiveTurn) {
            $io.toast(turnQuip(s.keySpend - before, hufRate, isFun), 8000)
            await update($, lastTurnAtom, () => ({
              cost: s.keySpend - before,
              inputTokens: 0,
              outputTokens: 0,
              at: s.at,
            }))
            $io.after(TURN_DISPLAY_MS, () => void update($, lastTurnAtom, () => null))
          }
          if (s.at - lastTipAt < TIP_EVERY_MS) return
          const tip = tips(s.today, cacheWrite).find(t => !shownTips.has(`${s.date}:${t.slice(0, 2)}`))
          if (!tip) return
          shownTips.add(`${s.date}:${tip.slice(0, 2)}`)
          lastTipAt = s.at
          $io.toast(isFun ? tip : tip.replace(/^\S+\s/, 'Tipp: '), 15_000)
        })
      })
    }
    return next(e)
  })

  // --- prompt.submit (budget gate) ---------------------------------------------

  on('prompt.submit', async ($, e, next) => {
    if (!isBlocking || !conn || !snap || (e.origin.kind !== 'composer' && e.origin.kind !== 'bridge')) return next(e)
    const over = overScopes()
    if (over.length === 0 || (await $.store.get(`unlock:${snap.date}`)) !== undefined) return next(e)
    const names = over.map(s => SCOPE_NAMES[s]).join(', ')
    return { drop: `🔒 Fukarléc: elfogyott a ${names} keret. Ha mégis kell: /fukarlec engedd (ma éjfélig, UTC, feloldja).` }
  }).catch(($, e, next) => next(e))

  // --- /fukarlec command -------------------------------------------------------

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
          '/fukarlec panel      – költség-dashboard megnyitása',
          '',
          `Keretek: session ${money(budgets.session)}, napi ${money(budgets.daily)}, havi ${money(budgets.monthly)} · mód: ${isBlocking ? 'block' : 'warn'} (/config → fukarlec)`,
        ].join('\n'),
      }
    }

    if (arg === 'panel' || arg === 'pane' || arg === 'dashboard') {
      await $.ui.open({ id: PANE_ID, title: '🪙 Fukarléc' })
      return { text: 'Dashboard panel megnyitva.' }
    }

    if (arg === 'engedd') {
      const now = await $.clock.now()
      await $.store.set(`unlock:${utcDate(now)}`, { at: now })
      return { text: '🔓 Rendben, mára feloldva. Fukar bácsi csendben szenved.' }
    }

    const s = await refresh($io, true)
    if (!s) return { text: `Fukarléc: a LiteLLM nem válaszol (${lastError ?? 'ismeretlen hiba'}).` }

    await update($, snapshotAtom, () => ({
      spend: spendOf(s),
      activity: s.activity,
      date: s.date,
      stale: false,
    }))

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

  // --- Pane dashboard ----------------------------------------------------------

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e, next) => {
    if (e.surface !== 'terminal') return next(e) // Raster is a terminal element
    const state = await read($, snapshotAtom)
    const { Box, Text, Raster } = $.ui.resolve(e)
    const paneCols = e.props.bodyColumns ?? 40

    if (!state) {
      return (
        <Box flexDirection="column">
          <Text dimColor>{conn ? '🪙 Betöltés...' : '🪙 Nincs LiteLLM kapcsolat'}</Text>
        </Box>
      )
    }

    const { spend, activity, date } = state
    const gaugeWidth = Math.min(30, Math.max(10, paneCols - 16))
    const w = worst(spend, budgets)
    const moodEmoji = isFun && w ? mood(w.ratio) : ''

    const scopes: { label: string; spent: number; budget: number }[] = [
      { label: 'Session', spent: spend.session, budget: budgets.session },
      { label: 'Ma     ', spent: spend.today, budget: budgets.daily },
      { label: 'Hónap  ', spent: spend.month, budget: budgets.monthly },
    ]

    const models = new Map<string, Metrics>()
    for (const d of activity.days) {
      for (const [name, m] of Object.entries(d.models)) models.set(name, addMetrics(models.get(name) ?? emptyMetrics(), m))
    }
    const allModels = [...models].sort((a, b) => b[1].spend - a[1].spend)
    const totalSpend = activity.total.spend

    const sparkDays = activity.days.slice(-14)
    const sparkValues = sparkDays.map(d => d.metrics.spend)
    const colsPerDay = sparkValues.length > 0 ? Math.max(2, Math.floor((paneCols - 2) / sparkValues.length)) : 2
    const sparkCols = Math.min(paneCols - 2, sparkValues.length * colsPerDay)
    const sparkRows = 7

    const modelShares = allModels.map(([, m], i) => ({
      ratio: totalSpend > 0 ? m.spend / totalSpend : 0,
      color: MODEL_COLORS[i % MODEL_COLORS.length]!,
    }))
    const modelBarWidth = Math.min(paneCols - 4, Math.max(10, paneCols - 4))

    const cacheHit = activity.total.promptTokens > 0
      ? Math.round((activity.total.cacheRead / activity.total.promptTokens) * 100)
      : 0

    const streakDays = budgets.daily > 0 ? streak(activity.days, date, budgets.daily) : 0

    const todayDay = activity.days.find(d => d.date === date)
    const todayTips = todayDay ? tips(todayDay, 0) : []
    const paneTip = todayTips[0] ?? paneTipFromActivity(activity, todayDay, budgets)
    const paneSparkValues: number[] = []
    for (const v of sparkValues) {
      for (let c = 0; c < colsPerDay; c++) paneSparkValues.push(v)
    }

    return (
      <Box flexDirection="column">
        <Text bold>🪙 Fukarléc {moodEmoji} {date}</Text>
        <Text> </Text>


        {scopes.filter(s => s.budget > 0).map(s => {
          const r = s.budget > 0 ? s.spent / s.budget : 0
          return (
            <Box key={`scope-${s.label}`}>
              <Text dimColor>{s.label} </Text>
              <Raster key={`gauge-${s.label}`} columns={gaugeWidth} rows={1} cells={gaugeRasterCells(gaugeWidth, r)} />
              <Text> {money(s.spent)}/{money(s.budget)}</Text>
            </Box>
          )
        })}

        <Text> </Text>
        <Text bold>Utolsó {sparkDays.length} nap</Text>
        {sparkCols > 0 && (
          <Raster
            key="pane-spark"
            columns={sparkCols}
            rows={sparkRows}
            cells={sparklineRasterCells(paneSparkValues, sparkCols, sparkRows, budgets.daily)}
          />
        )}
        {sparkDays.length > 0 && (
          <Text dimColor>
            {sparkDays.map((d, i) => {
              const label = d.date.slice(8)
              const pad = colsPerDay - label.length
              return i < sparkDays.length - 1 ? label + ' '.repeat(Math.max(0, pad)) : label
            }).join('')}
          </Text>
        )}

        <Text> </Text>
        <Text bold>Modellek</Text>
        {modelShares.length > 0 && (
          <Raster key="model-bar" columns={modelBarWidth} rows={1} cells={modelBarRasterCells(modelShares, modelBarWidth)} />
        )}
        {allModels.map(([name, m], i) => {
          const short = name.replace(/^.*\//, '')
          const pct = totalSpend > 0 ? Math.round((m.spend / totalSpend) * 100) : 0
          const dotColor = MODEL_COLORS[i % MODEL_COLORS.length]!
          return (
            <Box key={`model-${i}`}>
              <Raster key={`dot-${i}`} columns={1} rows={1} cells={colorDotRasterCells(dotColor)} />
              <Text dimColor> {short} {money(m.spend)} ({pct}%)</Text>
            </Box>
          )
        })}

        <Text> </Text>
        <Text dimColor>Cache: {cacheHit}% hit, {money(activity.total.cacheSaved)} megtakarítás</Text>
        <Text dimColor>Összesen: {money(totalSpend)} · {activity.total.requests} kérés</Text>

        {isFun && (
          <Box flexDirection="column">
            <Text> </Text>
            <Text>{inKind(totalSpend, hufRate)}</Text>
            {streakDays >= 2 && <Text color="#22c55e">{'🏆'} {streakDays} napja kereten belül!</Text>}
          </Box>
        )}

        {paneTip !== undefined && (
          <Box flexDirection="column">
            <Text> </Text>
            <Text bold>Tipp</Text>
            <Text dimColor>{paneTip}</Text>
          </Box>
        )}
        {isFun && paneCols >= BACSI_COLUMNS + 2 && <Text> </Text>}
        {isFun && paneCols >= BACSI_COLUMNS + 2 && (
          <Box flexDirection="row" alignItems="center" gap={1}>
            <Raster key="bacsi" columns={BACSI_COLUMNS} rows={BACSI_ROWS} cells={bacsiRasterCells(bacsiMood(w?.ratio))} />
            {paneCols >= BACSI_COLUMNS + 24 && (
              <Box borderStyle="round" borderDimColor paddingX={1} flexShrink={1}>
                <Text italic>„{bacsiSays(bacsiMood(w?.ratio), Number(date.slice(8)))}”</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    )
  })

}
