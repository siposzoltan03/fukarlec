import type { BacsiMood } from './bacsi'

// Message packs: who is talking in the toasts and in the pane's speech bubble.
// Placeholders: {keret} (session/napi/havi), {pct}, {spent}, {budget}, {cost},
// {kind} ("≈ 3 lángos 🫓"), {xp}. Keep them short: a toast is one line.

export type Pack = {
  id: string
  name: string
  description: string
  /** Garas (XP) it costs in the shop; 0 = owned from the start. */
  price: number
  /** A budget crossed 80%. */
  warn: readonly string[]
  /** A budget used up. */
  over: readonly string[]
  /** One expensive turn. */
  turn: readonly string[]
  /** XP credited for yesterday's thrift. */
  xp: readonly string[]
  /** The pane's speech bubble, by the mascot's mood. */
  sayings: Readonly<Record<BacsiMood, readonly string[]>>
}

const paraszt: Pack = {
  id: 'paraszt',
  name: 'Fukar bácsi',
  description: 'Az eredeti tanyasi bölcsességek.',
  price: 0,
  warn: [
    '🧐 Lassan a testtel! A {keret} keret {pct}%-a elment.',
    '🤨 Fukar bácsi szemöldöke felszaladt: {keret} keret {pct}%.',
    '🪙 Számolj csak utána: a {keret} keretből {pct}% már a LiteLLM-é.',
  ],
  over: [
    '💀 Elfogyott a {keret} keret ({spent}/{budget}). Ennyiből: {kind}',
    '🔥 A {keret} keret ég! {spent} – a nagymamád ezt nem hagyná szó nélkül.',
    '🚨 {keret} keret túllépve: {spent}/{budget}. Fukar bácsi a szívéhez kap.',
  ],
  turn: ['💸 Ez a kör +{cost} volt ({kind}). Megérte?'],
  xp: ['🪙 +{xp} garas a tegnapi fukarkodásért!', '🌾 Jó termés volt tegnap: +{xp} garas.'],
  sayings: {
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
  },
}

const nagymama: Pack = {
  id: 'nagymama',
  name: 'Nagymama',
  description: 'Aggódó szeretet, rántott hús és lelkiismeret-furdalás.',
  price: 60,
  warn: [
    '👵 Kisfiam, a {keret} keret {pct}%-a elment. Ettél már?',
    '🍲 {pct}%... ennyiből egy hétre főztem volna, csillagom.',
    '🧶 Ne haragudj, de a {keret} keret már {pct}%-on áll.',
  ],
  over: [
    '😢 Elfogyott a {keret} keret ({spent}). Nem ezért neveltelek.',
    '🥟 {spent}! Ennyiből {kind}. Gyere haza, főzök inkább.',
    '📞 Felhívom anyádat. {keret} keret: {spent}/{budget}.',
  ],
  turn: ['🍪 +{cost} egy körre? Abból sütöttem volna egy tálca pogácsát.'],
  xp: ['🍰 +{xp} garas, mert tegnap spóroltál. Büszke vagyok rád, kincsem!'],
  sayings: {
    nyugodt: ['Jól van, kincsem, okosan csinálod.', 'Egyél még egy kis rétest!', 'Látod, így kell beosztani.'],
    aggodo: ['Kisfiam, nem költesz te túl sokat?', 'Jaj, csak meg ne fázz... meg túl ne költs.', 'Anyád is mindig így kezdte.'],
    merges: [
      'Ennyi pénzből fél disznót vettünk volna!',
      'Ezt még a nagyapád se csinálta, pedig ő ivott!',
      'Hát erre tanítottalak én?',
    ],
  },
}

