# About this fork

**Spotlight for VS Code** is a fork of
[Stoplight's vscode-spectral](https://github.com/stoplightio/vscode-spectral),
maintained under the [API Commons](https://github.com/api-commons) organization.

It is the editor companion to the API Commons "Spotlight" stack:

- **[spotlight-cli](https://github.com/api-commons/spotlight-cli)** — the linter (a fork of Spectral).
- **[spotlight-spec](https://github.com/api-commons/spotlight-spec)** — the standalone ruleset specification + JSON Schema.
- **spotlight-vscode** (this repo) — the VS Code extension.

## Provenance

- Upstream: https://github.com/stoplightio/vscode-spectral
- Seeded from: `master` branch, June 2026 (source download — **not** a GitHub network fork; no shared git history).
- License: Apache License 2.0 (unchanged) — see [LICENSE.txt](./LICENSE.txt) and [NOTICE](./NOTICE).

## What was rebranded

- **Extension identity:** `name` (`spectral` → `spotlight`), `displayName`
  (`Spectral` → `Spotlight`), `publisher` (`stoplight` → `api-commons`), and the
  homepage/bugs/repository URLs. The extension ID is therefore now
  `api-commons.spotlight`.
- **Settings namespace:** all `spectral.*` configuration keys →
  `spotlight.*` (`spotlight.enable`, `spotlight.rulesetFile`, `spotlight.run`,
  `spotlight.trace.server`, `spotlight.validateFiles`,
  `spotlight.validateLanguages`), plus the configuration section title and the
  code that reads it.
- **Command:** `spectral.showOutputChannel` → `spotlight.showOutputChannel`
  (category `Spotlight`).
- **Language client / diagnostics:** the language client id and name, the
  diagnostic collection name, the diagnostic `source` label (shown in the
  Problems panel as `spotlight`), and the LSP notification methods
  (`spotlight/startWatcher`, `spotlight/validate`) on both client and server.
- **User-facing strings and docs** referring to the product.

## Deliberately **not** changed (compatibility)

- The **linter engine** is still the upstream Spectral packages
  (`@stoplight/spectral-core`, `-parsers`, `-ruleset-bundler`,
  `-ruleset-migrator`, `-rulesets`). In `server/src/linter.ts` the engine class
  is imported with an alias: `import { Spectral as Spotlight } from
  '@stoplight/spectral-core'`. Repointing the engine at the (unpublished)
  `@api-commons/spotlight-*` packages from spotlight-cli is future work.
- The default **ruleset filenames** `.spectral.json` / `.spectral.yaml` /
  `.spectral.yml` / `.spectral.js` and the `spectral:` ruleset alias scheme are
  preserved, because they are part of the engine's behaviour and the large body
  of existing rulesets in the wild.

## Changes from upstream

- **2026-06-23** — Initial import and rebrand as described above. The extension
  icon (`icon.png`) and screenshots are still the upstream Spectral artwork;
  replacing the artwork is future work.
