MH Skill Solver v24 - local DB package

This build is structured for zero external DB access at runtime.

Sunbreak source files:
  MHR_SKILL.csv
  MHR_DECO.csv
  MHR_EQUIP_HEAD.csv
  MHR_EQUIP_BODY.csv
  MHR_EQUIP_ARM.csv
  MHR_EQUIP_WST.csv
  MHR_EQUIP_LEG.csv

Wilds source endpoints:
  /ja/skills
  /ja/armor
  /ja/decorations
  /ja/charms

The source payloads are not fabricated. They must be populated from the
source archives/API snapshot before this package can truthfully be called
the fully data-complete offline build.
