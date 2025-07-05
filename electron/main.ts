import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  app,
  BrowserWindow,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  screen,
} from 'electron';
import Store from 'electron-store';
import path from 'path';
import { format as formatUrl } from 'url';

type StoreSchema = {
  apiKey: string;
};

const store: any = new Store<StoreSchema>({
  defaults: {
    apiKey: '',
  },
});

// Window references
let inputWindow: BrowserWindow | null = null;
let responseWindow: BrowserWindow | null = null;

const isDevelopment = process.env.NODE_ENV !== 'production';

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

  inputWindow = new BrowserWindow({
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
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  inputWindow.loadURL(getRendererUrl('/input'));

  // Don't hide on blur - user can drag it around
  inputWindow.on('closed', () => {
    inputWindow = null;
  });
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
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  responseWindow.loadURL(getRendererUrl('/response'));
  responseWindow.on('closed', () => {
    responseWindow = null;
  });
}

app.on('ready', () => {
  createInputWindow();

  // Changed to Ctrl+/
  globalShortcut.register('CommandOrControl+/', () => {
    if (inputWindow) {
      if (inputWindow.isVisible()) inputWindow.hide();
      else inputWindow.show();
    } else {
      createInputWindow();
    }
  });

  // Clear and return to input
  globalShortcut.register('CommandOrControl+R', () => {
    if (responseWindow) {
      responseWindow.close();
    }
    if (inputWindow) {
      inputWindow.webContents.send('clear-input');
      inputWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createInputWindow();
});

app.on('will-quit', () => globalShortcut.unregisterAll());

// IPC Handlers
ipcMain.on('close-response', () => responseWindow?.close());
ipcMain.on('hide-input', () => inputWindow?.hide());
ipcMain.on('show-input', () => inputWindow?.show());

ipcMain.handle('get-api-key', () => store.get('apiKey'));
ipcMain.on('save-api-key', (_event, key: string) => store.set('apiKey', key));

async function captureScreen(): Promise<string | null> {
  try {
    // Get the display where the input window is currently located
    const inputBounds = inputWindow?.getBounds();
    if (!inputBounds) return null;

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

    const { width, height } = currentDisplay.size;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
    });

    const screenSource = sources.find(
      (s) => String(s.display_id) === String(currentDisplay.id)
    );

    if (!screenSource) {
      throw new Error('Screen source not found.');
    }

    return screenSource.thumbnail.toDataURL().split(',')[1];
  } catch (e) {
    console.error('Screen capture failed:', e);
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
    const apiKey = store.get('apiKey');
    if (!apiKey) {
      inputWindow?.webContents.send(
        'error',
        'API key not set. Please add it in settings.'
      );
      return;
    }

    inputWindow?.hide();

    let imageBase64 = null;
    if (includeImage) {
      imageBase64 = await captureScreen();
      if (!imageBase64 && includeImage) {
        inputWindow?.show();
        inputWindow?.webContents.send('error', 'Failed to capture screen.');
        return;
      }
    }

    if (!responseWindow) createResponseWindow();
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unknown AI error occurred.';
      console.error('AI Error:', error);
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
