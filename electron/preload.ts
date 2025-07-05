import { contextBridge, ipcRenderer } from 'electron';

export const api = {
  closeResponse: () => ipcRenderer.send('close-response'),
  hideInput: () => ipcRenderer.send('hide-input'),
  showInput: () => ipcRenderer.send('show-input'),
  saveApiKey: (key: string) => ipcRenderer.send('save-api-key', key),
  getApiKey: (): Promise<string> => ipcRenderer.invoke('get-api-key'),
  captureAndAsk: (args: {
    prompt: string;
    model: string;
    includeImage: boolean;
  }): Promise<void> => ipcRenderer.invoke('capture-and-ask', args),
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'ai-response-start',
      'ai-response-chunk',
      'ai-response-end',
      'error',
      'clear-input',
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
