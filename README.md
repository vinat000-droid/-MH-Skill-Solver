# Monster Hunter Skill Solver v18

## Structure
- `/` : game selection
- `/sunbreak/` : Monster Hunter Rise: Sunbreak solver and its database loader
- `/wilds/` : Monster Hunter Wilds solver and separate live database
- `/common/` : shared browser storage and search-progress UI

## Database policy
Sunbreak keeps its existing RiseSim-based database loader. Wilds uses the MHDB Wilds API as a replaceable data source, so Wilds data can be updated independently as title updates change the game database.

Wilds API source: https://wilds.mhdb.io/en

The Wilds API documents separate armor, skill, decoration and charm resources and identifies randomized charms separately. Random appraised talismans are not treated as guaranteed fixed charms by this version.

## Replacement on GitHub Pages
Replace the repository contents with this folder's contents. No old Sunbreak-only root files need to remain.

## Important
This is the architectural replacement release. Sunbreak keeps the existing solver; Wilds is a separate initial solver with its own DB source and storage namespace. Wilds charm probability/legal-roll modeling should be extended before treating a particular random talisman roll as an exact guarantee.

## v20 changes
- Wilds result cards now show all currently activated skills, not only target-skill fulfillment.
- Wilds skill-level selectors are generated from each skill's actual rank data instead of a fixed Lv1-Lv7 range.
- Selected target levels are clamped to the actual maximum level for that skill.
