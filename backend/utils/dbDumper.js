const db = require('../config/db');

/**
 * Escapes a single value for standard MySQL INSERT statement.
 */
function escapeSqlValue(val) {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'number') {
    return Number.isFinite(val) ? String(val) : 'NULL';
  }
  if (typeof val === 'boolean') {
    return val ? '1' : '0';
  }
  if (Buffer.isBuffer(val)) {
    return `X'${val.toString('hex')}'`;
  }
  if (typeof val === 'object') {
    if (val instanceof Date) {
      return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
    }
    return escapeSqlString(JSON.stringify(val));
  }
  return escapeSqlString(String(val));
}

/**
 * Escapes characters in a string for SQL literal.
 */
function escapeSqlString(str) {
  return "'" + str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z') + "'";
}

/**
 * Streams or writes full database SQL dump to any writable stream (e.g. fs.createWriteStream or Express res).
 *
 * @param {import('stream').Writable} outputStream
 * @param {Function} [onProgress] Optional callback for progress logging
 */
async function dumpDatabaseToStream(outputStream, onProgress) {
  const write = (chunk) => {
    return new Promise((resolve, reject) => {
      const ok = outputStream.write(chunk, (err) => {
        if (err) return reject(err);
        resolve();
      });
      if (!ok) {
        outputStream.once('drain', resolve);
      }
    });
  };

  const dbName = process.env.DB_NAME || 'database';
  const now = new Date().toISOString();

  await write(`-- ========================================================\n`);
  await write(`-- Full MySQL Database Backup\n`);
  await write(`-- Database: ${dbName}\n`);
  await write(`-- Generated at: ${now}\n`);
  await write(`-- ========================================================\n\n`);

  await write(`SET FOREIGN_KEY_CHECKS=0;\n`);
  await write(`SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";\n`);
  await write(`SET time_zone = "+05:30";\n`);
  await write(`SET NAMES utf8mb4;\n\n`);

  // Fetch all base tables
  const [tables] = await db.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");

  if (!tables || tables.length === 0) {
    await write(`-- No tables found in database.\n`);
    await write(`SET FOREIGN_KEY_CHECKS=1;\n`);
    return;
  }

  for (let tIndex = 0; tIndex < tables.length; tIndex++) {
    const tableObj = tables[tIndex];
    const tableName = Object.values(tableObj)[0];

    if (onProgress) {
      onProgress(`Dumping table (${tIndex + 1}/${tables.length}): ${tableName}`);
    }

    await write(`-- --------------------------------------------------------\n`);
    await write(`-- Table structure for table \`${tableName}\`\n`);
    await write(`-- --------------------------------------------------------\n\n`);

    await write(`DROP TABLE IF EXISTS \`${tableName}\`;\n`);

    const [[createTableResult]] = await db.query(`SHOW CREATE TABLE \`${tableName}\``);
    const createTableSql = createTableResult['Create Table'];
    await write(`${createTableSql};\n\n`);

    // Fetch rows
    const [rows] = await db.query(`SELECT * FROM \`${tableName}\``);

    if (rows && rows.length > 0) {
      await write(`-- Dumping data for table \`${tableName}\` (${rows.length} rows)\n`);

      const colNames = Object.keys(rows[0]).map(col => `\`${col}\``).join(', ');
      const chunkSize = 200;

      for (let i = 0; i < rows.length; i += chunkSize) {
        const slice = rows.slice(i, i + chunkSize);
        const valuesList = slice.map(row => {
          const vals = Object.values(row).map(escapeSqlValue);
          return `(${vals.join(', ')})`;
        });

        await write(`INSERT INTO \`${tableName}\` (${colNames}) VALUES\n${valuesList.join(',\n')};\n\n`);
      }
    } else {
      await write(`-- Table \`${tableName}\` has 0 rows.\n\n`);
    }
  }

  await write(`SET FOREIGN_KEY_CHECKS=1;\n`);
  await write(`-- Dump completed on ${new Date().toISOString()}\n`);
}

module.exports = {
  dumpDatabaseToStream
};
