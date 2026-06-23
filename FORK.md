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

## Engine

The extension embeds the published
[`@spotlight-rules/spotlight-*`](https://www.npmjs.com/org/spotlight-rules)
engine (core, parsers, ruleset-bundler, ruleset-migrator, rulesets) at `^1.0.0`,
the same engine shipped by [spotlight-cli](https://github.com/api-commons/spotlight-cli).
The engine class is imported directly as `Spotlight`. Default ruleset files are
`.spotlight.{json,yaml,yml,js}` and built-in rulesets use the `spotlight:`
aliases — consistent with the rest of the Spotlight stack.

## Not changed (attribution — required)

- `LICENSE.txt`, `NOTICE`, and the "derived from Stoplight's vscode-spectral"
  provenance stay as-is, per the Apache License.
- External `@stoplight/*` utility dependencies (`@stoplight/path`,
  `@stoplight/json-ref-resolver`, etc.) are unrelated libraries and keep their
  names.

## Changes from upstream

- **2026-06-23** — Initial import and rebrand. The extension icon (`icon.png`)
  and screenshots are still the upstream artwork; replacing them is future work.
