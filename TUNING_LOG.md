# Tuning log

Every balance change goes here: what changed, and why. All numbers live in the `TUNING` table at the top of the script in `public/index.html`.

## 2026-11-27: Plan v2, phase 1 (economy and balance)
- `enemyCap` 15: at most 15 hungry people alive at once (was 42). The rest wait in line. Reason: big waves were a messy blob.
- `waveMaxUnits` 26: waves bigger than this turn the extra units into **gold elites** (x2.4 HP, x1.12 speed, x3 coins). Reason: later waves get tougher, not just bigger.
- Elites also appear by chance from wave 6 (2.5% per wave, max 22%).
- Wave size: `4 + 1.9 x wave` (was `4 + 2.3 x wave`).
- HP ramp: `+8%` per wave, capped at x2.5 (was `+12%`, no cap). Speed ramp `+1.8%`, capped at x1.32 (was x1.7).
- Combo coin bonus: +1x every 10 kills, max x3 (was +1x every 8 kills with no cap). Reason: coins piled up too fast.
- Coins grow 6% per stage. Flawless bonus `10 + 2 x wave`.
- Damage multiplier capped at x9 so numbers never get silly. Big numbers show as `1.2k`.
- Difficulty: Easy (HP x0.72, count x0.85, coins x0.85), Normal, Hard (HP x1.4, count x1.15, coins x1.3, boss x1.35).
- Solo: enemy HP x0.85 and count x0.65.
- Revive: 5 seconds standing next to your partner (was 2.2 s), interrupted if the reviver gets bitten. Revived player gets half bites and a 3 s shield bubble.
- New enemies: **mage** from wave 7 (red / green / blue magic orbs), **thief** from wave 13 (steals 25% of your coins, kill it to get them back).
- Server: run coin cap raised to `wave x 210 + 300` because of Hard mode and the new upgrades.

## Permanent upgrades (20)
Price = base x (1 + 0.6 x level). Same list in `server.js` (`PERMS`) and `public/index.html` (`PERM_INFO`).

## 2026-11-28: Plan v2, phase 3 (chapters)
- Story is now a tutorial + 5 chapters of 20 waves. Mini boss at wave 10, chapter boss at wave 20.
- `chapterStep` 5: each chapter counts as 5 waves harder than the last (chapter 5 wave 20 = difficulty of wave 40, still capped).
- Wave size adds `+2 x chapter`. Extra elites per wave capped at 12 (`eliteMaxExtra`).
- Story boss HP: base x (2.2 + 0.15 per chapter). Mini bosses x0.5.
- Stars: 3 = no one eaten and 5 bites or less, 2 = eaten at most once and 15 bites or less, 1 = cleared.
- Beating chapters 1-5 unlocks Frank, Tito, Coco, Eggbert and Cleo for free, plus 200 coins.

## 2026-11-28 - Super mixes, heart gift, magnet solo-only
- `mix.dist` 2.6 / `mix.charge` 1.5s / `mix.cd` 25s: stand that close to your partner for 1.5 s and you fire a SUPER MIX, then it waits 25 s. Reason: Ibrahim wants co-op to feel unique.
- Named mixes: Donut+Ice Cream (Frozen Donut Quake), Burger+Hot Dog (BBQ Party), Pizza+Taco (Fiesta Spin), Egg+Ramen (Egg Noodle Bomb), Cupcake+Ice Cream (Sundae Party), Chili+Sushi (Spicy Sushi Storm). Any other pair = Food Fusion.
- `heartGift` 50: in 2-player, the Coin Magnet shop slot becomes "Give a Heart" (50 coins = +1 heart for your partner).
- Coin magnet upgrades (shop + Magnet Pocket) now only work in single player. Reason: in co-op one player's magnet stole all the coins (same problem Nom Nom Apocalypse reviewers hated).
