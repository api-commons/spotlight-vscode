"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Linter = exports.createHttpAndFileResolver = void 0;
const spectral_core_1 = require("@stoplight/spectral-core");
const vscode_uri_1 = require("vscode-uri");
const Parsers = require("@stoplight/spectral-parsers");
const json_ref_readers_1 = require("@stoplight/json-ref-readers");
const json_ref_resolver_1 = require("@stoplight/json-ref-resolver");
const runtime_1 = require("@stoplight/spectral-ruleset-bundler/presets/runtime");
const commonjs_1 = require("@stoplight/spectral-ruleset-bundler/plugins/commonjs");
const stdin_1 = require("@stoplight/spectral-ruleset-bundler/plugins/stdin");
const spectral_ruleset_migrator_1 = require("@stoplight/spectral-ruleset-migrator");
const path = require("@stoplight/path");
const rollup_1 = require("rollup");
const buildFileResolver = (documents, console) => {
    return (ref) => {
        console.log(`[DBG] documents.keys => ${JSON.stringify(documents.keys())}`);
        console.log(`[DBG] fileResolver.resolve => ${ref.toString()}`);
        const lookedUpUri = vscode_uri_1.URI.file(ref.toString());
        console.log(`[DBG] lookedUpUri => ${lookedUpUri}`);
        const lookedUpUriStr = lookedUpUri.toString();
        for (const key of documents.keys()) {
            console.log(`[DBG] uri => ${key}`);
            console.log(`[DBG] key ==? lookedUpUri => ${key === lookedUpUriStr}`);
            if (key === lookedUpUriStr) {
                const doc = documents.get(lookedUpUriStr);
                if (doc === undefined) {
                    throw new Error(`Unexpected undefined doc '${lookedUpUriStr}'`);
                }
                return Promise.resolve(doc.getText());
            }
        }
        return (0, json_ref_readers_1.resolveFile)(ref);
    };
};
function createHttpAndFileResolver(documents, uriCache, console) {
    const resolveHttp = (0, json_ref_readers_1.createResolveHttp)();
    return new json_ref_resolver_1.Resolver({
        resolvers: {
            https: { resolve: resolveHttp },
            http: { resolve: resolveHttp },
            file: { resolve: buildFileResolver(documents, console) },
        },
        uriCache,
    });
}
exports.createHttpAndFileResolver = createHttpAndFileResolver;
const buildSpectralInstance = (documents, uriCache, console) => {
    const spectral = new spectral_core_1.Spectral({
        resolver: createHttpAndFileResolver(documents, uriCache, console),
    });
    return spectral;
};
class Linter {
    constructor(documents, console) {
        this.cache = new json_ref_resolver_1.Cache();
        this.spectral = buildSpectralInstance(documents, this.cache, console);
    }
    async lint(document, ruleset) {
        if (ruleset) {
            this.spectral.setRuleset(ruleset);
        }
        else {
            this.spectral.setRuleset({
                rules: {},
            });
        }
        const text = document.getText();
        const file = vscode_uri_1.URI.parse(document.uri).fsPath;
        const doc = new spectral_core_1.Document(text, Parsers.Yaml, file);
        this.cache.purge();
        return this.spectral.run(doc, { ignoreUnknownFormat: true });
    }
    static async loadRuleset(filepath, io) {
        let rulesetFile = filepath;
        const plugins = [...(0, runtime_1.runtime)(io), (0, commonjs_1.commonjs)()];
        if (/\.(json|ya?ml)$/.test(path.extname(filepath))) {
            rulesetFile = path.join(path.dirname(rulesetFile), '.spectral.js');
            plugins.unshift((0, stdin_1.stdin)(await (0, spectral_ruleset_migrator_1.migrateRuleset)(filepath, { format: 'esm', ...io }), rulesetFile));
        }
        const bundle = await (0, rollup_1.rollup)({
            input: rulesetFile,
            plugins,
            treeshake: false,
            watch: false,
            perf: false,
            onwarn(e, fn) {
                if (e.code === 'MISSING_NAME_OPTION_FOR_IIFE_EXPORT') {
                    return;
                }
                fn(e);
            },
        });
        const outputChunk = (await bundle.generate({ format: 'iife', exports: 'auto' })).output[0];
        return {
            dependencies: Object.keys(outputChunk.modules).filter((m) => path.isAbsolute(m) && !path.isURL(m)),
            ruleset: new spectral_core_1.Ruleset(Function(`return ${outputChunk.code}`)(), {
                severity: 'recommended',
                source: rulesetFile,
            }),
        };
    }
}
exports.Linter = Linter;
//# sourceMappingURL=linter.js.map