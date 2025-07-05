import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray,
} from 'electron';
import Store from 'electron-store';
import fs from 'fs';
import path from 'path';
import { format as formatUrl } from 'url';

// Store Schema
type StoreSchema = {
  apiKey: string;
  windowPosition: { x: number; y: number };
  selectedModel: string;
  includeImageByDefault: boolean;
  shortcuts: {
    toggle: string;
    clear: string;
  };
};

// Use any type to avoid TypeScript errors with electron-store
const store: any = new Store<StoreSchema>({
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
let inputWindow: BrowserWindow | null = null;
let responseWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// State
let lastCapturedImage: string | null = null;
let isQuitting = false;

const isDevelopment = process.env.NODE_ENV !== 'production';

// Logging function
const log = (message: string, type: 'info' | 'error' | 'warn' = 'info') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;

  if (isDevelopment) {
    console.log(logMessage);
  }

  try {
    const logPath = path.join(app.getPath('userData'), 'app.log');
    fs.appendFileSync(logPath, logMessage + '\n');
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
};

function getRendererUrl(route: string): string {
  if (isDevelopment) {
    return `http://localhost:3000${route}`;
  }
  return formatUrl({
    pathname: path.join(__dirname, `../../out${route}.html`),
    protocol: 'file',
    slashes: true,
  });
}

function createInputWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  // Get saved position or calculate default
  const savedPosition = store.get('windowPosition');
  const defaultX = Math.round((width - 600) / 2);
  const x = savedPosition?.x ?? defaultX;
  const y = savedPosition?.y ?? 20;

  inputWindow = new BrowserWindow({
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
      preload: path.join(__dirname, 'preload.js'),
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

function createResponseWindow(): void {
  if (responseWindow) {
    responseWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  responseWindow = new BrowserWindow({
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
      preload: path.join(__dirname, 'preload.js'),
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

function createTray(): void {
  try {
    // Create a simple tray icon - in production, use a proper icon file
    const icon = nativeImage.createEmpty();
    // For now, create a 16x16 transparent icon
    const size = { width: 16, height: 16 };
    icon.addRepresentation({
      width: size.width,
      height: size.height,
      buffer: Buffer.alloc(size.width * size.height * 4, 0),
    });

    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Assistant',
        click: () => {
          if (inputWindow) {
            inputWindow.show();
          } else {
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
          const logPath = path.join(app.getPath('userData'), 'app.log');
          shell.openPath(logPath);
        },
      },
      {
        label: 'Clear Screenshots Cache',
        click: () => {
          lastCapturedImage = null;
          dialog.showMessageBox({
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
          app.quit();
        },
      },
    ]);

    tray.setToolTip('AI Screen Assistant');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (inputWindow) {
        if (inputWindow.isVisible()) {
          inputWindow.hide();
        } else {
          inputWindow.show();
        }
      } else {
        createInputWindow();
      }
    });

    log('Tray created');
  } catch (e) {
    log(`Failed to create tray: ${e}`, 'error');
  }
}

app.on('ready', () => {
  log('App starting...');

  createInputWindow();
  createTray();

  // Register shortcuts
  const shortcuts = store.get('shortcuts');

  globalShortcut.register(shortcuts.toggle, () => {
    if (inputWindow) {
      if (inputWindow.isVisible()) {
        inputWindow.hide();
      } else {
        inputWindow.show();
      }
    } else {
      createInputWindow();
    }
    log('Toggle shortcut activated');
  });

  globalShortcut.register(shortcuts.clear, () => {
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createInputWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  log('App quitting...');
});

app.on('before-quit', (event) => {
  if (!isQuitting && process.platform === 'darwin') {
    event.preventDefault();
    if (inputWindow) {
      inputWindow.hide();
    }
  }
});

// IPC Handlers
ipcMain.on('close-response', () => {
  responseWindow?.close();
});

ipcMain.on('hide-input', () => {
  inputWindow?.hide();
});

ipcMain.on('show-input', () => {
  inputWindow?.show();
});

ipcMain.handle('get-api-key', () => {
  return store.get('apiKey');
});

ipcMain.on('save-api-key', (_event, key: string) => {
  store.set('apiKey', key);
  log('API key updated');
});

ipcMain.handle('get-settings', () => {
  return {
    selectedModel: store.get('selectedModel'),
    includeImageByDefault: store.get('includeImageByDefault'),
    shortcuts: store.get('shortcuts'),
  };
});

ipcMain.on('save-settings', (_event, settings: any) => {
  if (settings.selectedModel) {
    store.set('selectedModel', settings.selectedModel);
  }
  if (settings.includeImageByDefault !== undefined) {
    store.set('includeImageByDefault', settings.includeImageByDefault);
  }
  log('Settings updated');
});

ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
  };
});

ipcMain.on('open-external', (_event, url: string) => {
  shell.openExternal(url);
});

// Listen for settings open from tray
ipcMain.on('open-settings-from-tray', () => {
  if (inputWindow) {
    inputWindow.webContents.send('open-settings-from-tray');
  }
});

async function captureScreen(): Promise<string | null> {
  try {
    // Get the display where the input window is currently located
    const inputBounds = inputWindow?.getBounds();
    if (!inputBounds) {
      log('Input window bounds not found', 'error');
      return null;
    }

    const displays = screen.getAllDisplays();
    const currentDisplay =
      displays.find((display) => {
        const { x, y, width, height } = display.bounds;
        return (
          inputBounds.x >= x &&
          inputBounds.x < x + width &&
          inputBounds.y >= y &&
          inputBounds.y < y + height
        );
      }) || screen.getPrimaryDisplay();

    log(`Capturing display: ${currentDisplay.id}`);

    const { width, height } = currentDisplay.size;
    const scaleFactor = currentDisplay.scaleFactor || 1;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: width * scaleFactor,
        height: height * scaleFactor,
      },
    });

    const screenSource = sources.find(
      (s) => String(s.display_id) === String(currentDisplay.id)
    );

    if (!screenSource) {
      throw new Error('Screen source not found.');
    }

    const imageData = screenSource.thumbnail.toDataURL().split(',')[1];
    log('Screen captured successfully');
    return imageData;
  } catch (e) {
    log(`Screen capture failed: ${e}`, 'error');
    inputWindow?.webContents.send('error', 'Failed to capture the screen.');
    return null;
  }
}

ipcMain.handle(
  'capture-and-ask',
  async (
    _event,
    {
      prompt,
      model,
      includeImage,
    }: { prompt: string; model: string; includeImage: boolean }
  ) => {
    log(
      `Processing query: "${prompt}" with model: ${model}, includeImage: ${includeImage}`
    );

    const apiKey = store.get('apiKey');
    if (!apiKey) {
      inputWindow?.webContents.send(
        'error',
        'API key not set. Please add it in settings.'
      );
      log('API key not set', 'error');
      return;
    }

    // Only hide input window if capturing new image
    if (includeImage && inputWindow?.isVisible()) {
      inputWindow.hide();
    }

    let imageBase64 = null;

    if (includeImage) {
      // Capture new screenshot
      imageBase64 = await captureScreen();
      if (!imageBase64) {
        inputWindow?.show();
        inputWindow?.webContents.send('error', 'Failed to capture screen.');
        return;
      }
      // Store for potential follow-ups
      lastCapturedImage = imageBase64;
    } else if (lastCapturedImage) {
      // Use the last captured image for follow-up
      imageBase64 = lastCapturedImage;
      log('Using cached screenshot for follow-up');
    }

    if (!responseWindow) {
      createResponseWindow();
    }

    responseWindow?.show();
    responseWindow?.focus();
    responseWindow?.webContents.send('ai-response-start', { prompt });

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const aiModel = genAI.getGenerativeModel({ model });

      const generationPrompt = [];
      if (imageBase64) {
        generationPrompt.push({
          inlineData: { mimeType: 'image/png', data: imageBase64 },
        });
      }
      generationPrompt.push({ text: prompt || 'Analyze this' });

      const result = await aiModel.generateContentStream(generationPrompt);

      for await (const chunk of result.stream) {
        if (responseWindow && !responseWindow.isDestroyed()) {
          responseWindow.webContents.send('ai-response-chunk', chunk.text());
        }
      }

      log('AI response completed successfully');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unknown AI error occurred.';
      log(`AI Error: ${errorMessage}`, 'error');

      if (responseWindow && !responseWindow.isDestroyed()) {
        responseWindow.webContents.send(
          'ai-response-chunk',
          `\n\nError: ${errorMessage}`
        );
      }
    } finally {
      if (responseWindow && !responseWindow.isDestroyed()) {
        responseWindow.webContents.send('ai-response-end');
      }
    }
  }
);
