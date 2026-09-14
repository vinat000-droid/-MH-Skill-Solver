# Wilds Solver data model

## Target skill categories
- normal: armor + weapon skills are selected together.
- set: armor-set bonus skills; each selected level carries its required piece count from SkillRank.setPiecesRequired.
- group: armor-group bonus skills; each selected level carries its required piece count from SkillRank.setPiecesRequired.

## Deterministic equipment sources
- weapons: fixed weapon skills + weapon decoration slots
- armor: fixed armor skills + armor decoration slots
- charms: non-randomized charm ranks and their skills
- decorations: weapon/armor kind, minimum slot level, granted skills
- armor sets: setBonusSkill and groupBonusSkill metadata used to validate selected set/group targets

## Search result
Each result contains weapon, five armor pieces, a deterministic charm rank (or none), decorations, and the aggregated active skill list.

## Artian/Gogma Artian
The MHDB API exposes base Artian weapons as weapon records, but the Gogma Artian series/group skill and reinforcement reroll state is not represented as a deterministic equipment record. The solver therefore does not claim a random Gogma Artian roll as guaranteed. This can be added later as a separate probabilistic/table-based module.
