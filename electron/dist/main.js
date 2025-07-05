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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// Use any type to avoid TypeScript errors with electron-store
const store = new electron_store_1.default({
    defaults: {
        apiKey: '',
        windowPosition: { x: 0, y: 20 },
        selectedModel: 'gemini-1.5-flash-latest',
        includeImageByDefault: true,
        shortcuts: {
            toggle: 'CommandOrControl+/',
            clear: 'CommandOrControl+R',
        },
    },
});
// Window references
let inputWindow = null;
let responseWindow = null;
let tray = null;
// State
let lastCapturedImage = null;
let isQuitting = false;
const isDevelopment = process.env.NODE_ENV !== 'production';
// Logging function
const log = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    if (isDevelopment) {
        console.log(logMessage);
    }
    try {
        const logPath = path_1.default.join(electron_1.app.getPath('userData'), 'app.log');
        fs_1.default.appendFileSync(logPath, logMessage + '\n');
    }
    catch (e) {
        console.error('Failed to write to log file:', e);
    }
};
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
    var _a, _b;
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    // Get saved position or calculate default
    const savedPosition = store.get('windowPosition');
    const defaultX = Math.round((width - 600) / 2);
    const x = (_a = savedPosition === null || savedPosition === void 0 ? void 0 : savedPosition.x) !== null && _a !== void 0 ? _a : defaultX;
    const y = (_b = savedPosition === null || savedPosition === void 0 ? void 0 : savedPosition.y) !== null && _b !== void 0 ? _b : 20;
    inputWindow = new electron_1.BrowserWindow({
        width: 600,
        height: 80,
        x,
        y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        movable: true,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    inputWindow.loadURL(getRendererUrl('/input'));
    // Save position when moved
    inputWindow.on('moved', () => {
        if (inputWindow) {
            const [x, y] = inputWindow.getPosition();
            store.set('windowPosition', { x, y });
        }
    });
    inputWindow.on('closed', () => {
        inputWindow = null;
    });
    log('Input window created');
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
        minWidth: 600,
        minHeight: 400,
        maxWidth: 1200,
        maxHeight: 900,
        skipTaskbar: true,
        show: false,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    responseWindow.loadURL(getRendererUrl('/response'));
    responseWindow.on('closed', () => {
        responseWindow = null;
        lastCapturedImage = null; // Clear stored image
        log('Response window closed');
    });
    log('Response window created');
}
function createTray() {
    try {
        // Create a simple tray icon - in production, use a proper icon file
        const icon = electron_1.nativeImage.createEmpty();
        // For now, create a 16x16 transparent icon
        const size = { width: 16, height: 16 };
        icon.addRepresentation({
            width: size.width,
            height: size.height,
            buffer: Buffer.alloc(size.width * size.height * 4, 0),
        });
        tray = new electron_1.Tray(icon);
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: 'Show Assistant',
                click: () => {
                    if (inputWindow) {
                        inputWindow.show();
                    }
                    else {
                        createInputWindow();
                    }
                },
            },
            {
                label: 'Settings',
                click: () => {
                    if (inputWindow) {
                        inputWindow.show();
                        inputWindow.webContents.send('open-settings-from-tray');
                    }
                },
            },
            { type: 'separator' },
            {
                label: 'View Logs',
                click: () => {
                    const logPath = path_1.default.join(electron_1.app.getPath('userData'), 'app.log');
                    electron_1.shell.openPath(logPath);
                },
            },
            {
                label: 'Clear Screenshots Cache',
                click: () => {
                    lastCapturedImage = null;
                    electron_1.dialog.showMessageBox({
                        type: 'info',
                        message: 'Screenshot cache cleared',
                        buttons: ['OK'],
                    });
                },
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    isQuitting = true;
                    electron_1.app.quit();
                },
            },
        ]);
        tray.setToolTip('AI Screen Assistant');
        tray.setContextMenu(contextMenu);
        tray.on('click', () => {
            if (inputWindow) {
                if (inputWindow.isVisible()) {
                    inputWindow.hide();
                }
                else {
                    inputWindow.show();
                }
            }
            else {
                createInputWindow();
            }
        });
        log('Tray created');
    }
    catch (e) {
        log(`Failed to create tray: ${e}`, 'error');
    }
}
electron_1.app.on('ready', () => {
    log('App starting...');
    createInputWindow();
    createTray();
    // Register shortcuts
    const shortcuts = store.get('shortcuts');
    electron_1.globalShortcut.register(shortcuts.toggle, () => {
        if (inputWindow) {
            if (inputWindow.isVisible()) {
                inputWindow.hide();
            }
            else {
                inputWindow.show();
            }
        }
        else {
            createInputWindow();
        }
        log('Toggle shortcut activated');
    });
    electron_1.globalShortcut.register(shortcuts.clear, () => {
        if (responseWindow) {
            responseWindow.close();
        }
        if (inputWindow) {
            inputWindow.webContents.send('clear-input');
            inputWindow.show();
        }
        log('Clear shortcut activated');
    });
    log('App ready');
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && isQuitting) {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createInputWindow();
    }
});
electron_1.app.on('will-quit', () => {
    electron_1.globalShortcut.unregisterAll();
    log('App quitting...');
});
electron_1.app.on('before-quit', (event) => {
    if (!isQuitting && process.platform === 'darwin') {
        event.preventDefault();
        if (inputWindow) {
            inputWindow.hide();
        }
    }
});
// IPC Handlers
electron_1.ipcMain.on('close-response', () => {
    responseWindow === null || responseWindow === void 0 ? void 0 : responseWindow.close();
});
electron_1.ipcMain.on('hide-input', () => {
    inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.hide();
});
electron_1.ipcMain.on('show-input', () => {
    inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.show();
});
electron_1.ipcMain.handle('get-api-key', () => {
    return store.get('apiKey');
});
electron_1.ipcMain.on('save-api-key', (_event, key) => {
    store.set('apiKey', key);
    log('API key updated');
});
electron_1.ipcMain.handle('get-settings', () => {
    return {
        selectedModel: store.get('selectedModel'),
        includeImageByDefault: store.get('includeImageByDefault'),
        shortcuts: store.get('shortcuts'),
    };
});
electron_1.ipcMain.on('save-settings', (_event, settings) => {
    if (settings.selectedModel) {
        store.set('selectedModel', settings.selectedModel);
    }
    if (settings.includeImageByDefault !== undefined) {
        store.set('includeImageByDefault', settings.includeImageByDefault);
    }
    log('Settings updated');
});
electron_1.ipcMain.handle('get-app-info', () => {
    return {
        version: electron_1.app.getVersion(),
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
        platform: process.platform,
    };
});
electron_1.ipcMain.on('open-external', (_event, url) => {
    electron_1.shell.openExternal(url);
});
// Listen for settings open from tray
electron_1.ipcMain.on('open-settings-from-tray', () => {
    if (inputWindow) {
        inputWindow.webContents.send('open-settings-from-tray');
    }
});
function captureScreen() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get the display where the input window is currently located
            const inputBounds = inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.getBounds();
            if (!inputBounds) {
                log('Input window bounds not found', 'error');
                return null;
            }
            const displays = electron_1.screen.getAllDisplays();
            const currentDisplay = displays.find((display) => {
                const { x, y, width, height } = display.bounds;
                return (inputBounds.x >= x &&
                    inputBounds.x < x + width &&
                    inputBounds.y >= y &&
                    inputBounds.y < y + height);
            }) || electron_1.screen.getPrimaryDisplay();
            log(`Capturing display: ${currentDisplay.id}`);
            const { width, height } = currentDisplay.size;
            const scaleFactor = currentDisplay.scaleFactor || 1;
            const sources = yield electron_1.desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: {
                    width: width * scaleFactor,
                    height: height * scaleFactor,
                },
            });
            const screenSource = sources.find((s) => String(s.display_id) === String(currentDisplay.id));
            if (!screenSource) {
                throw new Error('Screen source not found.');
            }
            const imageData = screenSource.thumbnail.toDataURL().split(',')[1];
            log('Screen captured successfully');
            return imageData;
        }
        catch (e) {
            log(`Screen capture failed: ${e}`, 'error');
            inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.webContents.send('error', 'Failed to capture the screen.');
            return null;
        }
    });
}
electron_1.ipcMain.handle('capture-and-ask', (_event_1, _a) => __awaiter(void 0, [_event_1, _a], void 0, function* (_event, { prompt, model, includeImage, }) {
    var _b, e_1, _c, _d;
    log(`Processing query: "${prompt}" with model: ${model}, includeImage: ${includeImage}`);
    const apiKey = store.get('apiKey');
    if (!apiKey) {
        inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.webContents.send('error', 'API key not set. Please add it in settings.');
        log('API key not set', 'error');
        return;
    }
    // Only hide input window if capturing new image
    if (includeImage && (inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.isVisible())) {
        inputWindow.hide();
    }
    let imageBase64 = null;
    if (includeImage) {
        // Capture new screenshot
        imageBase64 = yield captureScreen();
        if (!imageBase64) {
            inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.show();
            inputWindow === null || inputWindow === void 0 ? void 0 : inputWindow.webContents.send('error', 'Failed to capture screen.');
            return;
        }
        // Store for potential follow-ups
        lastCapturedImage = imageBase64;
    }
    else if (lastCapturedImage) {
        // Use the last captured image for follow-up
        imageBase64 = lastCapturedImage;
        log('Using cached screenshot for follow-up');
    }
    if (!responseWindow) {
        createResponseWindow();
    }
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
        log('AI response completed successfully');
    }
    catch (error) {
        const errorMessage = error instanceof Error
            ? error.message
            : 'An unknown AI error occurred.';
        log(`AI Error: ${errorMessage}`, 'error');
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
