# tourguide-2.5d — DSH bundle

Fact-layer discipline for the TourGuideAI 2.5D travel-simulation reboot. Three
deliverables:

1. **`tourguide` agent preset** — the shipped `standard` tool set plus a
   fact-integrity persona.
2. **`tourguide-fact-integrity` skill** — mounted through the project skill root,
   not through this bundle (see `skills/README.md`).
3. **Three zero-dependency validators** under `tools/`.

This bundle mounts **no plugin code**. See "Failure history" — both attempts to
add code or extra composition rows are recorded there.

## Install / reinstall

`plugin_manager` → `install_bundle` with target
`D:\All-Downloads\TourGuideAI\docs\handOff\dsh-bundle-tourguide-2.5d`.

Installing registers the profile bundle `@local/tourguide-2.5d` and inserts
**one** row, `preset-tourguide`. It does not touch `preset-standard` or
`preset-cordis`, so a mistake here cannot break the presets that already compose.

`install_bundle` answers `ambiguous-install` when the link already exists, and it
does not reload the patch in that case. Follow it with
`plugin_manager` `set_bundle` (`enabled: true`, target `@local/tourguide-2.5d`);
`application: applied` is the signal that matters. The only warning it should
print is the pre-existing `dsh-mcp-manager … failed to import`, which is not
caused by this bundle.

## Components

| Path | Role |
|---|---|
| `cordis.patch.yml` | Inserts the `preset-tourguide` row. **19 plugin rows — the same set as the shipped `standard` preset**, plus `persona-tourguide`. |
| `package.json` | Bundle manifest. `dsh.bundle.patch` points at the patch. |
| `skills/README.md` | Why the skill is NOT here, and the exact default roots. |
| `tools/validate-city-pack.mjs` | Fact-layer contract enforcement. |
| `tools/check-patch-yml.mjs` | Structural check for Cordis patch files. |
| `tools/check-skill-md.mjs` | SKILL.md frontmatter check. |

The skill itself lives at
`<projectRoot>/.dsh/skills/tourguide-fact-integrity/SKILL.md` — for this repo,
`D:\All-Downloads\TourGuideAI\.dsh\skills\tourguide-fact-integrity\SKILL.md`. It
is a normal project file and is tracked by git (`.dsh/` is not gitignored).

## Verify

```powershell
$B = 'D:\All-Downloads\TourGuideAI\docs\handOff\dsh-bundle-tourguide-2.5d'

# 1. patch dialect + preset roster shape (must print "19 plugin rows")
node "$B\tools\check-patch-yml.mjs" "$B\cordis.patch.yml"

# 2. skill discovery shape, read from its real location
node "$B\tools\check-skill-md.mjs" 'D:\All-Downloads\TourGuideAI\.dsh\skills'

# 3. the validator itself, against fixtures that must pass and must fail
node "$B\tools\validate-city-pack.mjs" <compliant-city-pack-dir>   # expect exit 0
node "$B\tools\validate-city-pack.mjs" <broken-city-pack-dir>      # expect exit 1
```

Then confirm the loader composed the row:

- `plugin_manager` `list_plugins` → `include:preset-tourguide`, `enabled: true`,
  `fiberPhase: active`.
- `cordis_inspect_query` host / `Config` / `listConfigs` with
  `name: @deepseek-ai/dsh-agent-preset` → `include:preset-tourguide`,
  `status: "schema"`.

Both of those prove the declaration is valid and registered. **They do not prove
the preset composes inside a session.** The only proof of that is selecting
**TourGuide 2.5D** for a new session and seeing it load. Existing sessions keep
the preset revision they started with.

## Failure history — read this before changing the preset

### 1. A plugin entry module could not import its dependency

The first revision copied `dsh-arch-doc`'s pattern: a `plugin/index.js` that
imported `@deepseek-ai/dsh-skill-filesystem` and registered this bundle's
`skills/` as a skill root. It failed:

```
dsh: warning: 1 entry did not activate
tourguide-2.5d (@local/tourguide-2.5d): failed to import
```

Cause: the bundle installs as a `link:` into this workspace, and Node resolution
from the workspace never reaches the dsh installation's `node_modules` (the
packaged npm version of that package is a stale `0.0.1-rc.3`; the installation
ships `0.1.7-rc.2`). Verified directly:

```
node -e "import('@deepseek-ai/dsh-skill-filesystem')"   # run from the bundle dir
→ ERR_MODULE_NOT_FOUND
```

**Lesson: a workspace-linked bundle cannot rely on peer packages that only the
dsh installation has. Mount through configuration, or through a default root.**

### 2. Declaring a `skill-filesystem` row broke the whole preset

The second revision replaced the code with configuration: a `skill-filesystem`
row in the preset carrying `customSkillDirs`. The user reported **the preset
failing to load in the GUI**, and they were right.

Cause: `providerName` defaults to `filesystem`. The `skills` service documents
it as a unique provider name and states that *"duplicate names within one layer
… throw"* — and the host has already registered that name globally from the
`@deepseek-ai/dsh-web-app` bundle. One bad row took down the entire preset
declaration.

**Lesson: never re-declare a reserved provider name. The default project root
already exists for exactly this purpose.**

### 3. Two `dsh-persona` rows collided and killed the preset

An earlier revision expressed the project rules as a **second** `dsh-persona`
row (`persona-tourguide`) in addition to the `standard` preset's `persona` row.
The GUI reported:

```
persona (@deepseek-ai/dsh-persona): prompt section "deployment:persona-prefix"
is already registered in this scope
```

Root cause, read from the package source rather than guessed —
`@deepseek-ai/dsh-persona/lib/index.js:36,42` registers two sections under
**hardcoded names** (`PERSONA_PREFIX_SECTION`, `PERSONA_SUFFIX_SECTION`), and its
own JSDoc says an unscoped context "*collides with the prompt registry's own
persona registration and rejects*". `dsh-persona` is therefore **single-instance
per scope**: it has no way to take an id, so two rows always collide.

The rules are now folded into the single `persona` row's `prefix`, alongside the
standard model line. **Lesson: a plugin that registers a fixed prompt section
name cannot be mounted twice in one preset.**

### 4. `@weibaohui/experts-management` must not be listed

An earlier revision listed it as a preset plugin. Its own patch states it is
host-plane — it registers a host `skills` provider and an HTTP route — and that
it *"must therefore land in the host composition, never inside an agent preset."*
It is already installed and enabled as its own profile bundle
(`include:experts-management` is `active`) and is used with the `/expert-<name>`
gesture from the composer.

## Why the validators exist

`validate-city-pack.mjs` is the point of this bundle: it makes "every fact
carries provenance" mechanically enforceable instead of a rule people remember.
It is deliberately schema-free so it runs before the app exists, and it reports
only iron-rule violations: unresolvable `source_url`, missing or future
`verified_at`, out-of-range coordinates, `(0,0)` placeholders, dangling transit
references, and narrative-only fields leaked into the fact layer.

Tested against a compliant fixture (exit 0) and a deliberately violating fixture
that triggers **11 distinct violations** (exit 1).

`check-patch-yml.mjs` cannot parse the Cordis `!!js` scalar tag — js-yaml 3.14
resolves `!!js` through its default schema, so a user-registered Type is never
consulted — so it rewrites `!!js <expr>` to a placeholder before parsing. **It
proves SHAPE only.** It was validated against the two shipped controls
(`standard.patch.yml`, `cordis.patch.yml`) before being trusted here.
