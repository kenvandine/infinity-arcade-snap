// Preload script for Infinity Arcade Electron app
// Provides secure context isolation between main and renderer processes

const { contextBridge } = require('electron');

// Expose any needed APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    isElectron: true
});
