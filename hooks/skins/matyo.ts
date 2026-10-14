import type { Skin } from '../bacsi'

// Mezőkövesdi matyó legény: bokrétás fekete kalap színes szalaggal, fekete bajusz,
// bő ujjú fehér ing hímzett kézelővel, bokáig érő fekete kötény nagy matyó rózsákkal, csizma.
export const matyo: Skin = {
  id: 'matyo',
  name: 'Matyó legény',
  description: 'Bokrétás kalap, rózsás matyó kötény – a legszínesebb fukar.',
  price: 300,
  palette: {
    K: 0x1c1c1c, k: 0x3a3a3a, // kalap
    R: 0xd62839, P: 0xf07aa8, Y: 0xf2c12e, U: 0x2f6fd6, N: 0x2e8b3a, // matyó színek
    S: 0xe0a882, s: 0xbf8460, r: 0xd98a7a, Q: 0xcf7466, // bőr, árnyék, arc, orr
    h: 0x2a2a2a, B: 0x3b2a1e, E: 0x1a1a1a, // haj, szemöldök, szem
    W: 0x2e2018, w: 0x4a3426, // fekete bajusz
    L: 0xf5f2ea, l: 0xd3cbb9, // ing
    A: 0x161616, f: 0x3a3a3a, // kötény, rojt
    C: 0x141414, c: 0x4a4a4a, // csizma
    D: 0x6fb7ff, // izzadságcsepp
    m: 0x9a9a9a, // gőz
  },
  rows: [
    '...........P............',
    '.........YRPRY..........',
    '........NRPYPRN.........',
    '.........NURUN..........',
    '..........NNN...........',
    '........KKKNKKKK........',
    '.......KKKKKKKKKK.......',
    '.......KkKKKKKKKK.......',
    '.......KkKKKKKKKK.......',
    '.......RYPUNRYPUN.......',
    '....KKKKKKKKKKKKKKKK....',
    '.....KKKKKKKKKKKKKK.....',
    '.......hSSSSSSSSh.......',
    '.......SBBSSSSBBS.......',
    '.......SSESSSSESS.......',
    '.......SrSSQSSSrS.......',
    '......wWWWWQQWWWWw......',
    '....wWWWWWWWWWWWWWWw....',
    '.......sSSSSSSSSs.......',
    '........sSSSSSSs........',
    '.........sSSSSs.........',
    '......LLLLsSSsLLLL......',
    '....LLLLLLLLLLLLLLLL....',
    '...LLLLLLLRPPRLLLLLLL...',
    '..LLLLlLLLNYYNLLLlLLLL..',
    '.LLLLLlLAAAAAAAAlLLLLLL.',
    '.LLLLlLAAAAAAAAAALlLLLL.',
    '.LLLLlLAAAARPRAAALlLLLL.',
    'LLLLLlLANARPYPRNALlLLLLL',
    'LLLLlLLAANARPRANALLlLLLL',
    'LLLLlLAUAAANANAAUALlLLLL',
    'RPYPRUAAPRPAAAPRPAURPYPR',
    'NRUYRNARPYPRARPYPRNRYURN',
    '.SSS..AAPRPAYAPRPAA.SSS.',
    '.sSs..AANANAAANANAA.sSs.',
    '......AYAAARPRAAAYA.....',
    '......AAAARPYPRAAAA.....',
    '......AUANARPRANAUA.....',
    '......AAAAANANAAAAA.....',
    '......fAfAfAfAfAfAf.....',
    '......f.f.f.f.f.f.f.....',
    '.......CcC.....CcC......',
    '......CCCC.....CCCC.....',
    '.....CCCCC.....CCCCC....',
  ],
  worried: [
    [12, 7, 'hBBSSSSBBh'], // brows up into the forehead
    [13, 7, 'SSSSSSSSSS'],
    [12, 5, 'D'],
    [13, 5, 'D'],
    [15, 18, 'D'],
  ],
  angry: [
    [13, 7, 'SBSSSSSSBS'],
    [14, 7, 'SSEBSSBESS'],
    [4, 3, 'm.m'], // steam
    [3, 4, 'm'],
    [4, 18, 'm.m'],
    [3, 19, 'm'],
    [1, 9, '.Y.Y.'], // the bokréta shakes loose
  ],
  angryRecolor: { S: 0xe07a62, r: 0xe07a62, s: 0xb85a48 },
}
