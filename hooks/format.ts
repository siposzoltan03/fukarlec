import { addMetrics, emptyMetrics } from './litellm'
import type { Activity, Day, Metrics } from './litellm'

export type Budgets = { session: number; daily: number; monthly: number }

export type Spend = { session: number; today: number; month: number }

export type Scope = keyof Budgets

export const SCOPE_NAMES: Record<Scope, string> = { session: 'session', daily: 'napi', monthly: 'havi' }

export function money(usd: number): string {
  if (usd >= 100) return `$${Math.round(usd)}`
  return `$${usd.toFixed(2)}`
}

export function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  return utcDate(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
}

/** Each scope's spend as a fraction of its budget; scopes without a budget are left out. */
export function ratios(spend: Spend, budgets: Budgets): Partial<Record<Scope, number>> {
  const out: Partial<Record<Scope, number>> = {}
  if (budgets.session > 0) out.session = spend.session / budgets.session
  if (budgets.daily > 0) out.daily = spend.today / budgets.daily
  if (budgets.monthly > 0) out.monthly = spend.month / budgets.monthly
  return out
}

export function worst(spend: Spend, budgets: Budgets): { scope: Scope; ratio: number } | undefined {
  let found: { scope: Scope; ratio: number } | undefined
  for (const [scope, ratio] of Object.entries(ratios(spend, budgets)) as [Scope, number][]) {
    if (!found || ratio > found.ratio) found = { scope, ratio }
  }
  return found
}

export function mood(ratio: number): string {
  if (ratio < 0.5) return '😇'
  if (ratio < 0.75) return '🙂'
  if (ratio < 0.9) return '😬'
  if (ratio < 1) return '🥵'
  if (ratio < 1.5) return '🔥'
  return '💀'
}

const part = (label: string, spent: number, budget: number) =>
  budget > 0 ? `${label} ${money(spent)}/${money(budget)}` : `${label} ${money(spent)}`

export function statusLine(spend: Spend, budgets: Budgets, fun: boolean, stale: boolean): string {
  const w = worst(spend, budgets)
  const head = fun ? `🪙 ${w ? mood(w.ratio) : '😇'}` : 'fukarléc'
  const parts = [
    part('session ~', spend.session, budgets.session).replace('~ ', '~'),
    part('ma', spend.today, budgets.daily),
    part('hó', spend.month, budgets.monthly),
  ]
  return `${head} ${parts.join(' · ')}${stale ? ' ⚠︎ régi adat' : ''}`
}

// --- Fukar bácsi -----------------------------------------------------------

const THINGS: { name: string; huf: number; emoji: string }[] = [
  { name: 'Túró Rudi', huf: 250, emoji: '🍫' },
  { name: 'BKK-jegy', huf: 500, emoji: '🚋' },
  { name: 'korsó sör', huf: 1100, emoji: '🍺' },
  { name: 'lángos', huf: 1400, emoji: '🫓' },
  { name: 'kürtőskalács', huf: 2500, emoji: '🥐' },
  { name: 'havi BKK-bérlet', huf: 8950, emoji: '🎫' },
  { name: 'Balaton-parti hétvége', huf: 150_000, emoji: '🏖️' },
  { name: 'használt Suzuki Swift', huf: 2_000_000, emoji: '🚗' },
]

/** "≈ 3 lángos 🫓": the dearest thing the amount still buys at least one of. */
export function inKind(usd: number, hufRate: number): string {
  const huf = usd * hufRate
  const thing = [...THINGS].reverse().find(t => huf >= t.huf) ?? THINGS[0]!
  const count = huf / thing.huf
  const shown = count >= 10 ? String(Math.round(count)) : count >= 1 ? count.toFixed(1).replace(/\.0$/, '') : count.toFixed(2)
  return `≈ ${shown} ${thing.name} ${thing.emoji}`
}

function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(Math.floor(seed)) % list.length]!
}

export function warnQuip(scope: Scope, ratio: number, seed: number): string {
  const pct = Math.round(ratio * 100)
  const name = SCOPE_NAMES[scope]
  return pick(
    [
      `🧐 Lassan a testtel! A ${name} keret ${pct}%-a elment.`,
      `🤨 Fukar bácsi szemöldöke felszaladt: ${name} keret ${pct}%.`,
      `🪙 Számolj csak utána: a ${name} keretből ${pct}% már a LiteLLM-é.`,
    ],
    seed,
  )
}

