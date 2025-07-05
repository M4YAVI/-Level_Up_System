import { contextBridge, ipcRenderer } from 'electron';

export const api = {
  // Window controls
  closeResponse: () => ipcRenderer.send('close-response'),
  hideInput: () => ipcRenderer.send('hide-input'),
  showInput: () => ipcRenderer.send('show-input'),

  // Settings
  saveApiKey: (key: string) => ipcRenderer.send('save-api-key', key),
  getApiKey: (): Promise<string> => ipcRenderer.invoke('get-api-key'),
  getSettings: (): Promise<any> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.send('save-settings', settings),

  // AI functionality
  captureAndAsk: (args: {
    prompt: string;
    model: string;
    includeImage: boolean;
  }): Promise<void> => ipcRenderer.invoke('capture-and-ask', args),

  // App info
  getAppInfo: (): Promise<any> => ipcRenderer.invoke('get-app-info'),

  // External links
  openExternal: (url: string) => ipcRenderer.send('open-external', url),

  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'ai-response-start',
      'ai-response-chunk',
      'ai-response-end',
      'error',
      'clear-input',
      'open-settings-from-tray',
    ];
    if (validChannels.includes(channel)) {
      const subscription = (
        _event: Electron.IpcRendererEvent,
        ...args: any[]
      ) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  },
};

contextBridge.exposeInMainWorld('api', api);
