import type { Skin } from '../bacsi'

// Az eredeti Fukar bácsi: árvalányhajas kalap, kunkori bajusz, pipa, bő ujjú ing,
// mellény, kékfestő kötény, rojtos gatya, csizma, bot.
export const paraszt: Skin = {
  id: 'paraszt',
  name: 'Paraszt bácsi',
  description: 'Az eredeti: pipa, mellény, kékfestő kötény.',
  price: 0,
  palette: {
    K: 0x1c1c1c, k: 0x3a3a3a, // kalap, szalag
    f: 0xeee6c8, F: 0xc9bc94, // árvalányhaj
    S: 0xe0a882, s: 0xbf8460, r: 0xd98a7a, R: 0xcf7466, // bőr, árnyék, pirospozsgás arc, orr
    H: 0xb8b8b8, B: 0xd6d6d6, E: 0x1a1a1a, // ősz haj, szemöldök, szem
    W: 0xf2f2f2, w: 0xc4c4c4, // bajusz
    P: 0x5e3418, p: 0x8a5230, m: 0x9a9a9a, // pipa, füst/gőz
    L: 0xf5f2ea, l: 0xd3cbb9, // vászoning
    V: 0x262626, o: 0xd8b04a, // mellény, gomb
    A: 0x24427e, a: 0x8fa9d9, // kékfestő kötény
    G: 0xf5f2ea, g: 0xd3cbb9, // gatya
    C: 0x141414, c: 0x4a4a4a, // csizma
    T: 0x7a5230, // bot
    D: 0x6fb7ff, // izzadságcsepp
  },
  rows: [
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
  ],
  worried: [
    [12, 7, 'HBBSSSSBBH'], // brows up into the forehead
    [13, 7, 'SSSSSSSSSS'],
    [12, 5, 'D'],
    [13, 5, 'D'],
    [14, 18, 'D'],
  ],
  angry: [
    [13, 7, 'SBSSSSSSBS'], // outer brows high...
    [14, 7, 'SSEBSSBESS'], // ...inner ones pulled down to the eyes
    [18, 21, '..'], // no time for the pipe
    [19, 16, '......'],
    [20, 18, '..'],
    [4, 2, 'm.m'], // steam off the hat
    [3, 3, 'm'],
    [4, 19, 'm.m'],
    [3, 20, 'm'],
  ],
  angryRecolor: { S: 0xe07a62, r: 0xe07a62, s: 0xb85a48 },
}
