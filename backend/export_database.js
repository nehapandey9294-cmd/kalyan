const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { dumpDatabaseToStream } = require('./utils/dbDumper');

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFileName = `database_backup_${process.env.DB_NAME || 'db'}_${timestamp}.sql`;
  const rootDir = path.resolve(__dirname, '..');
  const targetPath = path.join(rootDir, outFileName);

  console.log('--------------------------------------------------');
  console.log(`Starting Full MySQL Database Dump`);
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`Target File: ${targetPath}`);
  console.log('--------------------------------------------------');

  const writeStream = fs.createWriteStream(targetPath, { encoding: 'utf8' });

  const startTime = Date.now();
  try {
    await dumpDatabaseToStream(writeStream, (msg) => console.log(`[Export] ${msg}`));
    writeStream.end();

    await new Promise((resolve) => writeStream.on('finish', resolve));

    const stats = fs.statSync(targetPath);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('--------------------------------------------------');
    console.log(`✓ Full Database Backup completed successfully in ${duration}s!`);
    console.log(`✓ Saved SQL file: ${targetPath}`);
    console.log(`✓ File size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log('--------------------------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error exporting database:', err);
    if (fs.existsSync(targetPath)) {
      try { fs.unlinkSync(targetPath); } catch (_) {}
    }
    process.exit(1);
  }
}

main();
