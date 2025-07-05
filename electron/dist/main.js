"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generative_ai_1 = require("@google/generative-ai");
const electron_1 = require("electron");
const electron_store_1 = __importDefault(require("electron-store"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const store = new electron_store_1.default({
    defaults: {
        apiKey: '',
    },
});
// Window references
let inputWindow = null;
let responseWindow = null;
const isDevelopment = process.env.NODE_ENV !== 'production';
function getRendererUrl(route) {
    if (isDevelopment) {
        return `http://localhost:3000${route}`;
    }
    return (0, url_1.format)({
        pathname: path_1.default.join(__dirname, `../../out${route}.html`),
        protocol: 'file',
        slashes: true,
    });
}
function createInputWindow() {
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    inputWindow = new electron_1.BrowserWindow({
        width: 600,
        height: 80,
        x: Math.round((width - 600) / 2),
        y: 20, // Position at top of screen
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        movable: true, // Make it draggable
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
    });
    inputWindow.loadURL(getRendererUrl('/input'));
    // Don't hide on blur - user can drag it around
    inputWindow.on('closed', () => {
        inputWindow = null;
    });
}
function createResponseWindow() {
    if (responseWindow) {
        responseWindow.focus();
        return;
    }
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    responseWindow = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
        x: Math.round((width - 800) / 2),
        y: Math.round((height - 600) / 2),
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: true,
        skipTaskbar: true,
        show: false,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
    });
    responseWindow.loadURL(getRendererUrl('/response'));
    responseWindow.on('closed', () => {
        responseWindow = null;
    });
}
electron_1.app.on('ready', () => {
    createInputWindow();
    // Changed to Ctrl+/
    electron_1.globalShortcut.register('CommandOrControl+/', () => {
        if (inputWindow) {
            if (inputWindow.isVisible())
                inputWindow.hide();
            else
                inputWindow.show();
        }
        else {
            createInputWindow();
        }
    });
    // Clear and return to input
    electron_1.globalShortcut.register('CommandOrControl+R', () => {
        if (responseWindow) {
            responseWindow.close();
        }
        if (inputWindow) {
            inputWindow.webContents.send('clear-input');
            inputWindow.show();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createInputWindow();
});
electron_1.app.on('will-quit', () => electron_1.globalShortcut.unregisterAll());
// IPC Handlers
electron_1.ipcMain.on('close-response', () => responseWindow === null || responseWindow === void 0 ? void 0 : responseWindow.close());
electron_1.ipcMain.on('hide-input', () => inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.hide());
electron_1.ipcMain.on('show-input', () => inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.show());
electron_1.ipcMain.handle('get-api-key', () => store.get('apiKey'));
electron_1.ipcMain.on('save-api-key', (_event, key) => store.set('apiKey', key));
function captureScreen() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get the display where the input window is currently located
            const inputBounds = inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.getBounds();
            if (!inputBounds)
                return null;
            const displays = electron_1.screen.getAllDisplays();
            const currentDisplay = displays.find((display) => {
                const { x, y, width, height } = display.bounds;
                return (inputBounds.x >= x &&
                    inputBounds.x < x + width &&
                    inputBounds.y >= y &&
                    inputBounds.y < y + height);
            }) || electron_1.screen.getPrimaryDisplay();
            const { width, height } = currentDisplay.size;
            const sources = yield electron_1.desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width, height },
            });
            const screenSource = sources.find((s) => String(s.display_id) === String(currentDisplay.id));
            if (!screenSource) {
                throw new Error('Screen source not found.');
            }
            return screenSource.thumbnail.toDataURL().split(',')[1];
        }
        catch (e) {
            console.error('Screen capture failed:', e);
            return null;
        }
    });
}
electron_1.ipcMain.handle('capture-and-ask', (_event_1, _a) => __awaiter(void 0, [_event_1, _a], void 0, function* (_event, { prompt, model, includeImage, }) {
    var _b, e_1, _c, _d;
    const apiKey = store.get('apiKey');
    if (!apiKey) {
        inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.webContents.send('error', 'API key not set. Please add it in settings.');
        return;
    }
    inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.hide();
    let imageBase64 = null;
    if (includeImage) {
        imageBase64 = yield captureScreen();
        if (!imageBase64 && includeImage) {
            inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.show();
            inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.webContents.send('error', 'Failed to capture screen.');
            return;
        }
    }
    if (!responseWindow)
        createResponseWindow();
    responseWindow === null || responseWindow === void 0 ? void 0 : responseWindow.show();
    responseWindow === null || responseWindow === void 0 ? void 0 : responseWindow.focus();
    responseWindow === null || responseWindow === void 0 ? void 0 : responseWindow.webContents.send('ai-response-start', { prompt });
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const aiModel = genAI.getGenerativeModel({ model });
        const generationPrompt = [];
        if (imageBase64) {
            generationPrompt.push({
                inlineData: { mimeType: 'image/png', data: imageBase64 },
            });
        }
        generationPrompt.push({ text: prompt || 'Analyze this' });
        const result = yield aiModel.generateContentStream(generationPrompt);
        try {
            for (var _e = true, _f = __asyncValues(result.stream), _g; _g = yield _f.next(), _b = _g.done, !_b; _e = true) {
                _d = _g.value;
                _e = false;
                const chunk = _d;
                if (responseWindow && !responseWindow.isDestroyed()) {
                    responseWindow.webContents.send('ai-response-chunk', chunk.text());
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_e && !_b && (_c = _f.return)) yield _c.call(_f);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error
            ? error.message
            : 'An unknown AI error occurred.';
        console.error('AI Error:', error);
        if (responseWindow && !responseWindow.isDestroyed()) {
            responseWindow.webContents.send('ai-response-chunk', `\n\nError: ${errorMessage}`);
        }
    }
    finally {
        if (responseWindow && !responseWindow.isDestroyed()) {
            responseWindow.webContents.send('ai-response-end');
        }
    }
}));
