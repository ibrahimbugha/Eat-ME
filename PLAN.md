# Don't Eat Me! - Full Plan v2

## Build order (Ibrahim chose: economy first)
- **Phase 1: Economy, balance table, enemy cap**
- Phase 2: Co-op feel (revive, shop UI, gifting)
- Phase 3: Chapters, checkpoints, tutorial
- Phase 4: Characters + upgrades + magic/thief enemies
- Phase 5: Playtest loop (gh-playtest style), Arabic review, polish
Each phase ends with: test, `node --check`, copy to root files, commit, push, one quiz question.

## Phase 1 - Economy and balance
- One `TUNING` table at the top of `public/index.html`: every number (enemy HP/speed/damage per type, spawn counts, coin rewards, prices, revive time, enemy cap). Plus `TUNING_LOG.md` listing every change with date and reason.
- Enemy cap: max **15** alive at once. Extra spawns queue and enter as others die. Big waves become waves of tougher units, not more units.
- Difficulty: steady climb inside a chapter, keeps climbing across all 5 chapters (ch5 hardest). Ramp comes from tougher types, smarter patterns, elites with traits, and only a small capped HP/speed bonus.
- Coins: flat per chapter with small growth; prices stay meaningful. Boss payouts bigger. Fixes "coins/power pile up too fast".
- Number display: abbreviate big numbers (1.2k), cap damage scaling so no silly values.
- Difficulty modes: Easy / Normal / Hard, plus auto co-op scaling (solo vs 2 players adjust enemy HP and count).
- Endless mode stays available always, on the same balance table.
- Server check: server.js economy validation updated to the new prices/rewards.

## Phase 2 - Co-op feel
**Revive (5 seconds):** hold button, big filling ring over the downed player, partner glows, heartbeat sound getting faster, screen pulse + camera shake, hearts/sparkles rising. Revive stops if the reviver is hit. On success: pop burst, half health + 3 s shield. Revive-speed upgrade shortens it.
**In-game shop UI:** big candy cards: icon, name, level pips, price, clear before -> after stat, affordable/locked states, controller and touch friendly, EN + AR.
**Gifting:** (a) pass an upgrade you own to your partner (you lose it), or (b) buy one for them, only from their own choices and at their own prices. Both inside the shop with a "for P2" toggle.

## Phase 3 - Chapters
| Ch | Place | Boss (wave 20) | New enemies | Twist |
|----|-------|----------------|-------------|-------|
| 0 | Tutorial | - | basic | "Skip tutorial" popup at start |
| 1 | Kitchen | Giant hungry chef | fast, normal, strong, heavy | none. Medium feel |
| 2 | Dining Hall | Fancy waiter | + ranged, shielded, magic (blue/green/red) | Hungry guests stand up mid-wave as extra enemies |
| 3 | Food Festival | Giant cotton candy monster | + exploder, healer | Festival bell: hit it by mistake -> enemy rush |
| 4 | Neon Rooftop | Canteen principal (giant, 3 phases: bullet patterns, charge/slam, laser sweeps, summons) | + teleporter, summoner, thieves | Thieves steal your coins |
| 5 | Giant Fridge | Giant food king | all types | No twist, pure fight |
- 5 chapters x 20 waves, each chapter is a checkpoint. Die -> restart that chapter keeping the upgrades you had at its start.
- Chapter 4 boss unlocks a new food + chapter badge; every boss unlocks a food.
- Save chapter progress per account (server + local), new achievements for chapters.

## Phase 4 - Content
**Characters:** 20 foods, totally different playstyles (own attack type, HP, speed, passive). Roles include tank, sniper, healer/support, summoner/trapper, plus small fast ones. Unlock by coins, beating a chapter boss, or achievements. Stat bars in carousel updated.
**In-run upgrades:** about 25, mix of offense, defense, utility, co-op (revive speed, gift discounts).
**New enemy kinds:**
- Small fast swarmers, **thieves** (steal coins, kill them to get coins back).
- **Magic enemies** shoot dodgeable orbs: **blue** = you shoot your friend for 5 s, **green** = you heal enemies, **red** = your controls reverse for 5 s. Start chapter 2.
- Ranged, shielded, exploder, healer, teleporter, summoner.

## Phase 5 - Playtest loop
You send notes ("wave 8 too hard", "coins too many"); I turn them into ranked fixes, change only the `TUNING` table, log in `TUNING_LOG.md`, push.
Also: ask you to review Arabic wording; remind about DB expiry 2026-12-27.

## Rules for every phase
Every new string through `tr()` with Arabic entry. Single HTML file stays. Commit and push after each phase, tell you if push fails.
