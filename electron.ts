import { app, BrowserWindow, screen, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let win, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

if (serve) {
  require('electron-reload')(__dirname, {
    electron: require('${__dirname}/../../node_modules/electron')
  });
}

// set the default userData directory
const defaultCSCPath = path.join(app.getPath('home'), '.casinocoin');
if (!fs.existsSync(defaultCSCPath)){
  fs.mkdirSync(defaultCSCPath);
}
app.setPath('userData', defaultCSCPath);

function createWindow() {

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;

  const minimalWidth = Math.min(size.width, 960);
  const minimalHeight = Math.min(size.height, 720);

  // Create the browser window.
  win = new BrowserWindow({
    width: minimalWidth,
    minWidth: minimalWidth,
    height: minimalHeight,
    minHeight: minimalHeight,
    icon: __dirname + '/favicon.ico',
    show: false,
    darkTheme: true
  });

  // and load the index.html of the app.
  win.loadURL('file://' + __dirname + '/index.html');

  // Open the DevTools.
  if (serve) {
    win.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  // Disable menu bar
  win.setMenu(null);

  // show the windows
  win.once('ready-to-show', () => {
      win.show();
  })
}

try {

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', createWindow);

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

  app.on('before-quit', () => {
    console.log('Quiting Casinocoin Wallet, save the database!!!');
    win.webContents.send('wallet-save');
  });

} catch (e) {
  // Catch Error
  // throw e;
  console.log(e);
}