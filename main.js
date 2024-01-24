// get our main window up and running
const path = require('node:path');
const resizeImg = require('resize-img');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const os = require('os');
const fs = require('fs');

const isDev = process.env.NODE_ENV !== 'production';
// if it is in development mode, then true
// if it is not development mode, then false


const isMac = process.platform === 'darwin';
// if it is a MAC, then true
// if it is not a MAC, then false
let mainWindow;
let aboutWindow;

//  create the main window
function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: 'Image Resizer',
        width: isDev ? 1000 : 500,
        height: 600,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    // open devTools if we are in dev environment

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

// Create the About Window
function createAboutWindow() {
    aboutWindow = new BrowserWindow({
        title: 'About Image Resizer',
        width: 300,
        height: 300,

    });

    aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'))
}


// when app is ready, create the window
app.whenReady().then(() => {
    createMainWindow();

    // implement menu
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    // remove mainWindow from memory on close

    mainWindow.on('closed', () => (mainWindow = null));


    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow()
        }
    }
    );


    mainWindow.on('closed', () => (mainWindow = null));
});



// Menu template
const menu = [
    ...(isMac
        ? [
            {
                label: app.name,
                submenu: [
                    {
                        label: 'About',
                        click: createAboutWindow,
                    },
                ],
            },
        ]
        : []),
    {
        role: 'fileMenu',
    },
    ...(!isMac
        ? [
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'About',
                        click: createAboutWindow,
                    },
                ],
            },
        ]
        : [])
];

// response to ipcRenderer resize
ipcMain.on('image:resize', (event, options) => {
  options.dest = path.join(os.homedir(), 'imageresizer');
  resizeImage(options);
  console.log(options);
});

// resize the image
async function resizeImage( { imgPath, width, height, dest }) {
  try {
    // Read the file content into a buffer
    const fileBuffer = fs.readFileSync(imgPath);

    // resize the image
    const newPath = await resizeImg(fileBuffer, {
      width: +width,
      height: +height,
    });

    // create a filename
    const filename = path.basename(imgPath);

    // create a destination folder if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    };

    // write file to the destination folder
    fs.writeFileSync(path.join(dest, filename), newPath);

    // send a success message back to the renderer
    mainWindow.webContents.send('image:done');

    // open the destination folder so the user can see the image
    shell.openPath(dest);
  } catch (error) {
    console.log(error);
  }
}


app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit()
    }
})