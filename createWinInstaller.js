const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })

function getInstallerConfig () {
  console.log('creating windows installer');
  const rootPath = path.join('./');
  const appPath = path.join(rootPath, 'app-builds');
  const outPath = path.join(rootPath, 'release-builds');

  return Promise.resolve({
    appDirectory: path.join(appPath, 'casinocoin-wallet-win32-ia32/'),
    authors: 'Casinocoin Foundation',
    noMsi: false,
    outputDirectory: path.join(outPath, 'windows-installer'),
    exe: 'casinocoin-wallet.exe',
    setupExe: 'CasinocoinWalletInstaller.exe',
    setupIcon: path.join(rootPath, 'src', 'assets', 'icons', 'casinocoin.ico')
  })
}