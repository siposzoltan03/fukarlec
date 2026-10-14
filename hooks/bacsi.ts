import { uint32ToBase64 } from './format'

// Fukar bácsi: árvalányhajas kalap, kunkori bajusz, pipa, bő ujjú ing, mellény,
// kékfestő kötény, rojtos gatya, csizma, bot. 24×44 pixel; half-block glyphs
// put two pixels in one terminal cell, so he is 24 columns × 22 rows.

export type BacsiMood = 'nyugodt' | 'aggodo' | 'merges'

const DEFAULT = 0x01000000

const PALETTE: Record<string, number> = {
  K: 0x1c1c1c, k: 0x3a3a3a, // kalap, szalag
  f: 0xeee6c8, F: 0xc9bc94, // árvalányhaj
  S: 0xe0a882, s: 0xbf8460, r: 0xd98a7a, R: 0xcf7466, // bőr, árnyék, pirospozsgás arc, orr
  H: 0xb8b8b8, B: 0xd6d6d6, E: 0x1a1a1a, // ősz haj, szemöldök, szem
  W: 0xf2f2f2, w: 0xc4c4c4, // bajusz
  P: 0x5e3418, p: 0x8a5230, m: 0x9a9a9a, // pipa, füst
  L: 0xf5f2ea, l: 0xd3cbb9, // vászoning
  V: 0x262626, o: 0xd8b04a, // mellény, gomb
  A: 0x24427e, a: 0x8fa9d9, // kékfestő kötény
  G: 0xf5f2ea, g: 0xd3cbb9, // gatya
  C: 0x141414, c: 0x4a4a4a, // csizma
  T: 0x7a5230, // bot
  D: 0x6fb7ff, // izzadságcsepp
}

const BASE = [
  '...............f........',
  '..............f.........',
  '.............fF.........',
  '............fF..........',
  '...........fF...........',
  '........KKKFKKKK........',
  '.......KKKKKKKKKK.......',
  '.......KkKKKKKKKK.......',
  '.......KkKKKKKKKK.......',
  '.......kkkkkkkkkk.......',
  '....KKKKKKKKKKKKKKKK....',
  '.....KKKKKKKKKKKKKK.....',
  '.......HSSSSSSSSH.......',
  '.......SBBSSSSBBS.......',
  '.......SSESSSSESS.......',
  '..W....SrSSRSSSrS....W..',
  '..wW..wWWWWRRWWWWw..Ww..',
  '...wWWWWWWWWWWWWWWWWw...',
  '.....wwWWWWWWWWWWww...m.',
  '.......sSSSSSSSSPPpp.m..',
  '........sSSSSSSs..pp....',
  '.........sSSSSs.........',
  '......LLLLsSSsLLLL......',
  '....LLLLLVVLLVVLLLLL....',
  '...LLLLLVVVLLVVVLLLLL...',
  '..LLLLlLVVVoVVVVLlLLLL..',
  '..LLLLlLVVVVVVVVLlLLLL..',
  '.LLLLLlLVVVoVVVVLlLLLLL.',
  '.LLLLlLLVVVVVVVVLLlLLLL.',
  '.LLLLlLAAAAAAAAAALlLLLL.',
  '.LLLlLLAAaAAAaAAALLlLLL.',
  '.TSSS.LAAAAAAAAAAL.SSS..',
  '.TsSs.GAaAAAaAAAaG.sSs..',
  '.T...GGAAAAAAAAAAGG.....',
  '.T..GGGAAaAAAaAAAGGG....',
  '.T..GGgAAAAAAAAAAgGG....',
  '.T.GGGgGAaAAAaAAAGgGGG..',
  '.T.GGgGGGGGlGGGGGGgGG...',
  '.TGGGgGGGGGlGGGGGGGgGG..',
  '.TGlGlGlGl..GlGlGlGlGl..',
  '.T....CCC.....CCC.......',
  '.T....CcC.....CcC.......',
  '.T...CCCC.....CCCC......',
  '.T..CCCCC.....CCCCC.....',
]