const nav: Pack = {
  id: 'nav',
  name: 'NAV-ellenőr',
  description: 'Hivatalos, rideg, iktatószámmal.',
  price: 120,
  warn: [
    '📋 Értesítjük, hogy {keret} keretének {pct}%-a felhasználásra került.',
    '🗂️ Ügyiratszám: FL/{pct}. A {keret} keret {pct}%-on áll.',
    '🧾 Felhívjuk figyelmét: {keret} keret {pct}%. Kérjük, tartsa be.',
  ],
  over: [
    '⚖️ Hiánypótlásra felszólítjuk: {keret} keret {spent}/{budget}.',
    '🏛️ Határozat: {keret} keret túllépve ({spent}). Fellebbezésnek helye nincs.',
    '📬 Tértivevényes levél: {spent} költés, {budget} keret. Jelentkezzen.',
  ],
  turn: ['🧾 Egyedi tétel rögzítve: +{cost}. Bizonylatot kérünk.'],
  xp: ['📄 Adójóváírás: +{xp} garas. Megőrzési idő: 8 év.'],
  sayings: {
    nyugodt: ['Az ügyfél adatai rendben.', 'Bevallás határidőben beérkezett.', 'Nincs további teendő.'],
    aggodo: ['Az ügyet felülvizsgálatra kijelöltük.', 'Kérjük, tartsa kéznél a bizonylatokat.', 'Szúrópróbaszerű ellenőrzés várható.'],
    merges: ['Mulasztási bírság kiszabva.', 'Az ügyet átadtuk a végrehajtónak.', 'Önellenőrzést javaslunk. Most.'],
  },
}

const betyar: Pack = {
  id: 'betyar',
  name: 'Betyár',
  description: 'Rózsa Sándor módra: a gazdagtól (az Opustól) elvesz.',
  price: 90,
  warn: [
    '🐎 Hej, komám! A {keret} keret {pct}%-a már elporzott.',
    '🔫 Megállj! {keret} keret {pct}%. A pandúrok már szimatolnak.',
    '🌾 {pct}%... a csárdában már suttognak rólad.',
  ],
  over: [
    '🪢 Elkaptak a pandúrok: {keret} keret {spent}/{budget}!',
    '🏴 A {keret} keret odavan ({spent}). Futás a nádasba!',
    '⛓️ {spent}! Ennyit még Sobri Jóska se rabolt egy éjjel.',
  ],
  turn: ['🐴 +{cost} egy körért? Ennyiért lovat lopok, nem tokent!'],
  xp: ['💰 +{xp} garas zsákmány a tegnapi portyáról!'],
  sayings: {
    nyugodt: ['Szabad a puszta, tele a tarisznya.', 'Gazdagtól veszek, szegénynek adok.', 'Ma nem kell bujdosni.'],
    aggodo: ['Hallom a pandúrok lovát...', 'Kevés már a tallér a tarisznyában.', 'Ideje lesz a nádasba húzódni.'],
    merges: ['Nem rabolok én, csak az Opus vesz el mindent!', 'A betyárbecsületre, ez sok!', 'Ennyit a vármegye se szed!'],
  },
}

const kocsmai: Pack = {
  id: 'kocsmai',
  name: 'Kocsmai',
  description: 'Pultnál támasztott bölcsességek, fröccsben mérve.',
  price: 60,
  warn: [
    '🍺 Komám, a {keret} keret {pct}%-a már lecsúszott.',
    '🍷 {pct}%? Ez már a harmadik fröccs után is sok.',
    '🎯 Csapos! A {keret} keret {pct}%-on áll, írd fel.',
  ],
  over: [
    '🍻 Elfogyott a {keret} keret! {spent}-ból egy hétig fizettem volna a kört.',
    '🥴 {spent}/{budget}... Zárás van, komám, nincs több hitel.',
    '🍺 Ennyiből {kind}. És te tokenre költötted.',
  ],
  turn: ['🍺 +{cost} egy körért? Ennyiért az egész kocsmának fizetek egyet!'],
  xp: ['🍻 +{xp} garas! Tegnap józanul költöttél, egészségedre!'],
  sayings: {
    nyugodt: ['Egy kis fröccs, egy kis kód, így szép az élet.', 'Jó a hangulat, olcsó a kör.', 'Ma még én fizetek.'],
    aggodo: ['Komám, kezd nőni a cetli a pult alatt...', 'Lassan a kocsmáros is ránk néz.', 'Még egy kör, aztán haza.'],
    merges: ['Kitiltottak a kocsmából, akkora a cetli!', 'Ennyiért már a kocsmát is megvettem volna!', 'Zárórát mondok, komám!'],
  },
}

export const PACKS: readonly Pack[] = [paraszt, nagymama, betyar, kocsmai, nav]

export const packById = (id: string | undefined): Pack => PACKS.find(p => p.id === id) ?? paraszt

/** Fill `{name}` placeholders; an unknown name is left as written. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (all, name: string) => (values[name] !== undefined ? String(values[name]) : all))
}

export function pickLine(list: readonly string[], seed: number): string {
  return list[Math.abs(Math.floor(seed)) % list.length]!
}
