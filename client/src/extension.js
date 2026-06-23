"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const path = require("path");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const notifications_1 = require("./notifications");
let client;
let commands = undefined;
const watchers = new Map();
function createFileSystemWatcher(path) {
    const watcher = vscode_1.workspace.createFileSystemWatcher(path);
    watcher.onDidChange((event) => {
        client.info(`Ruleset file change: ${event.fsPath}`);
        sendFileChangeNotification(event.toString(), vscode_languageclient_1.FileChangeType.Changed);
    });
    watcher.onDidDelete((event) => {
        client.info(`Ruleset deleted: ${event.fsPath}`);
        sendFileChangeNotification(event.toString(), vscode_languageclient_1.FileChangeType.Deleted);
    });
    watcher.onDidCreate((event) => {
        client.info(`Ruleset created: ${event.fsPath}`);
        sendFileChangeNotification(event.toString(), vscode_languageclient_1.FileChangeType.Created);
    });
    return watcher;
}
function environmentChange() {
    for (const watcher of watchers.values()) {
        watcher.dispose();
    }
    watchers.clear();
}
function sendFileChangeNotification(uri, type) {
    const e = { changes: [{ uri: uri, type: type }] };
    client.sendNotification(vscode_languageclient_1.DidChangeWatchedFilesNotification.type, e);
}
function activate(context) {
    const serverModule = context.asAbsolutePath(path.join('server', 'index.js'));
    const serverOptions = {
        run: {
            module: serverModule,
            transport: vscode_languageclient_1.TransportKind.ipc,
        },
        debug: {
            module: serverModule,
            transport: vscode_languageclient_1.TransportKind.ipc,
            options: {
                execArgv: ['--nolazy', '--inspect=6262'],
            },
        },
    };
    const clientOptions = {
        documentSelector: [{ scheme: 'file' }, { scheme: 'untitled' }],
        diagnosticCollectionName: 'spotlight',
        revealOutputChannelOn: vscode_languageclient_1.RevealOutputChannelOn.Never,
        initializationFailedHandler: (error) => {
            client.error('Server initialization failed.', error);
            client.outputChannel.show(true);
            return false;
        },
        middleware: {
            workspace: {
                configuration: async (params, _token, _next) => {
                    if (params.items === undefined) {
                        return [];
                    }
                    const result = [];
                    for (const item of params.items) {
                        if (item.section || !item.scopeUri) {
                            result.push(null);
                            continue;
                        }
                        const resource = client.protocol2CodeConverter.asUri(item.scopeUri);
                        const config = vscode_1.workspace.getConfiguration('spotlight', resource);
                        const workspaceFolder = vscode_1.workspace.getWorkspaceFolder(resource);
                        const settings = {
                            enable: config.get('enable', true),
                            rulesetFile: config.get('rulesetFile', undefined),
                            run: config.get('run', 'onType'),
                            validateFiles: config.get('validateFiles', []),
                            validateLanguages: config.get('validateLanguages', ['json', 'yaml']),
                            workspaceFolder: undefined,
                        };
                        if (workspaceFolder !== undefined) {
                            settings.workspaceFolder = {
                                name: workspaceFolder.name,
                                uri: client.code2ProtocolConverter.asUri(workspaceFolder.uri),
                            };
                        }
                        result.push(settings);
                    }
                    return result;
                },
                didChangeConfiguration: (event, next) => {
                    environmentChange();
                    next(event);
                },
                didChangeWorkspaceFolders: (event, next) => {
                    environmentChange();
                    next(event);
                },
            },
        },
    };
    try {
        client = new vscode_languageclient_1.LanguageClient('spotlight', 'Spotlight', serverOptions, clientOptions);
    }
    catch (err) {
        vscode_1.window.showErrorMessage(`The Spotlight extension couldn't be started. See the Spotlight output channel for details.`);
        return;
    }
    client.onReady().then(() => {
        client.onNotification(notifications_1.StartWatcherNotification.type, (params) => {
            if (!watchers.has(params.path)) {
                client.info(`Watching: ${params.path}`);
                const watcher = createFileSystemWatcher(params.path);
                watchers.set(params.path, watcher);
            }
        });
    });
    client.start();
    commands = [vscode_1.commands.registerCommand('spotlight.showOutputChannel', () => {
            client.outputChannel.show();
        })];
}
exports.activate = activate;
function deactivate() {
    if (commands !== undefined) {
        commands.forEach((d) => d.dispose());
        commands = undefined;
    }
    if (!client) {
        return undefined;
    }
    return client.stop();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map