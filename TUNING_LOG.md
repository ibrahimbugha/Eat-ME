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
