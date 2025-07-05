"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const electron_1 = require("electron");
exports.api = {
    closeResponse: () => electron_1.ipcRenderer.send('close-response'),
    hideInput: () => electron_1.ipcRenderer.send('hide-input'),
    showInput: () => electron_1.ipcRenderer.send('show-input'),
    saveApiKey: (key) => electron_1.ipcRenderer.send('save-api-key', key),
    getApiKey: () => electron_1.ipcRenderer.invoke('get-api-key'),
    captureAndAsk: (args) => electron_1.ipcRenderer.invoke('capture-and-ask', args),
    on: (channel, callback) => {
        const validChannels = [
            'ai-response-start',
            'ai-response-chunk',
            'ai-response-end',
            'error',
            'clear-input',
        ];
        if (validChannels.includes(channel)) {
            const subscription = (_event, ...args) => callback(...args);
            electron_1.ipcRenderer.on(channel, subscription);
            return () => electron_1.ipcRenderer.removeListener(channel, subscription);
        }
    },
};
electron_1.contextBridge.exposeInMainWorld('api', exports.api);
