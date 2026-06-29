# Publishing Spotlight Rules

The extension ships to two registries from one `.vsix`:

- **VS Code Marketplace** — `spotlightrules.spotlight`
  (<https://marketplace.visualstudio.com/items?itemName=spotlightrules.spotlight>)
- **Open VSX** — `spotlightrules.spotlight` (VSCodium, Cursor, Windsurf, Gitpod, …)

> Identity note: the **Marketplace/Open VSX publisher is `spotlightrules`**, which
> is *not* the GitHub org (`api-commons`). The `publisher` field in
> [package.json](./package.json) must stay `spotlightrules`, and the `displayName`
> must be globally unique on the Marketplace (`Spotlight Rules`, not `Spotlight`).

## 1. Build the `.vsix`

```bash
node make.js package        # clean → install → lint → test → webpack → vsce package
```

Output: `artifacts/spotlight-<version>.vsix`.

If you only need the package and want to skip the lint/test gates (e.g. a hotfix
re-package of already-green code), build the bundles and package directly:

```bash
yarn clean
yarn webpack --mode production --config ./client/webpack.config.js
yarn webpack --mode production --config ./server/webpack.config.js
mkdir -p dist/client dist/server artifacts
cp package.json README.md CHANGELOG.md LICENSE.txt icon.png dist/
cp client/dist/index.js dist/client/ && cp server/dist/index.js dist/server/
(cd dist && ../node_modules/.bin/vsce package -o ../artifacts/)
```

## 2. VS Code Marketplace

One-time: create the **`spotlightrules`** publisher at
<https://marketplace.visualstudio.com/manage> and a PAT at <https://dev.azure.com>
(Organization: **All accessible organizations**, Scope: **Marketplace → Manage**).

```bash
npx @vscode/vsce publish --packagePath artifacts/spotlight-<version>.vsix -p <PAT>
```

Verify (the gallery API is authoritative; the web page lags behind):

```bash
curl -s "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery" \
  -H "Accept: application/json;api-version=7.2-preview.1" -H "Content-Type: application/json" \
  -d '{"filters":[{"criteria":[{"filterType":7,"value":"spotlightrules.spotlight"}]}],"flags":914}'
```

## 3. Open VSX

One-time: sign in at <https://open-vsx.org> (GitHub), sign the **Eclipse Foundation
Open VSX Publisher Agreement**, create an access token in your user settings, and
create the namespace (must match the publisher):

```bash
npx ovsx create-namespace spotlightrules -p <OPENVSX_TOKEN>
```

Publish (same `.vsix`):

```bash
npx ovsx publish artifacts/spotlight-<version>.vsix -p <OPENVSX_TOKEN>
```

Verify: <https://open-vsx.org/extension/spotlightrules/spotlight>

## Notes

- `vsce` bundled in devDependencies is the deprecated 1.x; publish with modern
  `@vscode/vsce` via `npx` (used above).
- `client/src/*.js` and `server/src/*.js` are compiled TypeScript output and are
  **git-ignored** — the entry points are the `.ts` files. Never commit the `.js`.
