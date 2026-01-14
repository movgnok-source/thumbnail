const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gif-encoder-2');

// ตั้งค่า FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

let mainWindow;

// สร้างหน้าต่างหลัก
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        backgroundColor: '#0f172a',
        show: false
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ==================== IPC Handlers ====================

// เลือกไฟล์วีดีโอ
ipcMain.handle('select-video-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Videos', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'm3u8', 'ts'] }
        ]
    });

    if (result.canceled) {
        return null;
    }

    const filePath = result.filePaths[0];
    const stats = await fs.stat(filePath);

    return {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size
    };
});

// เลือกไฟล์รูปภาพ (สำหรับ direct upload)
ipcMain.handle('select-image-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ]
    });

    if (result.canceled) {
        return null;
    }

    const files = [];
    for (const filePath of result.filePaths) {
        const stats = await fs.stat(filePath);
        const data = await fs.readFile(filePath);
        files.push({
            path: filePath,
            name: path.basename(filePath),
            size: stats.size,
            data: data.toString('base64')
        });
    }

    return files;
});

// ดึงข้อมูลวีดีโอด้วย FFprobe
ipcMain.handle('get-video-info', async (event, videoPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }

            const videoStream = metadata.streams.find(s => s.codec_type === 'video');

            resolve({
                duration: metadata.format.duration,
                width: videoStream?.width || 0,
                height: videoStream?.height || 0,
                codec: videoStream?.codec_name || 'unknown',
                bitrate: metadata.format.bit_rate,
                format: metadata.format.format_name
            });
        });
    });
});

// แคปเจอร์เฟรมจากวีดีโอ
ipcMain.handle('capture-frame', async (event, options) => {
    const { videoPath, timestamp } = options;

    const outputDir = path.join(app.getPath('temp'), 'thumbnail-frames');
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `frame_${Date.now()}.png`);

    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .seekInput(timestamp)
            .frames(1)
            .output(outputPath)
            .on('end', async () => {
                const data = await fs.readFile(outputPath);
                await fs.unlink(outputPath); // ลบไฟล์ temp
                resolve({
                    success: true,
                    data: data.toString('base64')
                });
            })
            .on('error', (err) => {
                reject({
                    success: false,
                    error: err.message
                });
            })
            .run();
    });
});

// สร้าง Static Thumbnail
ipcMain.handle('create-static-thumbnail', async (event, options) => {
    const { frames, layout, size, text, logo, outputFileName } = options;

    const outputDir = path.join(app.getPath('pictures'), 'Thumbnail Generator');
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, outputFileName);

    try {
        // Parse size
        const [width, height] = size.split('x').map(Number);

        // Create canvas
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Draw frames based on layout
        if (layout === 'single') {
            // Single frame - full canvas
            const img = await loadImage(Buffer.from(frames[0].data, 'base64'));
            const { x, y, w, h } = calculateImagePosition(img, width, height, frames[0].zoom, frames[0].panH, frames[0].panV);
            ctx.drawImage(img, x, y, w, h);
        } else if (layout === 'triple') {
            // Triple layout - 3 columns
            const frameWidth = width / 3;
            for (let i = 0; i < 3 && i < frames.length; i++) {
                const img = await loadImage(Buffer.from(frames[i].data, 'base64'));
                const { x, y, w, h } = calculateImagePosition(img, frameWidth, height, frames[i].zoom, frames[i].panH, frames[i].panV, i * frameWidth);
                ctx.drawImage(img, x, y, w, h);
            }
        }

        // Add text if provided
        if (text && text.content) {
            ctx.font = `${text.size}px ${text.font}`;
            ctx.fillStyle = text.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const textX = (width * text.posX) / 100;
            const textY = (height * text.posY) / 100;

            if (text.stroke) {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                ctx.strokeText(text.content, textX, textY);
            }

            if (text.shadow) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }

            ctx.fillText(text.content, textX, textY);
        }

        // Add logo if provided
        if (logo && logo.data) {
            const logoImg = await loadImage(Buffer.from(logo.data, 'base64'));
            // Place logo at bottom-right corner (or custom position)
            const logoWidth = logoImg.width;
            const logoHeight = logoImg.height;
            const logoX = width - logoWidth - 20;
            const logoY = height - logoHeight - 20;
            ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        }

        // Save to file
        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(outputPath, buffer);

        return {
            success: true,
            outputPath: outputPath,
            message: 'สร้าง Thumbnail สำเร็จ!'
        };
    } catch (error) {
        console.error('Error creating thumbnail:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// สร้าง GIF Thumbnail
ipcMain.handle('create-gif-thumbnail', async (event, options) => {
    const { frames, size, delay, outputFileName } = options;

    const outputDir = path.join(app.getPath('pictures'), 'Thumbnail Generator');
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, outputFileName);

    try {
        const [width, height] = size.split('x').map(Number);

        const encoder = new GIFEncoder(width, height);
        encoder.createReadStream().pipe(require('fs').createWriteStream(outputPath));
        encoder.start();
        encoder.setRepeat(0); // 0 = loop forever
        encoder.setDelay(delay); // Frame delay in ms
        encoder.setQuality(10); // Image quality (1-20, lower is better)

        for (const frame of frames) {
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            const img = await loadImage(Buffer.from(frame.data, 'base64'));
            const { x, y, w, h } = calculateImagePosition(img, width, height, frame.zoom || 1.0, frame.panH || 50, frame.panV || 50);

            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, x, y, w, h);

            encoder.addFrame(ctx);
        }

        encoder.finish();

        return {
            success: true,
            outputPath: outputPath,
            message: 'สร้าง GIF สำเร็จ!'
        };
    } catch (error) {
        console.error('Error creating GIF:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Helper function to calculate image position with zoom and pan
function calculateImagePosition(img, canvasWidth, canvasHeight, zoom = 1.0, panH = 50, panV = 50, offsetX = 0) {
    const imgAspect = img.width / img.height;
    const canvasAspect = canvasWidth / canvasHeight;

    let w, h;

    // Calculate base size (fit to canvas)
    if (imgAspect > canvasAspect) {
        w = canvasWidth;
        h = canvasWidth / imgAspect;
    } else {
        h = canvasHeight;
        w = canvasHeight * imgAspect;
    }

    // Apply zoom
    w *= zoom;
    h *= zoom;

    // Calculate max offset for panning
    const maxOffsetX = Math.max(0, (w - canvasWidth) / 2);
    const maxOffsetY = Math.max(0, (h - canvasHeight) / 2);

    // Calculate position with pan (50 = center, 0 = left/top, 100 = right/bottom)
    const userOffsetX = maxOffsetX * ((50 - panH) / 50);
    const userOffsetY = maxOffsetY * ((50 - panV) / 50);

    const x = offsetX + (canvasWidth - w) / 2 + userOffsetX;
    const y = (canvasHeight - h) / 2 + userOffsetY;

    return { x, y, w, h };
}

// เปิดโฟลเดอร์ที่เก็บไฟล์
ipcMain.handle('open-output-folder', async () => {
    const outputDir = path.join(app.getPath('pictures'), 'Thumbnail Generator');
    const { shell } = require('electron');
    await shell.openPath(outputDir);
});

console.log('✅ Thumbnail Generator Electron app initialized');
console.log('📁 Output folder:', path.join(app.getPath('pictures'), 'Thumbnail Generator'));
