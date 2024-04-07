'use strict';

const { BrowserWindow, app, ipcMain } = require('electron');
const  path = require("path");
const  net = require("net");
const  Store = require("electron-store");

const store = new Store();

const isDevelopment = process.env.NODE_ENV === 'local'
const PORT = process.env.PORT || 3800;

let mainWindow = null;
let deviceConnection;

/**
 * Creates the main window for the Electron application.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    },
  });

  console.log('isDevelopment', isDevelopment);

  if(isDevelopment){
    // console.log('http://localhost:'+PORT);
    // mainWindow.loadURL('http://localhost:'+PORT);
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    mainWindow.webContents.openDevTools();
  } else {
    // mainWindow.loadURL('https://ck.juanmartinez.dev');
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const connectionInfo = store.get('connectionInfo');
  let connectionStatus = 'Disconnected';
  console.log('connectionInfo', connectionInfo);

  if (connectionInfo) {
    if(connectionInfo?.port < 0 || connectionInfo?.port > 65535){
      console.error('Invalid port number');
      mainWindow?.webContents.send('device-disconnected', 'Invalid port number');
      connectionStatus = 'Error';
    } else {
      deviceConnection = net.createConnection(connectionInfo, () => {
        console.log('Connected to device');
        mainWindow?.webContents.send('device-connected', 'Connected to device');
        console.log('device-connected', deviceConnection);
        connectionStatus = 'Connected';
      });

      deviceConnection.on('data', (data) => {
        console.log(`Received data: ${data}`);
        mainWindow?.webContents.send('device-data', data.toString());
      });

      deviceConnection.on('close', () => {
        console.log('Disconnected from device');
        mainWindow?.webContents.send('device-disconnected', 'Disconnected from device');
        connectionStatus = 'Disconnected';
      });

      // TODO: Handle error event in React
      deviceConnection.on('error', (error) => {
        console.error('Error connecting to device', error);
        connectionStatus = 'Error';
      });
    }
  }

  /*
   * save connection info from renderer process to main process
   */
  ipcMain.on('save-connection-info', (event, connectionInfo) => {
      // Validate port number
      if(connectionInfo?.port < 0 || connectionInfo?.port > 65535){
        console.error('Invalid port number');
        mainWindow?.webContents.send('device-disconnected', 'Invalid port number');
        connectionStatus = 'Error';
      } else {
        console.log('Saving connection info', connectionInfo);
        store.set('connectionInfo', connectionInfo);
        // Close existing connection
        if (deviceConnection) {
          deviceConnection.end();
          connectionStatus = 'Disconnected';
        }
        // Create new connection
        deviceConnection = net.createConnection(connectionInfo, () => {
          console.log('Connected to device');
          mainWindow?.webContents.send('device-connected', 'Connected to device');
          console.log('device-connected', deviceConnection);
          connectionStatus = 'Connected';
        });
      }
  });
  /*
    * send command from renderer process to main process
    */
  ipcMain.on('send-command', (event, command) => {
    if(deviceConnection){
      console.log('Sending command', command);
      const commandResponse = deviceConnection.write(command);
      console.log('commandResponse', commandResponse);
      return commandResponse;
    }
  });
  /*
   * get connection info from main process to renderer process
   */
  ipcMain.on('get-connection-info', (event) => {
    console.log('Getting connection info', connectionInfo);
    event.returnValue = connectionInfo;
  });
  /*
   * start up CashKeeper
   */
  ipcMain.on('start-up', (event) => {
    // send command to device to start up CashKeeper
    console.log('Starting up CashKeeper');
    const startUp = deviceConnection.write('$39|0#');
    console.log('startUp', startUp);
  });

  /*
   * Health check for main process
   */
  ipcMain.on('get-connection-status', (event) => {
    console.log('Getting connection status', connectionStatus);
    event.returnValue = connectionStatus;
  });
  /*
   * Health check for main process
   */
  console.log('Main process started', { connectionInfo });
}


app.on('ready', createWindow);