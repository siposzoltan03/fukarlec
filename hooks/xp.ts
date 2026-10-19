import { QUEST_XP, questFor } from './advice'
import { addDays } from './format'
import type { Day } from './litellm'

// XP ("garas") for thrift: every closed UTC day with spend that stayed within the
// daily budget earns garas, read off LiteLLM's own daily numbers. A credited day is
// frozen in the ledger, so raising the budget later does not pay out the past again.
// Garas are spent in the shop on skins and message packs.

export type Ledger = {
  /** The first day that may earn garas. */
  since: string
  /** Each credited day's garas; 0 for an active day over budget (it breaks the streak). */
  days: Record<string, number>
  /** Bonus garas for the day's quest, by day. */
  quests: Record<string, number>
  /** Garas spent in the shop. */
  spent: number
  /** What was bought: `skin:<id>` and `pack:<id>`. */
  owned: string[]
  skin: string
  pack: string
  /** Not `at`: the store's pruning drops values whose `at` is old. */
  updatedAt: number
}

export const XP_BASE = 10
export const XP_THRIFT_MAX = 10
export const XP_STREAK_STEP = 2
export const XP_STREAK_CAP = 5

/** Days before the first run that still count, as a welcome. */
const WELCOME_DAYS = 7

export function newLedger(today: string, now: number): Ledger {
  return { since: addDays(today, -WELCOME_DAYS), days: {}, quests: {}, spent: 0, owned: [], skin: 'paraszt', pack: 'paraszt', updatedAt: now }
}

/** Reads back whatever the store held, filling what an older version did not write. */
export function asLedger(value: unknown, today: string, now: number): Ledger {
  const fresh = newLedger(today, now)
  if (!value || typeof value !== 'object') return fresh
  const v = value as Partial<Ledger>
  return {
    since: typeof v.since === 'string' ? v.since : fresh.since,
    days: v.days && typeof v.days === 'object' ? { ...v.days } : {},
    quests: v.quests && typeof v.quests === 'object' ? { ...v.quests } : {},
    spent: typeof v.spent === 'number' ? v.spent : 0,
    owned: Array.isArray(v.owned) ? [...v.owned] : [],
    skin: typeof v.skin === 'string' ? v.skin : 'paraszt',
    pack: typeof v.pack === 'string' ? v.pack : 'paraszt',
    updatedAt: now,
  }
}

/** Garas for one day: a base, up to 10 more for what stayed unspent, and a streak bonus. */
export function dayXp(spend: number, budget: number, streakBefore: number): number {
  if (budget <= 0 || spend <= 0 || spend > budget) return 0
  const thrift = Math.round(XP_THRIFT_MAX * (1 - spend / budget))
  return XP_BASE + thrift + Math.min(streakBefore, XP_STREAK_CAP) * XP_STREAK_STEP
}

/** Consecutive credited days with garas before `date`; idle days are skipped, a day over budget ends it. */
export function streakBefore(ledger: Ledger, date: string): number {
  let n = 0
  for (const d of Object.keys(ledger.days).filter(d => d < date).sort().reverse()) {
    if (ledger.days[d]! <= 0) break
    n++
  }
  return n
}

/** The first day not yet credited: where to start fetching activity from. */
export function creditFrom(ledger: Ledger): string {
  const credited = Object.keys(ledger.days).sort()
  const last = credited[credited.length - 1]
  return last && last >= ledger.since ? addDays(last, 1) : ledger.since
}

/** Credits every closed day of `days` (before `today`) not yet in the ledger. */
export function credit(
  ledger: Ledger,
  days: readonly Day[],
  today: string,
  budget: number,
): { ledger: Ledger; gained: number; credited: string[]; quests: string[] } {
  const next: Ledger = { ...ledger, days: { ...ledger.days }, quests: { ...ledger.quests } }
  const credited: string[] = []
  const quests: string[] = []
  let gained = 0
  if (budget <= 0) return { ledger: next, gained, credited, quests }
  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    if (day.date >= today || day.date < next.since || next.days[day.date] !== undefined) continue
    if (day.metrics.spend <= 0) continue
    const xp = dayXp(day.metrics.spend, budget, streakBefore(next, day.date))
    next.days[day.date] = xp
    credited.push(day.date)
    gained += xp
    // The quest pays only on a day that stayed within budget.
    if (xp > 0 && questFor(day.date).done(day, budget)) {
      next.quests[day.date] = QUEST_XP
      quests.push(day.date)
      gained += QUEST_XP
    }
  }
  return { ledger: next, gained, credited, quests }
}

export function earned(ledger: Ledger): number {
  const sum = (r: Record<string, number>) => Object.values(r).reduce((n, xp) => n + xp, 0)
  return sum(ledger.days) + sum(ledger.quests)
}

export function balance(ledger: Ledger): number {
  return earned(ledger) - ledger.spent
}

export const RANKS: readonly { name: string; at: number; emoji: string }[] = [
  { name: 'Napszámos', at: 0, emoji: '🧺' },
  { name: 'Zsellér', at: 50, emoji: '🌱' },
  { name: 'Béres', at: 150, emoji: '🐂' },
  { name: 'Gazda', at: 350, emoji: '🌾' },
  { name: 'Nagygazda', at: 700, emoji: '🏡' },
  { name: 'Fukar földesúr', at: 1200, emoji: '🏰' },
]

export function rankOf(totalEarned: number): {
  name: string
  emoji: string
  next: { name: string; at: number } | undefined
  progress: number
} {
  let i = 0
  while (i + 1 < RANKS.length && totalEarned >= RANKS[i + 1]!.at) i++
  const current = RANKS[i]!
  const upcoming = RANKS[i + 1]
  const progress = upcoming ? (totalEarned - current.at) / (upcoming.at - current.at) : 1
  return { name: current.name, emoji: current.emoji, next: upcoming && { name: upcoming.name, at: upcoming.at }, progress }
}

export type ShopItem = { kind: 'skin' | 'pack'; id: string; name: string; description: string; price: number }

export function owns(ledger: Ledger, item: ShopItem): boolean {
  return item.price === 0 || ledger.owned.includes(`${item.kind}:${item.id}`)
}

const wearCommand = (item: ShopItem) => `/fukarlec ${item.kind} ${item.id}`

/** Spends garas on `item` and puts it on; never charges for what you already own. */
export function buy(ledger: Ledger, item: ShopItem): { ledger: Ledger } | { error: string } {
  if (owns(ledger, item)) return { error: `${item.name} már a tiéd. Felvenni: ${wearCommand(item)}` }
  const have = balance(ledger)
  if (have < item.price) return { error: `Ez ${item.price} garas, neked ${have} van. Még ${item.price - have} kell.` }
  const next: Ledger = { ...ledger, owned: [...ledger.owned, `${item.kind}:${item.id}`], spent: ledger.spent + item.price }
  return wear(next, item)
}

/** Puts on an owned `item`; spends nothing. */
export function wear(ledger: Ledger, item: ShopItem): { ledger: Ledger } | { error: string } {
  if (!owns(ledger, item)) return { error: `${item.name} még nincs meg, ${item.price} garas: /fukarlec buy ${item.id}` }
  return { ledger: item.kind === 'skin' ? { ...ledger, skin: item.id } : { ...ledger, pack: item.id } }
}

/** `▰▰▰▱▱▱` progress text. */
export function progressBar(ratio: number, width = 12): string {
  const n = Math.max(0, Math.min(width, Math.round(ratio * width)))
  return '▰'.repeat(n) + '▱'.repeat(width - n)
}
