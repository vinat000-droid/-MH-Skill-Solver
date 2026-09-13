# Monster Hunter Skill Solver v25

## Structure
- `/` : game selection
- `/sunbreak/` : Monster Hunter Rise: Sunbreak solver and its database loader
- `/wilds/` : Monster Hunter Wilds solver and separate live database
- `/common/` : shared browser storage and search-progress UI

## Database policy
Sunbreak v25 bundles its RiseSim-based CSV database locally, so it does not require an external DB request at runtime. Wilds uses the MHDB Wilds API as a replaceable data source, so Wilds data can be updated independently as title updates change the game database.

Wilds API source: https://wilds.mhdb.io/en

The Wilds API documents separate armor, skill, decoration and charm resources and identifies randomized charms separately. Random appraised talismans are not treated as guaranteed fixed charms by this version.

## Replacement on GitHub Pages
Replace the repository contents with this folder's contents. No old Sunbreak-only root files need to remain.

## Important
This is the architectural replacement release. Sunbreak keeps the existing solver; Wilds is a separate initial solver with its own DB source and storage namespace. Wilds charm probability/legal-roll modeling should be extended before treating a particular random talisman roll as an exact guarantee.

## v25 changes
- Sunbreak CSV database is bundled locally under `/sunbreak/data/`.
- Sunbreak loader uses same-origin local CSV files only.
- Sunbreak loader script URL is cache-busted with `?v=25-local`.

## v20 changes
- Wilds result cards now show all currently activated skills, not only target-skill fulfillment.
- Wilds skill-level selectors are generated from each skill's actual rank data instead of a fixed Lv1-Lv7 range.
- Selected target levels are clamped to the actual maximum level for that skill.


## Sunbreak v25 database
Sunbreak runtime uses an embedded local database in `sunbreak/data/library-loader.js`; it does not fetch CSV files at runtime. The original CSV files are also bundled in `sunbreak/data/` as the editable/source copy.
