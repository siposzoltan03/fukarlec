# 🪙 fukarléc

Claude Code plugin, ami a LiteLLM proxy saját költségkönyveléséből figyeli, mennyibe kerülsz.
Csak LiteLLM-en futó sessionben aktív (`ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN`, opcionálisan `ANTHROPIC_CUSTOM_HEADERS`),
máshol némán nem csinál semmit.

## Mit tud

### Status line
![Status line](docs/statusline.png)

Session/napi/havi költés, 5 percenként és minden kör után frissül.
A session költése a kulcs teljes költésének változása a session indulása óta, ezért párhuzamos sessionöknél a `~` komolyan veendő.

### `/fukarlec` riport
![Riport](docs/report.png)

Havi riport napi oszlopokkal, modellenkénti bontással ($/MTok), cache-találati aránnyal és -megtakarítással.
`/fukarlec 7`: utolsó 7 nap · `/fukarlec frissít` · `/fukarlec help`

### Dashboard panel
![Panel](docs/panel.png)

`/fukarlec panel` — élő sidebar dashboard:
- Budget gauge-ok (session/napi/havi), színváltás ahogy közelít a limithez
- Napi sparkline az utolsó napok költéséről
- Modell-megoszlás színes sávval és legenddel
- Cache statisztika
- Spórolási tippek a valós számokból
- Vicces mód: lángos-átváltás, streak, hangulat-emoji

### Budget-őr
80%-nál és 100%-nál toast (100%-nál natív értesítés is). `block` módban keret felett nem enged új promptot,
amíg `/fukarlec engedd` fel nem oldja aznapra.

### Spórolási tippek
Max. 30 percenként egy, a valós mai számokból: Opus-túlsúly, alacsony cache-találat, újraírt cache modellváltás vagy hosszú szünet után.

### Vicces mód
Hangulat-emoji (😇 → 🙂 → 😬 → 🥵 → 🔥 → 💀), Fukar bácsi beszólásai, forintosítás lángosban, sörben, BKK-bérletben
és Balaton-parti hétvégében, 🏆 „fukar sorozat" a napi kereten belül maradt napokra.

A napok UTC szerint értendők, ahogy a LiteLLM számol.

## Telepítés

```
/plugin install fukarlec --marketplace siposzoltan03/fukarlec
```

Lokális fejlesztéshez (ha klónoztad a repót):

```
/plugin marketplace add ~/projects/fukarlec
/plugin install fukarlec@fukarlec
```

Lokális marketplace esetén a szerkesztések után elég egy `/reload-plugins`.

## Beállítás

`/config` → fukarlec: session-, napi- és havi keret (USD, 0 = nincs), `warn`/`block` mód, „drága kör" küszöb, vicces mód, USD/HUF árfolyam.

## Fejlesztés

```
claude plugin validate .
claude plugin test .
claude -p "/fukarlec" --plugin-dir .   # LiteLLM env változókkal
```