export function overQuip(scope: Scope, spent: number, budget: number, hufRate: number, seed: number): string {
  const name = SCOPE_NAMES[scope]
  return pick(
    [
      `💀 Elfogyott a ${name} keret (${money(spent)}/${money(budget)}). Ennyiből: ${inKind(spent, hufRate)}`,
      `🔥 A ${name} keret ég! ${money(spent)} – a nagymamád ezt nem hagyná szó nélkül.`,
      `🚨 ${name} keret túllépve: ${money(spent)}/${money(budget)}. Fukar bácsi a szívéhez kap.`,
    ],
    seed,
  )
}

export function turnQuip(cost: number, hufRate: number, fun: boolean): string {
  if (!fun) return `Drága kör: +${money(cost)}`
  return `💸 Ez a kör +${money(cost)} volt (${inKind(cost, hufRate)}). Megérte?`
}

// --- Spórolási tippek -------------------------------------------------------

const perMTok = (m: Metrics) => {
  const tokens = m.promptTokens + m.completionTokens
  return tokens > 0 ? (m.spend / tokens) * 1e6 : 0
}

const shortModel = (name: string) => name.replace(/^.*\//, '')

/** Advice read off today's real LiteLLM numbers; each tip names the numbers it rests on. */
export function tips(today: Day | undefined, turnCacheWrite: number): string[] {
  const out: string[] = []
  if (turnCacheWrite > 150_000) {
    out.push(
      `♻️ Ez a kör ${Math.round(turnCacheWrite / 1000)}k token cache-t írt újra (modellváltás vagy 5+ perc szünet után ez jár). Hosszú szünet előtt /compact, és ne válts modellt session közben.`,
    )
  }
  if (!today) return out
  const m = today.metrics
  const input = m.promptTokens
  if (input > 2_000_000 && m.cacheRead / input < 0.6) {
    out.push(
      `🧊 Ma a bemenő tokenek csak ${Math.round((m.cacheRead / input) * 100)}%-a jött cache-ből. Sok rövid session vagy gyakori /clear + modellváltás rontja.`,
    )
  }
  const models = Object.entries(today.models).filter(([, mm]) => mm.spend > 0.5)
  const opus = models.find(([n]) => /opus/i.test(n))
  const cheaper = models.find(([n]) => /sonnet/i.test(n)) ?? models.find(([n]) => /haiku/i.test(n))
  if (opus && m.spend > 0 && opus[1].spend / m.spend > 0.8) {
    const ratio = cheaper && perMTok(cheaper[1]) > 0 ? perMTok(opus[1]) / perMTok(cheaper[1]) : 0
    out.push(
      `🧠 A mai költés ${Math.round((opus[1].spend / m.spend) * 100)}%-a ${shortModel(opus[0])}.` +
        (ratio > 1.2 ? ` Tokenre vetítve ${ratio.toFixed(1)}x drágább volt, mint a ${shortModel(cheaper![0])}.` : '') +
        ` Rutinmunkára (refaktor, tesztek, keresés) próbáld a /model sonnet-et.`,
    )
  }
  return out
}

// --- Riport -----------------------------------------------------------------

const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length))
const lpad = (s: string, n: number) => (s.length >= n ? s : ' '.repeat(n - s.length) + s)

function bar(value: number, max: number, width = 20): string {
  const n = max > 0 ? Math.round((value / max) * width) : 0
  return '█'.repeat(n) + '·'.repeat(width - n)
}

/** Consecutive days up to yesterday whose spend stayed within the daily budget. */
export function streak(days: Day[], todayDate: string, dailyBudget: number): number {
  if (dailyBudget <= 0) return 0
  const byDate = new Map(days.map(d => [d.date, d.metrics.spend]))
  let n = 0
  let date = addDays(todayDate, -1)
  const first = days[0]?.date
  while (first && date >= first && (byDate.get(date) ?? 0) <= dailyBudget) {
    n++
    date = addDays(date, -1)
  }
  return n
}

