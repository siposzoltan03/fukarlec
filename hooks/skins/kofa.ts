import type { Skin } from '../bacsi'

// Piaci kofa néni: virágos bordó fejkendő az álla alatt megkötve, pirospozsgás arc,
// rojtos zöld vállkendő, fehér blúz, sötét bő szoknya köténnyel, kilógó csipkés
// alsószoknya, a karján fonott kosár paprikával és tojással.
export const kofa: Skin = {
  id: 'kofa',
  name: 'Kofa néni',
  description: 'Virágos fejkendő, rojtos vállkendő, kosárban paprika meg tojás.',
  price: 150,
  palette: {
    K: 0x8b1a2b, k: 0xe8c547, n: 0xf2e6d0, // fejkendő, virágminta
    H: 0xc8c8c8, // ősz hajtincs
    S: 0xe9b48f, s: 0xc48a66, r: 0xe0807a, // bőr, árnyék, pirospozsgás arc
    E: 0x1a1a1a, B: 0x8a8a8a, M: 0x9c3b3b, // szem, szemöldök, száj
    V: 0x2f5d3a, v: 0x7fa86a, // vállkendő, rojt
    L: 0xf3efe6, l: 0xd3cbb9, // blúz, alsószoknya csipke
    X: 0x1e1e2e, x: 0x3a3a52, // szoknya, redő
    A: 0xe8dfc8, a: 0xb22a2a, // kötény, piros szegély
    O: 0xb98a4a, o: 0x7d5a2c, // fonott kosár
    P: 0xd6261e, p: 0x3d8a2a, Y: 0xf6efe0, // paprika, szár, tojás
    C: 0x141414, c: 0x4a4a4a, // cipő
    D: 0x6fb7ff, // izzadságcsepp
    m: 0x9a9a9a, // gőz
  },
  rows: [
    '........................',
    '........................',
    '........................',
    '........................',
    '..........KKKK..........',
    '........KKKkKKKK........',
    '.......KKnKKKKkKK.......',
    '......KKKKKkKKKnKK......',
    '.....KKkKKKKKKKKkKK.....',
    '.....KKHHHHHHHHHHKK.....',
    '.....KKSSSSSSSSSSKK.....',
    '.....KkSBBSSSSBBSkK.....',
    '.....KKSSESSSSESSKK.....',
    '.....KKSrSSssSSrSKK.....',
    '.....KnSrrSSSSrrSnK.....',
    '.....KKSSMSSSSMSSKK.....',
    '......KsSSMMMMSSsK......',
    '.......KKsSSSSsKK.......',
    '........KKsSSsKK........',
    '.........KKkKKK.........',
    '......VVVVVKKVVVVV......',
    '....VVVVVVVKKVVVVVVV....',
    '...VVVVVVVVKKVVVVVVVV...',
    '..LLVVVVVVVVVVVVVVVVLL..',
    '..LLvVVVVVVVVVVVVVooooo.',
    '.LLLvvVVVVVVVVVVVovvLLo.',
    '.LLLLvvvVVVVVVVVvovLLLo.',
    '.LLlLLvvvVVVVVVvPpPYYPpP',
    '.LLlLLLvvvVVVVvvOoOOoOOo',
    '.LLlLLLLLvvVVvvLoOOoOOoO',
    '.LLlLLLLLLvvvvLLOoOOoOOo',
    '.SSS.XXAAAAAAAAAAoOOoOOo',
    '.sSs.XXAAAAAAAAAAXX.....',
    '...XXxXAAAAAAAAAAXxXX...',
    '...XXxXAAAAAAAAAAXxXX...',
    '..XXXxXAAAAAAAAAAXxXXX..',
    '..XXxXXAAAAAAAAAAXXxXX..',
    '.XXXxXXaAAAAAAAAaXXxXXX.',
    '.XXxXXXaaaaaaaaaaXXXxXX.',
    '.XXxXXXXXxXXXXxXXXXXxXX.',
    '.LlLlLlLlLlLlLlLlLlLlLl.',
    '......CCC......CCC......',
    '.....CCCc......cCCC.....',
    '....CCCCC......CCCCC....',
  ],
  worried: [
    [11, 7, 'SSSSSSSSSS'], // brows up under the fringe
    [10, 7, 'SBBSSSSBBS'],
    [15, 7, 'SSSSSSSSSS'], // the smile goes...
    [16, 7, 'sSSSMMSSs'], // ...into a small worried "o"
    [10, 4, 'D'],
    [11, 4, 'D'],
    [13, 19, 'D'],
  ],
  angry: [
    [11, 7, 'SBSSSSSSBS'], // outer brows high...
    [12, 7, 'SSEBSSBESS'], // ...inner ones down to the eyes
    [15, 7, 'SSSSSSSSSS'],
    [16, 7, 'sSSMMMMSSs'], // tight-lipped frown
    [17, 8, 'sMSSSSMs'],
    [19, 1, 'SS'], // fist shaken in the air
    [20, 1, 'SS'],
    [21, 1, 'LL'],
    [22, 1, 'LLL'],
    [31, 1, '...'], // (the hand that hung here)
    [32, 1, '...'],
    [3, 3, 'm'], // steam off the scarf
    [4, 2, 'm.m'],
    [3, 20, 'm'],
    [4, 19, 'm.m'],
  ],
  angryRecolor: { S: 0xe07a62, r: 0xe07a62, s: 0xb85a48 },
}
