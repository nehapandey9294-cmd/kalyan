const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourceCandidates = [
  path.join(rootDir, 'PlayStore', 'apk', 'Bharat-Matka.apk'),
  path.join(rootDir, 'PlayStore', 'Bharat-Matka.apk'),
  path.join(rootDir, 'landing', 'apk', 'Bharat-Matka.apk'),
  path.join(rootDir, 'landing', 'public', 'apk', 'Bharat-Matka.apk'),
  path.join(__dirname, 'uploads', 'Bharat-Matka.apk'),
  path.join(rootDir, 'Application', 'app', 'release', 'Bharat-Matka.apk'),
  path.join(rootDir, 'PlayStore', 'apk', 'Kalyan-Matka.apk')
];

const srcApk = sourceCandidates.find(p => fs.existsSync(p));

if (!srcApk) {
  console.error('❌ Could not locate source APK');
  process.exit(1);
}

console.log(`Using source APK: ${srcApk} (${(fs.statSync(srcApk).size / 1024 / 1024).toFixed(2)} MB)`);

const targets = [
  path.join(rootDir, 'PlayStore', 'Bharat-Matka.apk'),
  path.join(rootDir, 'PlayStore', 'apk', 'Bharat-Matka.apk'),
  path.join(rootDir, 'landing', 'apk', 'Bharat-Matka.apk'),
  path.join(rootDir, 'landing', 'public', 'apk', 'Bharat-Matka.apk'),
  path.join(__dirname, 'uploads', 'Bharat-Matka.apk'),
  path.join(rootDir, 'Application', 'app', 'release', 'Bharat-Matka.apk'),

  // Also update legacy Kalyan-Matka.apk with the new Bharat-Matka.apk binary
  path.join(rootDir, 'PlayStore', 'Kalyan-Matka.apk'),
  path.join(rootDir, 'PlayStore', 'apk', 'Kalyan-Matka.apk'),
  path.join(rootDir, 'landing', 'apk', 'Kalyan-Matka.apk'),
  path.join(rootDir, 'landing', 'public', 'apk', 'Kalyan-Matka.apk'),
  path.join(__dirname, 'uploads', 'Kalyan-Matka.apk'),
  path.join(rootDir, 'Application', 'app', 'release', 'Kalyan-Matka.apk')
];

targets.forEach(tgt => {
  const dir = path.dirname(tgt);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  try {
    fs.copyFileSync(srcApk, tgt);
    console.log(`✓ Copied to: ${tgt}`);
  } catch (err) {
    console.error(`Error copying to ${tgt}:`, err.message);
  }
});

console.log('✓ Bharat-Matka.apk sync completed successfully!');
