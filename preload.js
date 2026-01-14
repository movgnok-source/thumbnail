const { contextBridge, ipcRenderer } = require('electron');

// เปิดเผย API ให้กับ renderer process อย่างปลอดภัย
contextBridge.exposeInMainWorld('electronAPI', {
    // เลือกไฟล์วีดีโอ
    selectVideoFile: () => ipcRenderer.invoke('select-video-file'),

    // เลือกไฟล์รูปภาพ (หลายไฟล์)
    selectImageFiles: () => ipcRenderer.invoke('select-image-files'),

    // ดึงข้อมูลวีดีโอ
    getVideoInfo: (videoPath) => ipcRenderer.invoke('get-video-info', videoPath),

    // แคปเจอร์เฟรมจากวีดีโอ
    captureFrame: (options) => ipcRenderer.invoke('capture-frame', options),

    // สร้าง Static Thumbnail
    createStaticThumbnail: (options) => ipcRenderer.invoke('create-static-thumbnail', options),

    // สร้าง GIF Thumbnail
    createGifThumbnail: (options) => ipcRenderer.invoke('create-gif-thumbnail', options),

    // เปิดโฟลเดอร์ output
    openOutputFolder: () => ipcRenderer.invoke('open-output-folder'),

    // ตรวจสอบว่าเป็น Electron app หรือไม่
    isElectron: true
});

console.log('✅ Thumbnail Generator Preload script loaded');
