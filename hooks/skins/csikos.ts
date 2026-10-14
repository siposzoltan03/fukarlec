import type { Skin } from '../bacsi'

// Hortobágyi csikós: pörge kalap darutollal, barna kunkori bajusz, kék bő ujjú ing,
// fekete mellény ezüstgombokkal, tüsző, kék bő gatya, csizma sarkantyúval, karikás ostor.
export const csikos: Skin = {
  id: 'csikos',
  name: 'Csikós',
  description: 'Hortobágyi csikós: kék ing, pörge kalap darutollal, karikás ostor.',
  price: 150,
  palette: {
    K: 0x1c1c1c, k: 0x4a3a2a, // pörge kalap, szalag
    f: 0xb8c0c8, F: 0x6f7883, // darutoll
    S: 0xd99a72, s: 0xb07450, r: 0xd0806c, R: 0xc66a5a, // napbarnított bőr, árnyék, arc, orr
    H: 0x3a2a1e, B: 0x7a5a40, E: 0x1a1a1a, // barna haj, szemöldök, szem
    W: 0x4a3322, w: 0x6b4c34, // barna bajusz
    I: 0x2f62b0, i: 0x22487f, // kék ing
    V: 0x1e1e1e, o: 0xc8c8c8, // mellény, ezüstgomb
    b: 0x6b3a1e, // tüsző (széles bőröv)
    G: 0x2b5aa3, g: 0x1f4278, // kék gatya
    C: 0x141414, c: 0x4a4a4a, x: 0xc8c8c8, // csizma, sarkantyú
    h: 0x7a5230, O: 0xc09050, // ostornyél, karikás szíj
    D: 0x6fb7ff, // izzadságcsepp
    m: 0x9a9a9a, // gőz
    Y: 0xffe066, // csattanás
  },
  rows: [
    '..................f.....',
    '.................fF.....',
    '................fF......',
    '...............fF.......',
    '..............fF........',
    '.........KKKKKF.........',
    '........KKKKKKKK........',
    '........KkKKKKKK........',
    '........kkkkkkkk........',
    '....KK..KKKKKKKK..KK....',
    '.....KKKKKKKKKKKKKK.....',
    '.......HKKKKKKKKH.......',
    '.......HSSSSSSSSH.......',
    '.......SBBSSSSBBS.......',
    '.......SSESSSSESS.......',
    '..W....SrSSRSSSrS....W..',
    '..wW..wWWWWRRWWWWw..Ww..',
    '...wWWWWWWWWWWWWWWWWw...',
    '.....wwWWWWWWWWWWww.....',
    '.......sSSSSSSSSs.......',
    '........sSSSSSSs........',
    '.........sSSSSs.........',
    '......IIIIsSSsIIII......',
    '....IIIIIVVIIVVIIIII....',
    '...IIIIIVVVIIVVVIIIII...',
    '..IIIIiIVVVoVVVVIiIIII..',
    '..IIIIiIVVVVVVVVIiIIII..',
    '.IIIIIiIVVVoVVVVIiIIIII.',
    '.IIIIiIIVVVVVVVVIIiIIII.',
    '.IIIIiIIVVVoVVVVIIiIIII.',
    '.IIIiIIbbbbbobbbbIIiIII.',
    '..SSS.GGGGGGGGGGGG.SSh..',
    '..sSs.GGGGGgGGGGGG.sSh..',
    '.....GGGGGGgGGGGGGG..h..',
    '....GGGgGGGgGGGgGGG.OOO.',
    '....GGgGGGGgGGGGgGGO...O',
    '...GGGgGGGGgGGGGgGGO...O',
    '...GGgGGGGGgGGGGGgGO...O',
    '..GGGgGGGGGgGGGGGGgGOOO.',
    '..GgGgGgGg..GgGgGgGgGO..',
    '......CCC.....CCC.....O.',
    '......CcC.....CcC......O',
    '.....CCCCx....CCCCx.....',
    '....CCCCC.....CCCCC.....',
  ],
  worried: [
    [12, 7, 'HBBSSSSBBH'], // brows up under the brim
    [13, 7, 'SSSSSSSSSS'],
    [12, 5, 'D'],
    [13, 5, 'D'],
    [14, 18, 'D'],
  ],
  angry: [
    [13, 7, 'SBSSSSSSBS'], // outer brows high...
    [14, 7, 'SSEBSSBESS'], // ...inner ones pulled down to the eyes
    [4, 2, 'm.m'], // steam off the hat
    [3, 3, 'm'],
    // the whip comes off his hip...
    [31, 21, 'S'],
    [32, 21, 's'],
    [33, 21, '.'],
    [34, 20, '...'],
    [35, 19, '.....'],
    [36, 19, 'G....'],
    [37, 19, 'G....'],
    [38, 20, 'G..'],
    [39, 21, '.'],
    [40, 22, '.'],
    [41, 23, '.'],
    // ...raised and cracked over his head
    [30, 21, 'h'],
    [29, 21, 'h'],
    [28, 22, 'h'],
    [27, 22, 'O'],
    [26, 22, 'O'],
    [25, 23, 'O'],
    [24, 23, 'O'],
    [23, 22, 'O'],
    [22, 21, 'O'],
    [21, 20, 'OO'],
    [20, 19, 'O'],
    [19, 20, 'Y.Y'],
    [18, 21, 'Y'],
    [20, 21, 'Y'],
  ],
  angryRecolor: { S: 0xe07a62, r: 0xe07a62, s: 0xb85a48 },
}
