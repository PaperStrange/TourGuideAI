# Where the skill actually lives

The skill is **not** in this directory. It is a project skill, mounted through the
default project root:

```
<projectRoot>/.dsh/skills/tourguide-fact-integrity/SKILL.md
```

For this repo that is
`D:\All-Downloads\TourGuideAI\.dsh\skills\tourguide-fact-integrity\SKILL.md`.

## Why not here

The first revision mounted this bundle's own `skills/` directory by declaring a
`skill-filesystem` row in the preset with `customSkillDirs`. **That made the
preset fail to load**, because `providerName` defaults to `filesystem` — a name
the host has already registered globally, and the `skills` service documents that
a duplicate name *throws*.

The correct mechanism needs no row at all. `@deepseek-ai/dsh-skill-filesystem`
scans these roots by default when `includeDefaultRoots` is true (the default):

| rank | source | root |
|---|---|---|
| 100 | `project-dsh` | `<projectRoot>/.dsh/skills` |
| 200 | `project-agents` | `<projectRoot>/.agents/skills` |
| 300 | `custom` | `Config.customSkillDirs` |
| 400 | `user-dsh` | `$DSH_HOME/skills` |
| 500 | `user-agents` | `$DSH_AGENTS_HOME/skills` |
| 600 | `bundled` | `Config.bundledSkillDir` |

`projectRoot` is the nearest ancestor containing `.git`. Discovery is one level
deep: only `<root>/<name>/SKILL.md` and `<root>/<name>.md`.

Mounting at rank 100 also means the rules apply in **every** preset, not just
`tourguide`, and it survives moving the repo.
