import { app, BrowserWindow, screen, 
         autoUpdater, ipcMain, dialog, 
         Menu, MenuItem, powerMonitor } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// this is required to check if the app is running in development mode. 
import * as isDev from 'electron-is-dev';

let win, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');
const version = app.getVersion();
const platform = os.platform() + '_' + os.arch();
const globalTS:any = global;
globalTS.vars = {};

// set app id
app.setAppUserModelId("CasinoCoin Wallet");

// set property for exit dialog
let showExitPrompt = true;
globalTS.vars.exitFromRenderer = false;
globalTS.vars.exitFromLogin = false;

// define auto update url
let updaterFeedURL = 'https://download.casinocoin.org/update/' + platform + '/' + version;
if(version.indexOf("beta") !== -1){
	updaterFeedURL = updaterFeedURL + '/' + 'beta';
}
console.log('Update URL: ' + updaterFeedURL);

// if in development add electron reload
if (serve) {
  require('electron-reload')(__dirname, {
    electron: require('${__dirname}/../../node_modules/electron')
  });
}

/* Handling squirrel.windows events on windows 
only required if you have build the windows with target squirrel. For NSIS target you don't need it. */
if (require('electron-squirrel-startup')) {
	app.quit();
}

// Funtion to check the current OS. As of now there is no proper method to add auto-updates to linux platform.
function isWindowsOrmacOS() {
	return process.platform === 'darwin' || process.platform === 'win32';
}

function appUpdater() {
	autoUpdater.setFeedURL(updaterFeedURL);
	/* Log whats happening
	TODO send autoUpdater events to renderer so that we could console log it in developer tools
	You could alsoe use nslog or other logging to see what's happening */
	autoUpdater.on('error', err => console.log(err));
	autoUpdater.on('checking-for-update', () => console.log('checking-for-update'));
	autoUpdater.on('update-available', () => console.log('update-available'));
	autoUpdater.on('update-not-available', () => console.log('update-not-available'));

	// Ask the user if update is available
	autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
		let message = app.getName() + ' ' + releaseName + ' is now available. It will be installed the next time you restart the application.';
		if (releaseNotes) {
			const splitNotes = releaseNotes.split(/[^\r]\n/);
			message += '\n\nRelease notes:\n';
			splitNotes.forEach(notes => {
				message += notes + '\n\n';
			});
		}
		// Ask user to update the app
		dialog.showMessageBox({
			type: 'question',
			buttons: ['Install and Relaunch', 'Later'],
			defaultId: 0,
			message: 'A new version of ' + app.getName() + ' has been downloaded',
			detail: message
		}, response => {
			if (response === 0) {
				setTimeout(() => autoUpdater.quitAndInstall(), 1);
			}
		});
	});
	// init for updates
	autoUpdater.checkForUpdates();
}

// set the default userData directory
const defaultCSCPath = path.join(app.getPath('home'), '.casinocoin');
if (!fs.existsSync(defaultCSCPath)){
  fs.mkdirSync(defaultCSCPath);
}
app.setPath('userData', defaultCSCPath);

// configure loggging 
const winston = require('winston');
if(serve){
  globalTS.loglevel = 'debug';
} else {
  globalTS.loglevel = 'info';
}
var logFolder = path.join(app.getPath("userData"), "logs");
if (!fs.existsSync(logFolder)){
  fs.mkdirSync(logFolder);
}
let logFilename = new Date().toISOString().replace(/:/g, '.') + '.log';
let logFile = path.join(logFolder, logFilename)

function customFileFormatter (options) {
  // Return string will be passed to logger.
  return new Date().toISOString() +' ['+ options.level.toUpperCase() +'] '+ (undefined !== options.message ? options.message : '') +
   (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
}

winston.add(winston.transports.File, 
  { filename: logFile,
    level: globalTS.loglevel,
    maxsize: 100000000,
    json: false,
    formatter: customFileFormatter
  }
);
winston.remove(winston.transports.Console);
winston.level = globalTS.loglevel;
globalTS.logger = winston;

// configure backup path
let backupFolder = path.join(app.getPath("userData"), "backup");
if (!fs.existsSync(backupFolder)){
  fs.mkdirSync(backupFolder);
}
globalTS.vars.backupPath = backupFolder;


// create window
function createWindow() {

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;

  const minimalWidth = Math.min(size.width, 1024);
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

  const page = win.webContents;
  
  // Run the auto updater
  page.once('did-frame-finish-load', () => {
    const checkOS = isWindowsOrmacOS();
    if (checkOS && !isDev) {
      // Initate auto-updates on macOs and windows
      appUpdater();
    }
  });

  // Open the DevTools.
  if (serve) {
    win.webContents.openDevTools();
  }

  powerMonitor.on('suspend', () => {
    winston.log("debug", "### Electron -> The system is going to sleep ###");
    // send message to save and close wallet
    win.webContents.send('action', 'save-wallet');
    
  });

  powerMonitor.on('resume', () => {
    winston.log("debug", "### Electron -> The system is resuming after sleep ###");
    win.reload();
    win.show();
  });

  // Emitted when the window is closed.
  win.on('close', (e) => {
    if(globalTS.vars.exitFromLogin && showExitPrompt){
      e.preventDefault() // Prevents the window from closing 
      globalTS.vars.exitFromLogin = false;
      showExitPrompt = false;
      win.close();
    } else if(!globalTS.vars.exitFromRenderer){
      e.preventDefault() // Prevents the window from closing 
      dialog.showMessageBox({
          type: 'info',
          buttons: ['Ok'],
          title: 'Closing the wallet',
          message: 'Please close the wallet from the Tools -> Quit menu.'
      });
    } else {
      if (showExitPrompt) {
          e.preventDefault() // Prevents the window from closing 
          dialog.showMessageBox({
              type: 'question',
              buttons: ['Yes', 'No'],
              title: 'Confirm',
              message: 'Are you sure you want to close the wallet?'
          }, function (response) {
              if (response === 0) { // Runs the following if 'Yes' is clicked
                  showExitPrompt = false;
                  win.close();
              }
          });
      }
    }
  });

  win.on('closed', (e) => {
    win = null;
  });

  // Disable menu bar
  win.setMenu(null);

  // show the windows
  win.once('ready-to-show', () => {
      win.show();
  });

  // Create the Application's main menu
  const template : Electron.MenuItemConstructorOptions[] = [{
    label: 'CasinoCoin Wallet',
    submenu: [
      {
        label: 'Cut',
        accelerator: 'Command+X',
        role: 'cut'
      },
      {
        label: 'Copy',
        accelerator: 'Command+C',
        role: 'copy'
      },
      {
        label: 'Paste',
        accelerator: 'Command+V',
        role: 'paste'
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: function() { app.quit(); }
      }
    ]
  }];

  let menu = Menu.buildFromTemplate(template);
  if (process.platform == 'darwin') {
    Menu.setApplicationMenu(menu);
  }
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
    } else {
      win.reload();
      win.show();
    }
  });

  // app.on('before-quit', () => {
  //   if(showExitPrompt == false){
  //     //console.log('Quiting Casinocoin Wallet, save the database!!!');
  //     // let backupResult = win.webContents.sendSync('wallet-backup');
  //     // console.log("Backup Result: " + backupResult);
  //   }
  // });

} catch (e) {
  // Catch Error
  // throw e;
  console.log(e);
}