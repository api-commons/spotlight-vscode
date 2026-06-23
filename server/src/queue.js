"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BufferedMessageQueue = void 0;
class BufferedMessageQueue {
    constructor(connection) {
        this.connection = connection;
        this.queue = [];
        this.notificationHandlers = new Map();
    }
    registerNotification(type, handler, versionProvider) {
        this.connection.onNotification(type, (params) => {
            this.queue.push({
                method: type.method,
                params: params,
                documentVersion: versionProvider ? versionProvider(params) : undefined,
            });
            this.trigger();
        });
        this.notificationHandlers.set(type.method, { handler, versionProvider });
    }
    addNotificationMessage(type, params, version) {
        this.queue.push({
            method: type.method,
            params,
            documentVersion: version,
        });
        this.trigger();
    }
    onNotification(type, handler, versionProvider) {
        this.notificationHandlers.set(type.method, { handler, versionProvider });
    }
    trigger() {
        if (this.timer || this.queue.length === 0) {
            return;
        }
        this.timer = setImmediate(() => {
            this.timer = undefined;
            this.processQueue();
            this.trigger();
        });
    }
    processQueue() {
        const message = this.queue.shift();
        if (!message) {
            return;
        }
        const elem = this.notificationHandlers.get(message.method);
        if (elem === undefined) {
            throw new Error(`No handler registered`);
        }
        if (elem.versionProvider && message.documentVersion !== undefined && message.documentVersion !== elem.versionProvider(message.params)) {
            return;
        }
        elem.handler(message.params);
    }
}
exports.BufferedMessageQueue = BufferedMessageQueue;
//# sourceMappingURL=queue.js.map