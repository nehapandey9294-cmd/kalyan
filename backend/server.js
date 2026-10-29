const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const http = require('http');
const server = http.createServer(app);
const { initChatSocket } = require('./socket/chatSocket');
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend integration
app.use(cors());

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const path = require('path');
const fs = require('fs');
app.use('/uploads', express.static(path.join(__dirname, '..', '_public_html (1)', 'uploads')));
const localUploads = path.join(__dirname, 'uploads');
if (!fs.existsSync(localUploads)) fs.mkdirSync(localUploads, { recursive: true });
app.use('/uploads', express.static(localUploads));

// Serve APK files with direct attachment & cache headers for instant download
const apkStaticOptions = {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.apk')) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="sara-777.apk"');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
};
app.use('/apk', express.static(path.join(__dirname, '..', 'landing', 'public', 'apk'), apkStaticOptions));
app.use('/apk', express.static(path.join(__dirname, '..', 'landing', 'apk'), apkStaticOptions));

app.get('/api/download-apk', (req, res) => {
  const apkPath = path.join(__dirname, '..', 'landing', 'public', 'apk', 'sara-777.apk');
  const fallbackPath = path.join(__dirname, '..', 'landing', 'apk', 'sara-777.apk');
  const targetApk = fs.existsSync(apkPath) ? apkPath : (fs.existsSync(fallbackPath) ? fallbackPath : null);

  if (targetApk) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.download(targetApk, 'sara-777.apk');
  } else {
    return res.status(404).json({ success: '0', msg: 'APK file not found' });
  }
});

const landingDistPath = path.join(__dirname, '..', 'landing', 'dist');
if (fs.existsSync(landingDistPath)) {
  app.use('/landing', express.static(landingDistPath));
} else {
  app.use('/landing', express.static(path.join(__dirname, '..', 'landing')));
}

// Serve images and assets for landing page & webapp
app.use('/img', express.static(path.join(__dirname, '..', 'landing', 'public', 'img')));
app.use('/img', express.static(path.join(__dirname, '..', 'landing', 'public')));
if (fs.existsSync(landingDistPath)) {
  app.use('/img', express.static(path.join(landingDistPath, 'img')));
  app.use('/img', express.static(landingDistPath));
  app.use('/assets', express.static(path.join(landingDistPath, 'assets')));
}
app.use('/img', express.static(path.join(__dirname, '..', 'frontend', 'public', 'img')));




try {
  const uploadedLogo = '/Users/anilrathore/.gemini/antigravity-ide/brain/1cbfdef8-9fd8-4275-8907-5f43353f6735/.user_uploaded/media_1793204473300.jpg';
  const landingImgDir = path.join(__dirname, '..', 'landing', 'img');
  const logoSrc = path.join(landingImgDir, 'logo.png');
  const favDest = path.join(landingImgDir, 'fav.png');
  if (fs.existsSync(uploadedLogo)) {
    try { fs.copyFileSync(uploadedLogo, logoSrc); } catch (e) {}
  }
  if (fs.existsSync(logoSrc)) {
    fs.copyFileSync(logoSrc, favDest);
    try { fs.copyFileSync(logoSrc, path.join(landingImgDir, 'tara-baba-logo.png')); } catch (e) {}
  }
  const feImgDir = path.join(__dirname, '..', 'frontend', 'public', 'img');
  if (fs.existsSync(logoSrc) && fs.existsSync(feImgDir)) {
    fs.copyFileSync(logoSrc, path.join(feImgDir, 'fav.png'));
    fs.copyFileSync(logoSrc, path.join(feImgDir, 'logo.png'));
    fs.copyFileSync(logoSrc, path.join(feImgDir, 'logo.jpg'));
    try { fs.copyFileSync(logoSrc, path.join(feImgDir, 'tara-baba-logo.png')); } catch (e) {}
    try { fs.copyFileSync(logoSrc, path.join(feImgDir, 'lucky-matka-logo.png')); } catch (e) {}
  }
  const feAssetsImg = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'images');
  if (fs.existsSync(logoSrc) && fs.existsSync(feAssetsImg)) {
    try { fs.copyFileSync(logoSrc, path.join(feAssetsImg, 'logo1.png')); } catch (e) {}
  }
  const playStoreAssets = path.join(__dirname, '..', 'PlayStore', 'assets');
  if (fs.existsSync(logoSrc) && fs.existsSync(playStoreAssets)) {
    try { fs.copyFileSync(logoSrc, path.join(playStoreAssets, 'logo.png')); } catch (e) {}
  }
} catch (e) {}

// Routes
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');

app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// Base route & Health check
app.get('/health', (req, res) => {
  res.redirect('/api/health');
});

// Serve Frontend SPA in production / Render unified service
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/apk') ||
      req.path.startsWith('/health')
    ) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'Kalyan Matka API Server is running!', health: '/api/health' });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: '0', msg: 'Something went wrong!', error: err.message });
});

// Initialize WebSocket in-app chat module
initChatSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} (HTTP + WebSockets)`);
});
