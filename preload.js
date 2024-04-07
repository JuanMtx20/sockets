const { ipcRenderer, contextBridge } = require('electron');

window.ipcRenderer = ipcRenderer;


contextBridge.exposeInMainWorld('electronAPI', {
  // send info to main process from renderer process
  saveConnectionInfo: (args) => ipcRenderer.send('save-connection-info', args),
  startUp: () => ipcRenderer.send('start-up'),
  sendCommand: (args) => ipcRenderer.send('send-command', args),
  // receive info from main process in renderer process
  getConnectionInfo: () => ipcRenderer.sendSync('get-connection-info'),
  getConnectionStatus: () => ipcRenderer.sendSync('get-connection-status'),
  receiveDeviceData : (callback) => ipcRenderer.on('device-data', (event, data) => callback(data)),
})
