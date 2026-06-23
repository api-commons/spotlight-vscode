"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateNotification = exports.StartWatcherNotification = void 0;
const vscode_languageserver_1 = require("vscode-languageserver");
var StartWatcherNotification;
(function (StartWatcherNotification) {
    StartWatcherNotification.type = new vscode_languageserver_1.NotificationType('spotlight/startWatcher');
})(StartWatcherNotification = exports.StartWatcherNotification || (exports.StartWatcherNotification = {}));
var ValidateNotification;
(function (ValidateNotification) {
    ValidateNotification.type = new vscode_languageserver_1.NotificationType('spotlight/validate');
})(ValidateNotification = exports.ValidateNotification || (exports.ValidateNotification = {}));
//# sourceMappingURL=notifications.js.map