# Wilds Solver data model

## Target skill categories
- normal: ordinary skills that have at least one non-weapon-side source (armor, armor decoration, or charm). They are evaluated against the complete equipment set and may also be supplied by the selected weapon when that weapon carries the same skill.
- weapon: weapon-only skills. They require a weapon type and are selected only when the selected weapon type can supply the skill directly or through weapon-side decorations.
- set: armor-set bonus skills; each selected level carries its required piece count from `SkillRank.setPiecesRequired`.
- group: armor-group bonus skills; each selected level carries its required piece count from `SkillRank.setPiecesRequired`.
- A skill is not classified as weapon-only merely because the upstream API labels it as a weapon skill: if it also has a non-weapon-side source, it remains selectable as a normal skill.

## Deterministic equipment sources
- weapons: fixed weapon skills + weapon decoration slots
- armor: fixed armor skills + armor decoration slots
- charms: non-randomized charm ranks and their skills
- decorations: `weapon`/`armor` kind, minimum slot level, granted skills
- armor sets: `setBonusSkill` and `groupBonusSkill` metadata used to validate selected set/group targets

## Target satisfaction
- Normal targets may be satisfied by weapon, armor, charm, and applicable decorations.
- Explicit weapon-only targets may also be satisfied by weapon-side decorations, not only by a weapon that has the skill printed on it.
- Series/group targets are evaluated separately from ordinary skill levels.
- Search exhaustion/time limits are not treated as proof that a target combination is impossible.

## Search result
Each result contains weapon, five armor pieces, a deterministic charm rank (or none), decorations, and the aggregated active skill list.

## Data audit
At DB load, the solver counts ordinary, weapon-only, series, group, and orphaned skill definitions. An orphaned definition is a non-series/non-group skill that has no recognized armor, charm, weapon, or decoration source and is therefore surfaced for data investigation instead of silently disappearing from the target picker.

## Artian/Gogma Artian
The MHDB API exposes base Artian weapons as weapon records, but the Gogma Artian series/group skill and reinforcement reroll state is not represented as a deterministic equipment record. The solver therefore does not claim a random Gogma Artian roll as guaranteed. This can be added later as a separate probabilistic/table-based module.


## Randomized charms (鑑定護石)

MHDB marks randomized charms with `randomized: true` and intentionally provides no rolled skills. The solver therefore treats randomized charm rolls as a separate source. `data/random-charm-rules.json` contains skill/level combinations explicitly verified from current public documentation; these are synthesized as candidate charms during solving. Fixed charm ranks remain separate. This prevents a randomized charm such as 砲弾装填 Lv2 from being lost merely because `/charms` has no fixed rank carrying that roll.
