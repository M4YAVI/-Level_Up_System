"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const electron_1 = require("electron");
exports.api = {
    // Window controls
    closeResponse: () => electron_1.ipcRenderer.send('close-response'),
    hideInput: () => electron_1.ipcRenderer.send('hide-input'),
    showInput: () => electron_1.ipcRenderer.send('show-input'),
    // Settings
    saveApiKey: (key) => electron_1.ipcRenderer.send('save-api-key', key),
    getApiKey: () => electron_1.ipcRenderer.invoke('get-api-key'),
    getSettings: () => electron_1.ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => electron_1.ipcRenderer.send('save-settings', settings),
    // AI functionality
    captureAndAsk: (args) => electron_1.ipcRenderer.invoke('capture-and-ask', args),
    // App info
    getAppInfo: () => electron_1.ipcRenderer.invoke('get-app-info'),
    // External links
    openExternal: (url) => electron_1.ipcRenderer.send('open-external', url),
    // Event listeners
    on: (channel, callback) => {
        const validChannels = [
            'ai-response-start',
            'ai-response-chunk',
            'ai-response-end',
            'error',
            'clear-input',
            'open-settings-from-tray',
        ];
        if (validChannels.includes(channel)) {
            const subscription = (_event, ...args) => callback(...args);
            electron_1.ipcRenderer.on(channel, subscription);
            return () => electron_1.ipcRenderer.removeListener(channel, subscription);
        }
    },
};
electron_1.contextBridge.exposeInMainWorld('api', exports.api);
