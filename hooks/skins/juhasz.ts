import type { Skin } from '../bacsi'

// Alföldi juhász: kerek fekete kalap, deres lekonyuló bajusz, vállra vetett
// cifraszűr piros-zöld-fekete rátéttel, kampós juhászbot, csizma, lábánál egy racka.
export const juhasz: Skin = {
  id: 'juhasz',
  name: 'Juhász',
  description: 'Cifraszűr, kampósbot és egy hű racka a lábánál.',
  price: 200,
  palette: {
    K: 0x1c1c1c, k: 0x3a3a3a, // kalap, szalag
    S: 0xd99a72, s: 0xb37650, r: 0xd0806e, R: 0xc66a5c, // napbarnított bőr, árnyék, arc, orr
    H: 0x9a9a9a, B: 0x7a7a7a, E: 0x1a1a1a, // deres haj, szemöldök, szem
    W: 0x8c8c8c, w: 0x5e5e5e, // deres bajusz
    Z: 0xece4d0, z: 0xc9bfa6, // szűrposztó
    X: 0xc0282d, Y: 0x2f7d3a, Q: 0x1a1a1a, // rátét: piros, zöld, fekete
    L: 0xf5f2ea, V: 0x262626, o: 0xd8b04a, // ing, mellény, gomb
    G: 0xf5f2ea, g: 0xd3cbb9, // gatya
    C: 0x141414, c: 0x4a4a4a, // csizma
    T: 0x7a5230, t: 0x5a3a20, // juhászbot
    N: 0xe8e2d6, n: 0xbdb5a5, h: 0xb59a6a, // racka gyapja, csavart szarva
    D: 0x6fb7ff, m: 0x9a9a9a, // izzadság, gőz
  },
  rows: [
    '........................',
    '........................',
    '...................TTTT.',
    '..................T...T.',
    '..................t...T.',
    '.........KKKKKK.......T.',
    '........KKKKKKKK......T.',
    '........KkKKKKKK......T.',
    '........kkkkkkkk......T.',
    '....KKKKKKKKKKKKKKKK..T.',
    '.....KKKKKKKKKKKKKK...T.',
    '.......HSSSSSSSSH.....T.',
    '.......SBBSSSSBBS.....T.',
    '.......SSESSSSESS.....T.',
    '.......SrSSRRSSrS.....T.',
    '.....wWWWWWRRWWWWWw...T.',
    '....wWWWWWWWWWWWWWWw..T.',
    '....W.wWWWWWWWWWWw.W..T.',
    '....w..sSSSSSSSSs..w..T.',
    '........sSSSSSSs......T.',
    '.........sSSSSs.......T.',
    '......ZZZZLsSsLZZZZ...T.',
    '....ZZZZZXLLLLXZZZZZ..T.',
    '...ZZZZZZYVLLVYZZZZZZ.T.',
    '...ZZXYZZXVVVVXZZYXZZSTS',
    '...ZZZYZZYVVVVYZZYZZZSTS',
    '..ZZZZZZZXVoVVXZZZZZZ.T.',
    '..ZzZZZZZYVVVVYZZZZzZ.T.',
    '..ZzZZZZZXVoVVXZZZZzZ.T.',
    '..ZzZZZZZYLLLLYZZZZzZ.T.',
    '..ZzZZZZZXGGGGXZZZZzZ.T.',
    '..ZzZZZZZYGGGGYZZZZzZ.T.',
    '..ZzZZZZZXGGGGXZZZZzZ.T.',
    '..ZzZZZZZYGgGGYZZZZzZ.T.',
    '..ZzZZZZZXGgGGXZZZZzZ.T.',
    '..ZzZZZZZYGgGGYZZZZzZ.T.',
    '..XYXQXYXQGgGGQXYXQXYXT.',
    '..QXYXQXYXGgGGXYXQXYXQT.',
    'h..h....GGG...GGG.....T.',
    '.hh.....GCCC...CCC....T.',
    '.QQNNNN..CcC...CcC....T.',
    '.QNNnNNN.CcC...CcC....T.',
    '..NnNNnN.CCCC..CCCC...T.',
    '..Q.Q..Q.CCCC..CCCC..tTt',
  ],
  worried: [
    [11, 7, 'HBBSSSSBBH'], // brows up into the forehead
    [12, 7, 'SSSSSSSSSS'],
    [11, 5, 'D'],
    [12, 5, 'D'],
    [13, 18, 'D'],
  ],
  angry: [
    [12, 7, 'SBSSSSSSBS'], // outer brows high...
    [13, 7, 'SSEBSSBESS'], // ...inner ones pulled down to the eyes
    [3, 5, 'm.m'], // steam off the hat
    [2, 6, 'm'],
    [4, 14, 'm.m'],
    [3, 15, 'm'],
    [40, 1, 'X'], // the racka sees red too
  ],
  angryRecolor: { S: 0xe07a62, r: 0xe07a62, s: 0xb85a48 },
}
