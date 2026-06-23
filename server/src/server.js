"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const minimatch_1 = require("minimatch");
const vscode_languageserver_1 = require("vscode-languageserver");
const is_1 = require("vscode-languageserver/lib/utils/is");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const vscode_uri_1 = require("vscode-uri");
const spotlight_core_1 = require("@spotlight-rules/spotlight-core");
const spotlight_rulesets_1 = require("@spotlight-rules/spotlight-rulesets");
const spotlight_runtime_1 = require("@spotlight-rules/spotlight-runtime");
const linter_1 = require("./linter");
const notifications_1 = require("./notifications");
const queue_1 = require("./queue");
const util_1 = require("./util");
const connection = (0, vscode_languageserver_1.createConnection)(vscode_languageserver_1.ProposedFeatures.all);
const documentSettings = new Map();
const seenDependencies = new Map();
const messageQueue = new queue_1.BufferedMessageQueue(connection);
let linter;
let documents;
function environmentChanged() {
    connection.console.info('Environment changed; refreshing validation results.');
    documentSettings.clear();
    seenDependencies.clear();
    for (const document of documents.all()) {
        connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
        messageQueue.addNotificationMessage(notifications_1.ValidateNotification.type, document, document.version);
    }
}
function getDocumentPath(documentOrUri) {
    if (!documentOrUri) {
        return undefined;
    }
    let uri;
    if ((0, is_1.string)(documentOrUri)) {
        uri = vscode_uri_1.URI.parse(documentOrUri);
    }
    else if (documentOrUri instanceof vscode_uri_1.URI) {
        uri = documentOrUri;
    }
    else {
        uri = vscode_uri_1.URI.parse(documentOrUri.uri);
    }
    if (uri.scheme !== 'file') {
        return undefined;
    }
    return uri.fsPath;
}
async function getDefaultRulesetFile(dirpath) {
    if (!dirpath)
        return;
    const workspaceFolderFs = getDocumentPath(dirpath);
    if (!workspaceFolderFs)
        return;
    try {
        for (const filename of await fs.promises.readdir(workspaceFolderFs)) {
            if (spotlight_core_1.Ruleset.isDefaultRulesetFile(filename)) {
                return path.join(workspaceFolderFs, filename);
            }
        }
    }
    catch {
        return;
    }
}
function resolveSettings(document) {
    const uri = document.uri;
    let resultPromise = documentSettings.get(uri);
    if (resultPromise) {
        return resultPromise;
    }
    resultPromise = connection.workspace.getConfiguration({ scopeUri: uri, section: '' })
        .then(async (configuration) => {
        var _a, _b, _c;
        const settings = {
            validate: configuration.enable,
            run: configuration.run,
            ruleset: undefined,
        };
        if (!settings.validate) {
            return settings;
        }
        if (configuration.validateLanguages &&
            !configuration.validateLanguages.some((value) => document.languageId === value)) {
            connection.console.log(`File ${document.uri} (${document.languageId}) doesn't match any of the specified language types; skipping.`);
            settings.validate = false;
            return settings;
        }
        const docPath = getDocumentPath(document.uri);
        if (!(0, is_1.string)(docPath)) {
            return settings;
        }
        if (configuration.validateFiles && configuration.validateFiles.length > 0) {
            const positiveGlobs = [];
            const negativeGlobs = [];
            for (const globEntry of configuration.validateFiles) {
                const miniMatch = new minimatch_1.Minimatch(globEntry, { matchBase: true });
                if (miniMatch.negate) {
                    miniMatch.options.flipNegate = true;
                    negativeGlobs.push(miniMatch);
                }
                else {
                    positiveGlobs.push(miniMatch);
                }
            }
            if (positiveGlobs.length > 0 && !positiveGlobs.some((glob) => glob.match(docPath))) {
                connection.console.log(`File ${document.uri} doesn't match any of the specified positive file globs; skipping.`);
                settings.validate = false;
                return settings;
            }
            if (negativeGlobs.some((glob) => glob.match(docPath))) {
                connection.console.log(`File ${document.uri} matches a specified negative file glob; skipping.`);
                settings.validate = false;
                return settings;
            }
        }
        let rulesetFile = null;
        connection.console.log(`Using ruleset file: ${configuration.rulesetFile}.`);
        let rulesetFileIsUrl = false;
        if (configuration.rulesetFile) {
            const ruleSetUri = vscode_uri_1.URI.parse(configuration.rulesetFile);
            rulesetFileIsUrl = vscode_uri_1.URI.isUri(ruleSetUri) && (ruleSetUri.scheme === 'https' || ruleSetUri.scheme === 'http');
            if (configuration.workspaceFolder && !rulesetFileIsUrl) {
                rulesetFile = path.resolve((_a = getDocumentPath(configuration.workspaceFolder.uri)) !== null && _a !== void 0 ? _a : '', configuration.rulesetFile);
            }
            else {
                rulesetFile = configuration.rulesetFile;
            }
        }
        else {
            rulesetFile = (_c = (await getDefaultRulesetFile((_b = configuration.workspaceFolder) === null || _b === void 0 ? void 0 : _b.uri))) !== null && _c !== void 0 ? _c : null;
        }
        if (rulesetFile && (rulesetFileIsUrl || fs.existsSync(rulesetFile))) {
            if (docPath === rulesetFile) {
                settings.validate = false;
                return settings;
            }
            if (!rulesetFileIsUrl) {
                connection.sendNotification(notifications_1.StartWatcherNotification.type, { path: rulesetFile });
            }
            try {
                const { ruleset, dependencies } = await linter_1.Linter.loadRuleset(rulesetFile, { fs, fetch: spotlight_runtime_1.fetch });
                for (const dependency of dependencies) {
                    connection.sendNotification(notifications_1.StartWatcherNotification.type, { path: dependency });
                }
                settings.ruleset = ruleset;
            }
            catch (err) {
                showErrorMessage(docPath, `Unable to read ruleset at ${rulesetFile}. ${err}`);
            }
        }
        else {
            settings.ruleset = new spotlight_core_1.Ruleset({
                extends: [spotlight_rulesets_1.oas, spotlight_rulesets_1.asyncapi],
            });
        }
        return settings;
    });
    documentSettings.set(uri, resultPromise);
    return resultPromise;
}
function setupDocumentListener() {
    documents.listen(connection);
    documents.onDidOpen((event) => {
        resolveSettings(event.document).then((settings) => {
            if (!settings.validate || settings.run !== 'onSave') {
                return;
            }
            messageQueue.addNotificationMessage(notifications_1.ValidateNotification.type, event.document, event.document.version);
        });
    });
    documents.onDidChangeContent((event) => {
        resolveSettings(event.document).then((settings) => {
            if (!settings.validate || settings.run !== 'onType') {
                return;
            }
            messageQueue.addNotificationMessage(notifications_1.ValidateNotification.type, event.document, event.document.version);
        });
    });
    documents.onDidSave((event) => {
        resolveSettings(event.document).then((settings) => {
            if (!settings.validate || settings.run !== 'onSave') {
                return;
            }
            messageQueue.addNotificationMessage(notifications_1.ValidateNotification.type, event.document, event.document.version);
        });
    });
    documents.onDidClose((event) => {
        resolveSettings(event.document).then((settings) => {
            const uri = event.document.uri;
            if (settings.validate) {
                documentSettings.delete(uri);
                seenDependencies.delete(uri);
                connection.sendDiagnostics({ uri: uri, diagnostics: [] });
            }
        });
    });
}
function showErrorMessage(uri, err) {
    connection.window.showErrorMessage(`Spotlight: An error occurred while validating ${uri}. Please see the 'Spotlight' output channel for details.`);
    connection.console.error(`An error occurred while validating document ${uri}: ${err}`);
}
const findRoot = (document) => {
    connection.console.log(`Scan triggered file ${document.uri}.`);
    const rootUri = seenDependencies.get(document.uri);
    if (rootUri === undefined) {
        connection.console.log(`Linting root file ${document.uri}.`);
        return document;
    }
    connection.console.log(`Found root file ${rootUri}.`);
    const rootDocument = documents.get(rootUri);
    if (rootDocument === undefined) {
        throw new Error(`Unable to build a document from root '${rootUri}'`);
    }
    connection.console.log(`Linting inferred root file ${rootDocument.uri}.`);
    return rootDocument;
};
async function lintDocumentOrRoot(document, ruleset, currentDependencies) {
    const rootDocument = findRoot(document);
    const results = await linter.lint(rootDocument, ruleset);
    const knownDeps = new Set();
    if (document.uri !== rootDocument.uri) {
        knownDeps.add(document.uri);
    }
    for (const dep of currentDependencies) {
        if (dep[1] !== rootDocument.uri) {
            continue;
        }
        knownDeps.add(dep[0]);
    }
    connection.console.log(`[DBG] lintDocumentOrRoot. knownDeps=${JSON.stringify([...knownDeps])}`);
    const pdps = (0, util_1.makePublishDiagnosticsParams)(rootDocument.uri, [...knownDeps], results);
    const deps = pdps.filter((e) => e.uri !== rootDocument.uri).map((e) => [e.uri, rootDocument.uri]);
    return [pdps, deps];
}
const dump = (input) => {
    for (const [key, value] of input.entries()) {
        connection.console.log(key + ' $reffed by ' + value);
    }
    connection.console.log('-----');
};
function validate(document) {
    return resolveSettings(document).then(async (settings) => {
        if (!settings.validate) {
            return;
        }
        try {
            connection.console.log(`seenDependencies (before): ${seenDependencies.size}.`);
            dump(seenDependencies);
            const [pdps, deps] = await lintDocumentOrRoot(document, settings.ruleset, seenDependencies);
            connection.console.log(`pdps: ${JSON.stringify(pdps, null, 2)}.`);
            connection.console.log(`deps: ${JSON.stringify(deps, null, 2)}.`);
            for (const [dep, root] of deps) {
                seenDependencies.set(dep, root);
            }
            connection.console.log(`seenDependencies (after): ${seenDependencies.size}.`);
            dump(seenDependencies);
            pdps.forEach((pdp) => connection.sendDiagnostics(pdp));
        }
        catch (err) {
            showErrorMessage(document.uri, err);
        }
    });
}
process.on('uncaughtException', (error) => {
    let message;
    if (error) {
        if (typeof error.stack === 'string') {
            message = error.stack;
        }
        else if (typeof error.message === 'string') {
            message = error.message;
        }
        else if (typeof error === 'string') {
            message = error;
        }
        if (message === undefined || message.length === 0) {
            try {
                message = JSON.stringify(error, undefined, 4);
            }
            catch (e) {
            }
        }
    }
    console.error('Uncaught exception received.');
    if (message) {
        console.error(message);
    }
});
messageQueue.onNotification(notifications_1.ValidateNotification.type, (document) => {
    validate(document);
}, (document) => {
    return document.version;
});
messageQueue.registerNotification(vscode_languageserver_1.DidChangeConfigurationNotification.type, (_params) => {
    environmentChanged();
});
messageQueue.registerNotification(vscode_languageserver_1.DidChangeWorkspaceFoldersNotification.type, (_params) => {
    environmentChanged();
});
messageQueue.registerNotification(vscode_languageserver_1.DidChangeWatchedFilesNotification.type, (_params) => {
    environmentChanged();
});
connection.onInitialize((_params, _cancel, progress) => {
    progress.begin('Initializing Spotlight Server');
    documents = new vscode_languageserver_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
    linter = new linter_1.Linter(documents, connection.console);
    setupDocumentListener();
    progress.done();
    return {
        capabilities: {
            textDocumentSync: {
                openClose: true,
                change: vscode_languageserver_1.TextDocumentSyncKind.Full,
                willSaveWaitUntil: false,
                save: {
                    includeText: false,
                },
            },
        },
    };
});
connection.onInitialized(() => {
    connection.client.register(vscode_languageserver_1.DidChangeConfigurationNotification.type, undefined);
    connection.client.register(vscode_languageserver_1.DidChangeWorkspaceFoldersNotification.type, undefined);
});
connection.listen();
//# sourceMappingURL=server.js.map