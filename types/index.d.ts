export type SnapshotState = {
  spend: { session: number; today: number; month: number }
  activity: {
    days: { date: string; metrics: { spend: number; promptTokens: number; completionTokens: number; cacheRead: number; cacheWrite: number; cacheSaved: number; requests: number; failed: number }; models: Record<string, { spend: number; promptTokens: number; completionTokens: number; cacheRead: number; cacheWrite: number; cacheSaved: number; requests: number; failed: number }> }[]
    total: { spend: number; promptTokens: number; completionTokens: number; cacheRead: number; cacheWrite: number; cacheSaved: number; requests: number; failed: number }
  }
  date: string
  stale: boolean
}

export type TurnCost = {
  cost: number
  inputTokens: number
  outputTokens: number
  at: number
}

export type XpView = {
  skin: string
  pack: string
  earned: number
  balance: number
}

export type AdviceView = {
  tips: string[]
  quest: string | null
}

declare module 'claude-code' {
  interface PluginState {
    fukarlec: {
      snapshot: SnapshotState | null
      lastTurn: TurnCost | null
      bandHidden: boolean
      xp: XpView | null
      advice: AdviceView | null
    }
  }
}
