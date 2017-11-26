# casinocoin-wallet

# Introduction

Casinocoin Desktop Wallet

## Getting Started

Clone this repository locally :

``` bash
git clone https://github.com/casinocoin/casinocoin-wallet.git
```

Install dependencies with npm :

``` bash
npm install
```

There is an issue with `yarn` and `node_modules` that are only used in electron on the backend when the application is built by the packager. Please use `npm` as dependencies manager.

If you want to generate Angular components with Angular-cli , you **MUST** install `@angular/cli` in npm global context.  
Please follow [Angular-cli documentation](https://github.com/angular/angular-cli) if you had installed a previous version of `angular-cli`.

``` bash
npm install -g @angular/cli
```

## To build for development

- **in a terminal window** -> npm run webpack:watch
- **Wait till the app finished compiling**
- **in a second terminal window** -> npm run electron:serve

Voila! You can use your Casinocoin Wallet app in a local development environment with hot reload !

The application code is managed by `electron.ts`. The app runs with a simple Electron window and "Developer Tools" is open.  
The Angular component contains an example of Electron and NodeJS native lib import. See [Use NodeJS Native libraries](#use-nodejs-native-libraries) charpter if you want to import other native libraries in your project.  
You can desactivate "Developer Tools" by commenting `win.webContents.openDevTools();` in `electron.ts`.

## To build for production

- For windows 32-bit :  `npm run electron:windows32`
- For windows 64-bit :  `npm run electron:windows64`
- For Mac OSX :  `npm run electron:mac`
- For Linux :  `npm run electron:linux`

Your built files are in the /dist folder.

**Your application is optimised. Only the files of /dist folder are included in the executable.**

## Use NodeJS Native libraries

Actually Angular-Cli doesn't seem to be able to import nodeJS native libs or electron libs at compile time (Webpack error). This is (one of) the reason why webpack.config was ejected of ng-cli.
If you need to use NodeJS native libraries, you **MUST** add it manually in the file `webpack.config.js` in root folder :

```javascript
  "externals": {
    "electron": 'require(\'electron\')',
    "child_process": 'require(\'child_process\')',
    "fs": 'require(\'fs\')'
    ...
  },
```

Notice that all NodeJS v7 native libs are already added in this sample. Feel free to remove those you don't need.

## Browser mode

Maybe you want to execute the application in the browser (WITHOUT HOT RELOAD ACTUALLY...) ? You can do it with `npm run start:web`.  
Note that you can't use Electron or NodeJS native libraries in this case. Please check `providers/electron.service.ts` to watch how conditional import of electron/Native libraries is done.

# Contributors 

[<img alt="Andre Jochems" src="https://avatars1.githubusercontent.com/u/584523?v=4&s=460" width="117">](https://github.com/ajochems) |
:---:
|[Andre Jochems](https://github.com/ajochems)|