export function report(opts: {
  title: string
  activity: Activity
  spend: Spend
  budgets: Budgets
  todayDate: string
  fun: boolean
  hufRate: number
  streakDays: number
}): string {
  const { activity, budgets, fun, hufRate } = opts
  const lines: string[] = [opts.title, '']

  const max = Math.max(0, ...activity.days.map(d => d.metrics.spend))
  for (const d of activity.days) {
    const over = budgets.daily > 0 && d.metrics.spend > budgets.daily
    lines.push(
      `${d.date}  ${lpad(money(d.metrics.spend), 7)}  ${bar(d.metrics.spend, max)}${over ? (fun ? ' 🔥' : ' !') : ''}`,
    )
  }
  if (activity.days.length === 0) lines.push('(nincs költés ebben az időszakban)')

  const models = new Map<string, Metrics>()
  for (const d of activity.days) {
    for (const [name, m] of Object.entries(d.models)) models.set(name, addMetrics(models.get(name) ?? emptyMetrics(), m))
  }
  const total = activity.total
  if (models.size > 0) {
    lines.push('', 'Modellenként:')
    for (const [name, m] of [...models].sort((a, b) => b[1].spend - a[1].spend)) {
      const share = total.spend > 0 ? Math.round((m.spend / total.spend) * 100) : 0
      lines.push(
        `  ${pad(shortModel(name), 22)} ${lpad(money(m.spend), 7)}  ${lpad(String(share), 3)}%  ${lpad(perMTok(m).toFixed(2), 6)} $/MTok  ${m.requests} kérés`,
      )
    }
  }

  lines.push('', `Összesen: ${money(total.spend)} · ${total.requests} kérés`)
  if (total.promptTokens > 0) {
    lines.push(
      `Cache: ${Math.round((total.cacheRead / total.promptTokens) * 100)}% találat, ${money(total.cacheSaved)} megtakarítás${fun ? ' 🦸' : ''}`,
    )
  }
  lines.push(
    `Most: ${statusLine(opts.spend, budgets, fun, false)}`,
  )
  if (fun) {
    lines.push(`Ennyiből: ${inKind(total.spend, hufRate)}`)
    if (opts.streakDays >= 2) lines.push(`🏆 ${opts.streakDays} napja a napi kereten belül vagy – Fukar bácsi büszke!`)
  }
  return lines.join('\n')
}

// --- Raster helpers ----------------------------------------------------------

const DEFAULT_BG = 0x01000000

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return (r << 16) | (g << 8) | bl
}

export function ratioColor(ratio: number): number {
  if (ratio < 0.5) return 0x22c55e // green
  if (ratio < 0.8) return lerpColor(0x22c55e, 0xeab308, (ratio - 0.5) / 0.3) // green→yellow
  if (ratio < 1.0) return lerpColor(0xeab308, 0xef4444, (ratio - 0.8) / 0.2) // yellow→red
  return 0xef4444 // red
}

/** Build base64 Raster cells for a horizontal gauge bar. */
export function gaugeRasterCells(width: number, ratio: number): string {
  const filled = Math.min(width, Math.round(ratio * width))
  const fg = ratioColor(ratio)
  const words = new Uint32Array(width * 3)
  for (let i = 0; i < width; i++) {
    const base = i * 3
    words[base] = i < filled ? 0x2588 : 0x2591 // █ or ░
    words[base + 1] = i < filled ? fg : 0x555555
    words[base + 2] = DEFAULT_BG
  }
  return uint32ToBase64(words)
}

/** Build base64 Raster cells for a sparkline (columns × rows). */
export function sparklineRasterCells(values: number[], cols: number, rows: number, budget: number): string {
  const max = Math.max(budget, ...values)
  const words = new Uint32Array(cols * rows * 3)
  for (let col = 0; col < cols; col++) {
    const v = col < values.length ? values[col]! : 0
    const height = max > 0 ? Math.round((v / max) * rows) : 0
    const over = budget > 0 && v > budget
    const fg = over ? 0xef4444 : 0x3b82f6
    for (let row = 0; row < rows; row++) {
      const base = (row * cols + col) * 3
      const fromBottom = rows - 1 - row
      if (fromBottom < height) {
        words[base] = 0x2588 // █
        words[base + 1] = fg
      } else {
        words[base] = 0x20 // space
        words[base + 1] = DEFAULT_BG
      }
      words[base + 2] = DEFAULT_BG
    }
  }
  return uint32ToBase64(words)
}

/** Build base64 Raster cells for a model share bar (stacked horizontal). */
export function modelBarRasterCells(shares: { ratio: number; color: number }[], width: number): string {
  const words = new Uint32Array(width * 3)
  let col = 0
  for (const s of shares) {
    const end = Math.min(width, col + Math.max(1, Math.round(s.ratio * width)))
    for (; col < end && col < width; col++) {
      const base = col * 3
      words[base] = 0x2588
      words[base + 1] = s.color
      words[base + 2] = DEFAULT_BG
    }
  }
  for (; col < width; col++) {
    const base = col * 3
    words[base] = 0x2591
    words[base + 1] = 0x555555
    words[base + 2] = DEFAULT_BG
  }
  return uint32ToBase64(words)
}

export const MODEL_COLORS = [0x3b82f6, 0xa855f7, 0x22c55e, 0xf97316, 0xeab308, 0x06b6d4]

function uint32ToBase64(arr: Uint32Array): string {
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}
