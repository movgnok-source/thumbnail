# Thumbnail Generator

Desktop app for creating video thumbnails - สร้าง Thumbnail วีดีโอแบบออฟไลน์

## ✨ Features

- ✅ Works offline - no internet required
- ✅ Fast - processes locally with FFmpeg
- ✅ Large files supported - up to 10GB+
- ✅ Secure - files never leave your computer
- ✅ Multiple modes - Static (1/3 scenes) and GIF Animation
- ✅ Customizable - Zoom, Pan, Text, Logo

## 📥 Download

### Pre-built Binaries

Download from [Releases](https://github.com/YOUR_USERNAME/thumbnail-generator/releases):

- **Windows**: `Thumbnail Generator-1.0.0-portable.exe`
- **macOS**: `Thumbnail Generator-1.0.0.dmg`
- **Linux**: `Thumbnail Generator-1.0.0.AppImage`

### Linux Installation

```bash
chmod +x Thumbnail\ Generator-1.0.0.AppImage
./Thumbnail\ Generator-1.0.0.AppImage
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/thumbnail-generator.git
cd thumbnail-generator

# Install dependencies
npm install

# Run in development mode
npm start
```

### Build

```bash
# Build for all platforms
npm run build

# Build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## 🚀 GitHub Actions

This project uses GitHub Actions to automatically build releases for all platforms.

To trigger a build:

```bash
git tag v1.0.0
git push origin v1.0.0
```

See [GITHUB_ACTIONS_GUIDE.md](GITHUB_ACTIONS_GUIDE.md) for detailed instructions.

## 📁 Project Structure

```
thumbnail-electron-app/
├── main.js              # Main process (Electron + FFmpeg)
├── preload.js           # Preload script (Security bridge)
├── index.html           # UI
├── style.css            # Styles
├── package.json         # Dependencies & build config
├── .github/workflows/   # GitHub Actions
└── README.md            # This file
```

## 🎯 How to Use

1. **Select video** - Click "Select Video" button
2. **Capture frames** - Use timeline to select scenes
3. **Customize** - Add text, logo, zoom, pan
4. **Download** - Click "Download Thumbnail"

Output files are saved to `~/Pictures/Thumbnail Generator/`

## 🔧 Technologies

- **Electron** - Desktop app framework
- **FFmpeg** - Video processing
- **Node.js** - Backend processing
- **HTML/CSS/JavaScript** - User interface

## 📄 License

MIT License - Free to use

## 👨‍💻 Author

Created by [Gnok.dev](https://gnok.dev) with ❤️

---

**Note**: This app uses FFmpeg, which is open-source software under LGPL/GPL license.
