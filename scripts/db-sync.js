#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const INFO_FILE = path.resolve(__dirname, '../mysql_info.md');
const DEFAULT_DB_NAME = 'hrm_system';

function parseConfig(fileContent) {
  const serverBlocks = {};
  const blockRegex = /# server mysql (local|remote)[\s\S]*?## info :\s*([\s\S]*?)(?=(# server mysql|$))/gi;
  let match;
  while ((match = blockRegex.exec(fileContent))) {
    const name = match[1].trim();
    const body = match[2];
    const config = {};
    body.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, value] = trimmed.split('=');
      if (key && value !== undefined) {
        config[key.trim()] = value.trim();
      }
    });
    serverBlocks[name] = config;
  }
  return serverBlocks;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    from: 'local',
    to: 'remote',
    dryRun: false,
    help: false,
  };

  args.forEach((arg) => {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      return;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      return;
    }
    const [key, value] = arg.split('=', 2);
    if (key === '--from' && value) options.from = value;
    if (key === '--to' && value) options.to = value;
  });

  if (options.from === options.to) {
    throw new Error('Source and target servers must be different. Use --from=local|remote and --to=remote|local.');
  }

  return options;
}

function normalizeConfig(raw) {
  return {
    host: raw.DB_HOST || 'localhost',
    port: raw.DB_PORT ? Number(raw.DB_PORT) : 3306,
    user: raw.DB_USER || 'root',
    password: raw.DB_PASS || '',
    database: raw.DB_NAME || DEFAULT_DB_NAME,
    multipleStatements: false,
  };
}

async function ensureDatabase(connection, dbName) {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
}

async function copyObjects(sourceConn, targetConn, dbName) {
  await targetConn.query(`USE \`${dbName}\``);
  await sourceConn.query(`USE \`${dbName}\``);

  const [objects] = await sourceConn.query(`SHOW FULL TABLES WHERE Table_type IN ('BASE TABLE','VIEW')`);
  if (!objects.length) {
    console.log('No tables or views found in source database.');
    return;
  }

  await targetConn.query('SET FOREIGN_KEY_CHECKS = 0');
  await targetConn.query('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO"');

  for (const row of objects) {
    const objectName = row[`Tables_in_${dbName}`] || Object.values(row)[0];
    const objectType = row.Table_type || Object.values(row)[1];
    process.stdout.write(`Syncing ${objectType.toLowerCase()} ${objectName}... `);

    if (objectType === 'VIEW') {
      await targetConn.query(`DROP VIEW IF EXISTS \`${objectName}\``);
      const [[{ 'Create View': createView }]] = await sourceConn.query(`SHOW CREATE VIEW \`${objectName}\``);
      await targetConn.query(createView);
      console.log('done');
      continue;
    }

    const [[createTableResult]] = await sourceConn.query(`SHOW CREATE TABLE \`${objectName}\``);
    const createSql = createTableResult['Create Table'];

    await targetConn.query(`DROP TABLE IF EXISTS \`${objectName}\``);
    await targetConn.query(createSql);

    const [rows] = await sourceConn.query(`SELECT * FROM \`${objectName}\``);
    if (!rows.length) {
      console.log('table created, no rows to copy');
      continue;
    }

    const columns = Object.keys(rows[0]).map((col) => `\`${col.replace(/`/g, '``')}\``).join(', ');
    const batchSize = 250;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const values = chunk.map(Object.values);
      const placeholder = `(${new Array(values[0].length).fill('?').join(',')})`;
      const placeholders = new Array(values.length).fill(placeholder).join(',');
      const flattened = values.flat();
      await targetConn.query(`INSERT INTO \`${objectName}\` (${columns}) VALUES ${placeholders}`, flattened);
    }

    console.log(`copied ${rows.length} rows`);
  }

  await targetConn.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function main() {
  try {
    const options = parseArgs();
    if (options.help) {
      console.log(`Usage: node scripts/db-sync.js [--from=local|remote] [--to=remote|local] [--dry-run]\n\nDefault: --from=local --to=remote\n`);
      process.exit(0);
    }

    const infoText = fs.readFileSync(INFO_FILE, 'utf8');
    const servers = parseConfig(infoText);
    if (!servers.local || !servers.remote) {
      throw new Error('Could not parse both local and remote server info from mysql_info.md');
    }

    const sourceConfig = normalizeConfig(servers[options.from]);
    const targetConfig = normalizeConfig(servers[options.to]);

    console.log(`Source: ${options.from} (${sourceConfig.host}:${sourceConfig.port})`);
    console.log(`Target: ${options.to} (${targetConfig.host}:${targetConfig.port})`);
    console.log(`Database: ${DEFAULT_DB_NAME}`);
    if (options.dryRun) {
      console.log('Dry run enabled, no changes will be made.');
      process.exit(0);
    }

    const sourceConn = await mysql.createConnection(sourceConfig);
    const baseTargetConn = await mysql.createConnection({
      host: targetConfig.host,
      port: targetConfig.port,
      user: targetConfig.user,
      password: targetConfig.password,
      multipleStatements: false,
    });

    await ensureDatabase(baseTargetConn, DEFAULT_DB_NAME);
    await copyObjects(sourceConn, baseTargetConn, DEFAULT_DB_NAME);

    await sourceConn.end();
    await baseTargetConn.end();

    console.log('Database synchronization completed successfully.');
  } catch (error) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

main();
