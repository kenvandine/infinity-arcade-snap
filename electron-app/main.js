const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

// Backend URL
const BACKEND_URL = 'http://127.0.0.1:8081';
const MAX_RETRIES = 60; // Wait up to 60 seconds for backend
const RETRY_INTERVAL = 1000; // Check every second

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        fullscreen: true,
        width: 1280,
        height: 1024,
        title: 'Infinity Arcade',
        icon: process.env.SNAP
            ? path.join(process.env.SNAP, 'meta', 'gui', 'icon.png')
            : path.join(__dirname, '..', 'snap', 'gui', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true
    });

    // Handle external links - open in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http://127.0.0.1:8081') || url.startsWith('http://localhost:8081')) {
            return { action: 'allow' };
        }
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Wait for backend to be ready, then load
    waitForBackend(0);

    // Inject fullscreen hint overlay after page loads
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.insertCSS(`
            #fullscreen-hint {
                position: fixed;
                top: 15px;
                left: 15px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 14px;
                color: #00ff00;
                text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00;
                z-index: 9999;
                pointer-events: none;
                opacity: 0.8;
            }
        `);
        mainWindow.webContents.executeJavaScript(`
            if (!document.getElementById('fullscreen-hint')) {
                const hint = document.createElement('div');
                hint.id = 'fullscreen-hint';
                hint.textContent = 'F11 to toggle fullscreen';
                document.body.appendChild(hint);
            }
        `);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function waitForBackend(retryCount) {
    if (retryCount >= MAX_RETRIES) {
        console.error('Backend did not start in time');
        if (mainWindow) {
            mainWindow.loadURL(`data:text/html,
                <html>
                <head><title>Infinity Arcade - Error</title></head>
                <body style="font-family: sans-serif; padding: 40px; background: #1a1a2e; color: #eee;">
                    <h1>Connection Error</h1>
                    <p>Could not connect to the Infinity Arcade backend.</p>
                    <p>Please ensure the backend service is running.</p>
                    <button onclick="window.location.reload()">Retry</button>
                </body>
                </html>
            `);
        }
        return;
    }

    const req = http.get(BACKEND_URL, (res) => {
        if (res.statusCode === 200) {
            console.log('Backend is ready, loading UI...');
            if (mainWindow) {
                mainWindow.loadURL(BACKEND_URL);
            }
        } else {
            setTimeout(() => waitForBackend(retryCount + 1), RETRY_INTERVAL);
        }
    });

    req.on('error', () => {
        console.log(`Waiting for backend... (${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => waitForBackend(retryCount + 1), RETRY_INTERVAL);
    });

    req.setTimeout(1000, () => {
        req.destroy();
        setTimeout(() => waitForBackend(retryCount + 1), RETRY_INTERVAL);
    });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(createWindow);

    app.on('window-all-closed', () => {
        app.quit();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}
