#!/usr/bin/env node
/*
 * dev-stack.js — one-click launcher for the full Open Notebook stack.
 *
 * Starts, in order, waiting for each port before the next:
 *   1. SurrealDB                 -> 8000  (cwd: project root)
 *   2. API (FastAPI via .venv)   -> 5055  (cwd: project root, reload OFF)
 *   3. Frontend (Next.js dev)    -> 8502  (cwd: ./frontend)
 *
 * All three run as CHILD processes of this script, so when DevDeck stops
 * this project (taskkill /F /T on the tree) every service is terminated.
 * Each step is idempotent: if a port is already up, that service is skipped.
 * API reload is disabled so it stays a single process (no orphaned forks).
 */

const { spawn, exec } = require('child_process');
const net = require('net');
const path = require('path');

const ROOT = __dirname;
const FRONTEND = path.join(ROOT, 'frontend');
const SURREAL = 'C:\\Users\\Andrey\\AppData\\Local\\Microsoft\\WinGet\\Packages\\SurrealDB.SurrealDB_Microsoft.Winget.Source_8wekyb3d8bbwe\\surreal.exe';
const PYTHON = path.join(ROOT, '.venv', 'Scripts', 'python.exe');

const children = [];

function log(name, msg) {
  process.stdout.write(`[${name}] ${msg}\n`);
}

function launch(name, command, opts) {
  opts = opts || {};
  const child = spawn(command, opts.args || [], {
    cwd: opts.cwd || ROOT,
    shell: !!opts.shell,
    env: opts.env || process.env
  });
  child.stdout.on('data', (d) => process.stdout.write(`[${name}] ${d}`));
  child.stderr.on('data', (d) => process.stdout.write(`[${name}] ${d}`));
  child.on('exit', (code) => log(name, `exited with code ${code}`));
  children.push(child);
  return child;
}

function isPortUp(port) {
  return new Promise((resolve) => {
    const sock = net.connect(port, '127.0.0.1');
    sock.setTimeout(800);
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
    sock.on('error', () => { resolve(false); });
  });
}

function waitPort(port, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 60000);
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (await isPortUp(port)) return resolve();
      if (Date.now() > deadline) return reject(new Error(`Timed out waiting for port ${port}`));
      setTimeout(tick, 500);
    };
    tick();
  });
}

async function ensure(name, port, launchFn) {
  if (await isPortUp(port)) {
    log(name, `already running on ${port} — skipping`);
    return;
  }
  log(name, 'starting...');
  launchFn();
  await waitPort(port);
  log(name, `ready on ${port}`);
}

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  log('stack', 'shutting down — stopping all services');
  for (const c of children) {
    if (c && c.pid) {
      // taskkill /T kills the whole child tree (npm -> next, etc.)
      exec(`taskkill /F /T /PID ${c.pid}`, () => {});
    }
  }
  setTimeout(() => process.exit(0), 1500);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

(async () => {
  try {
    await ensure('db', 8000, () =>
      launch('db', SURREAL, {
        args: ['start', '--log', 'info', '--user', 'root', '--pass', 'root', 'rocksdb:surreal_data/mydatabase.db']
      }));

    await ensure('api', 5055, () =>
      launch('api', PYTHON, {
        args: ['run_api.py'],
        env: { ...process.env, API_RELOAD: 'false' }
      }));

    await ensure('web', 8502, () =>
      launch('web', 'npm run dev -- -p 8502', { cwd: FRONTEND, shell: true }));

    log('stack', 'All services up: DB :8000 | API :5055 | Web :8502');
    log('stack', 'Open http://localhost:8502 — stopping this in DevDeck terminates everything.');
  } catch (err) {
    log('stack', `ERROR: ${err.message}`);
    shutdown();
  }
})();