export const BACSI_COLUMNS = BASE[0]!.length
export const BACSI_ROWS = BASE.length / 2

function put(rows: string[], y: number, x: number, text: string) {
  const row = rows[y]!
  rows[y] = row.slice(0, x) + text + row.slice(x + text.length)
}

/** The sprite for a mood: worried raises his brows and sweats, angry knits them and goes red. */
export function bacsiPixels(mood: BacsiMood): string[] {
  const rows = [...BASE]
  if (mood === 'aggodo') {
    put(rows, 12, 7, 'HBBSSSSBBH') // brows up into the forehead
    put(rows, 13, 7, 'SSSSSSSSSS')
    put(rows, 12, 5, 'D')
    put(rows, 13, 5, 'D')
    put(rows, 14, 18, 'D')
  }
  if (mood === 'merges') {
    put(rows, 13, 7, 'SBSSSSSSBS') // outer brows high...
    put(rows, 14, 7, 'SSEBSSBESS') // ...inner ones pulled down to the eyes
    put(rows, 18, 21, '..') // no time for the pipe
    put(rows, 19, 16, '......')
    put(rows, 20, 18, '..')
    put(rows, 4, 2, 'm.m') // steam off the hat
    put(rows, 3, 3, 'm')
    put(rows, 4, 19, 'm.m')
    put(rows, 3, 20, 'm')
  }
  return rows
}

function colorAt(rows: string[], mood: BacsiMood, x: number, y: number): number {
  const ch = rows[y]?.[x] ?? '.'
  if (ch === '.') return DEFAULT
  const color = PALETTE[ch] ?? DEFAULT
  if (mood === 'merges' && (ch === 'S' || ch === 's' || ch === 'r')) return ch === 's' ? 0xb85a48 : 0xe07a62
  return color
}

/** Raster cells: `▀` painted with the upper pixel as foreground and the lower one as background. */
export function bacsiRasterCells(mood: BacsiMood): string {
  const rows = bacsiPixels(mood)
  const words = new Uint32Array(BACSI_COLUMNS * BACSI_ROWS * 3)
  for (let cy = 0; cy < BACSI_ROWS; cy++) {
    for (let x = 0; x < BACSI_COLUMNS; x++) {
      const top = colorAt(rows, mood, x, cy * 2)
      const bottom = colorAt(rows, mood, x, cy * 2 + 1)
      const base = (cy * BACSI_COLUMNS + x) * 3
      if (top === DEFAULT && bottom === DEFAULT) words.set([0x20, DEFAULT, DEFAULT], base)
      else if (top === DEFAULT) words.set([0x2584, bottom, DEFAULT], base) // ▄
      else words.set([0x2580, top, bottom], base) // ▀
    }
  }
  return uint32ToBase64(words)
}

export function bacsiMood(ratio: number | undefined): BacsiMood {
  if (ratio === undefined || ratio < 0.75) return 'nyugodt'
  if (ratio < 1) return 'aggodo'
  return 'merges'
}

const SAYINGS: Record<BacsiMood, string[]> = {
  nyugodt: [
    'Így kell ezt, fiam. Garast a garasra!',
    'Szép csendesen, ahogy a Tisza folyik.',
    'Aki a tokent nem becsüli, a dollárt nem érdemli.',
  ],
  aggodo: [
    'Hékás! Fogy a keret, mint nyáron a jég.',
    'Nem lesz ebből jó, ha így megy tovább...',
    'Ennyiért már a szomszéd tehenét is megvehetném.',
  ],
  merges: [
    'Az ántivilágban ennyiből egész tanyát vettünk!',
    'Teringettét! Elfogyott a keret!',
    'Mán megint az Opus? Hát mi vagyok én, Rotschild?',
  ],
}

export function bacsiSays(mood: BacsiMood, seed: number): string {
  const list = SAYINGS[mood]
  return list[Math.abs(Math.floor(seed)) % list.length]!
}
