
const debianInstaller = require('electron-installer-debian');
const redhatInstaller = require('electron-installer-redhat');

const path = require('path')
const appVersion = require('./package.json').version;

var debianOptions = {
  src: 'app-builds/casinocoin-wallet-linux-x64/',
  dest: 'release-builds/',
  icon: 'src/assets/brand/casinocoin-icon-256x256.png',
  homepage: 'http://www.casinocoin.org', 
  arch: 'amd64'
}

console.log('Creating Debian Package (this may take a while)')

debianInstaller(debianOptions, function (err) {
  if (err) {
    console.error(err, err.stack)
    process.exit(1)
  }

  console.log('Successfully created package at ' + debianOptions.dest)
})


var redhatOptions = {
  src: 'app-builds/casinocoin-wallet-linux-x64/',
  dest: 'release-builds/',
  icon: 'src/assets/brand/casinocoin-icon-256x256.png',
  homepage: 'http://www.casinocoin.org',
  arch: 'x86_64'
}

console.log('Creating RPM Package (this may take a while)');

redhatInstaller(redhatOptions, function (err) {
  if (err) {
    console.error(err, err.stack)
    process.exit(1)
  }

  console.log('Successfully created package at ' + redhatOptions.dest);
});
