const createLinuxInstall = require('electron-linux-installer');
const path = require('path')
const appVersion = require('./package.json').version;

getInstallerConfig()
    .then((result) => {
        createLinuxInstall(result).then(success => {
            console.log(success)
        }).catch(e => {
            throw e
        });
    })
    .catch((error) => {
        console.error(error.message || error)
        process.exit(1)
});

function getInstallerConfig () {
    console.log('creating linux installer');
    const rootPath = path.join('./');
    const appPath = path.join(rootPath, 'app-builds');
    const outPath = path.join(rootPath, 'release-builds');
  
    return Promise.resolve({
      src: appPath,
      dest: path.join(outPath, 'linux-x86_64'),
      arch: 'x86_64',
      for: 'both'
    })
  }