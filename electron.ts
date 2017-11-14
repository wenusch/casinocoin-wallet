import { app, BrowserWindow, screen, autoUpdater, ipcMain, dialog } from 'electron';
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

// set app id
app.setAppUserModelId("Casinocoin Wallet");

// set property for exit dialog
let showExitPrompt = true;

let updaterFeedURL = 'https://download.casinocoin.org/update/' + platform + '/' + version;
if(version.indexOf("beta") !== -1){
	updaterFeedURL = updaterFeedURL + '/' + 'beta';
}
console.log('Update URL: ' + updaterFeedURL);

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

function createWindow() {

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;

  const minimalWidth = Math.min(size.width, 1000);
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

  // Emitted when the window is closed.
  win.on('close', (e) => {
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
        })
    }
  })

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
    showExitPrompt = true;
  });

} catch (e) {
  // Catch Error
  // throw e;
  console.log(e);
}