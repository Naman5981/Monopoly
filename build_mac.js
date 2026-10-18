const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

console.log('[*] Building macOS Application Bundle (WorldTycoon.app) and distribution zip...');

const rootDir = __dirname;
const gameDir = path.join(rootDir, 'world-tycoon');
const distZip = path.join(rootDir, 'WorldTycoon-Mac.zip');

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

// 1. MacOS Launch Script (Contents/MacOS/WorldTycoon)
const macLauncherScript = `#!/bin/bash
# ========================================================================
#  World Tycoon: Global Edition - macOS Native Game Launcher
# ========================================================================
set -e

DIR="$(cd "$(dirname "$0")"/.. && pwd)"
GAME_DIR="$DIR/Resources/game"

if [ ! -f "$GAME_DIR/index.html" ]; then
    # Fallback to adjacent directory if run outside bundle
    APP_PARENT="$(cd "$DIR/../.." && pwd)"
    if [ -f "$APP_PARENT/world-tycoon/index.html" ]; then
        GAME_DIR="$APP_PARENT/world-tycoon"
    elif [ -f "$APP_PARENT/index.html" ]; then
        GAME_DIR="$APP_PARENT"
    else
        osascript -e 'display alert "World Tycoon Error" message "Game files could not be located in application resources." as critical' 2>/dev/null || true
        exit 1
    fi
fi

# Find free port (3000-3050)
PORT=3000
for p in $(seq 3000 3050); do
    if ! lsof -i :$p >/dev/null 2>&1; then
        PORT=$p
        break
    fi
done

URL="http://localhost:$PORT"

echo "=========================================================="
echo "   WORLD TYCOON: GLOBAL EDITION (3D WEBRTC MULTIPLAYER)   "
echo "=========================================================="
echo "[+] Starting local server on port $PORT..."
echo "[+] Game files: $GAME_DIR"
echo "[+] Game URL: $URL"
echo "=========================================================="

cd "$GAME_DIR"

SERVER_PID=""

if command -v python3 >/dev/null 2>&1; then
    python3 -m http.server "$PORT" >/dev/null 2>&1 &
    SERVER_PID=$!
elif command -v python >/dev/null 2>&1; then
    python -m SimpleHTTPServer "$PORT" >/dev/null 2>&1 &
    SERVER_PID=$!
elif command -v node >/dev/null 2>&1; then
    node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');
const mimes = {
  '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff',
  '.woff2':'font/woff2','.ttf':'font/ttf','.wav':'audio/wav','.mp3':'audio/mpeg'
};
http.createServer((req, res) => {
  let file = path.join(process.cwd(), req.url.split('?')[0]);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimes[ext] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(file).pipe(res);
}).listen($PORT);
" &
    SERVER_PID=$!
else
    echo "[!] Error: Neither python3 nor node found on your system."
    osascript -e 'display alert "World Tycoon Error" message "Python 3 or Node.js is required to start the local game server." as critical' 2>/dev/null || true
    exit 1
fi

cleanup() {
    echo ""
    echo "[*] Shutting down World Tycoon server (PID: $SERVER_PID)..."
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
    fi
    exit 0
}
trap cleanup INT TERM EXIT

sleep 0.8
if command -v open >/dev/null 2>&1; then
    open "$URL"
fi

echo "[+] Game opened in your browser!"
echo "[+] Keep this app open while playing. Quit to stop the server."
echo ""

wait "$SERVER_PID"
`;

// 2. Info.plist
const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>WorldTycoon</string>
    <key>CFBundleIdentifier</key>
    <string>com.worldtycoon.game</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>World Tycoon</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
`;

// 3. WorldTycoon.command (Double-clickable terminal launcher for Mac)
const macCommandScript = `#!/bin/bash
# ========================================================================
#  World Tycoon: Global Edition - macOS Double-Click Terminal Launcher
# ========================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/WorldTycoon.app/Contents/MacOS/WorldTycoon" ]; then
    exec "$SCRIPT_DIR/WorldTycoon.app/Contents/MacOS/WorldTycoon"
fi

GAME_DIR="$SCRIPT_DIR/world-tycoon"
if [ ! -d "$GAME_DIR" ]; then
    GAME_DIR="$SCRIPT_DIR"
fi

PORT=3000
for p in $(seq 3000 3050); do
    if ! lsof -i :$p >/dev/null 2>&1; then
        PORT=$p
        break
    fi
done

URL="http://localhost:$PORT"

echo "=========================================================="
echo "   WORLD TYCOON: GLOBAL EDITION (3D WEBRTC MULTIPLAYER)   "
echo "=========================================================="
echo "[+] Starting local server on port $PORT..."
echo "[+] Game URL: $URL"
echo "=========================================================="

cd "$GAME_DIR"

if command -v python3 >/dev/null 2>&1; then
    python3 -m http.server "$PORT" &
    SERVER_PID=$!
elif command -v python >/dev/null 2>&1; then
    python -m SimpleHTTPServer "$PORT" &
    SERVER_PID=$!
else
    echo "Python 3 or Node is required."
    exit 1
fi

cleanup() {
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
    fi
    exit 0
}
trap cleanup INT TERM EXIT

sleep 0.8
open "$URL"

echo "[+] Game opened in your browser!"
echo "[+] Press Ctrl+C in this terminal when finished playing."
echo ""

wait "$SERVER_PID"
`;

// 4. Instructions for Mac users
const macInstructions = `========================================================================
     WORLD TYCOON : GLOBAL EDITION (macOS INSTALLATION & PLAY)
========================================================================

Welcome to World Tycoon on macOS!

HOW TO RUN ON MAC:
------------------------------------------------------------------------
METHOD 1 (Recommended - App Bundle):
1. Double-click "WorldTycoon.app".
   (If macOS Gatekeeper displays "unidentified developer", right-click
   "WorldTycoon.app" and select "Open", then click "Open").
2. Your default web browser (Safari/Chrome/Brave) will automatically open
   to the 3D board at http://localhost:3000/.
3. Play online or local solo!

METHOD 2 (Terminal Launcher):
1. Double-click "WorldTycoon.command".
2. A small terminal window opens and automatically launches the game.
3. Keep the terminal open while you play!

HOW TO PLAY ONLINE WITH FRIENDS:
------------------------------------------------------------------------
* One player clicks "🌐 Online WebRTC (P2P)" -> "Create Room" to get a 4-letter Room Code.
* The other player enters the code under "Join Friend's Room" and clicks "Connect".
* Ready up and become the ultimate World Tycoon!
========================================================================
`;

// Collect all entries for the zip archive
const entries = [];

function addEntry(relPath, content, isDir = false, isExec = false) {
  // Normalize path with forward slashes
  const cleanPath = relPath.replace(/\\\\/g, '/');
  entries.push({
    path: isDir && !cleanPath.endsWith('/') ? cleanPath + '/' : cleanPath,
    isDir,
    isExec,
    content: content || Buffer.alloc(0)
  });
}

// Scaffold WorldTycoon.app hierarchy
addEntry('WorldTycoon.app', null, true, true);
addEntry('WorldTycoon.app/Contents', null, true, true);
addEntry('WorldTycoon.app/Contents/MacOS', null, true, true);
addEntry('WorldTycoon.app/Contents/MacOS/WorldTycoon', Buffer.from(macLauncherScript.replace(/\\r\\n/g, '\\n'), 'utf8'), false, true);
addEntry('WorldTycoon.app/Contents/Info.plist', Buffer.from(infoPlist.replace(/\\r\\n/g, '\\n'), 'utf8'), false, false);
addEntry('WorldTycoon.app/Contents/PkgInfo', Buffer.from('APPL????', 'utf8'), false, false);
addEntry('WorldTycoon.app/Contents/Resources', null, true, true);
addEntry('WorldTycoon.app/Contents/Resources/game', null, true, true);

// Add top-level helper files
addEntry('WorldTycoon.command', Buffer.from(macCommandScript.replace(/\\r\\n/g, '\\n'), 'utf8'), false, true);
addEntry('HOW_TO_RUN_MAC.txt', Buffer.from(macInstructions, 'utf8'), false, false);

// Recursively add all files from world-tycoon directory into WorldTycoon.app/Contents/Resources/game/
function walkDir(dir, prefix) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === '.git' || item === 'node_modules') continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    const rel = prefix + '/' + item;
    if (stat.isDirectory()) {
      addEntry(rel, null, true, true);
      walkDir(fullPath, rel);
    } else {
      const data = fs.readFileSync(fullPath);
      addEntry(rel, data, false, false);
    }
  }
}

walkDir(gameDir, 'WorldTycoon.app/Contents/Resources/game');

console.log(`[*] Collected ${entries.length} items. Writing ZIP with Unix 0755 attributes...`);

// Build ZIP archive buffer
const localParts = [];
const cdParts = [];
let offset = 0;

for (const entry of entries) {
  const nameBuf = Buffer.from(entry.path, 'utf8');
  const comp = entry.isDir ? Buffer.alloc(0) : zlib.deflateRawSync(entry.content);
  const crc = crc32(entry.content);

  // Local file header (30 bytes)
  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0);
  lh.writeUInt16LE(20, 4); // version needed
  lh.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
  lh.writeUInt16LE(entry.isDir ? 0 : 8, 8); // Compression: Store for dir, Deflate for file
  lh.writeUInt16LE(0, 10); // mod time
  lh.writeUInt16LE(0, 12); // mod date
  lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(comp.length, 18);
  lh.writeUInt32LE(entry.content.length, 22);
  lh.writeUInt16LE(nameBuf.length, 26);
  lh.writeUInt16LE(0, 28); // extra field length

  localParts.push(lh, nameBuf, comp);

  // Central directory header (46 bytes)
  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(0x0314, 4); // version made by: 3 (Unix), version 20
  cd.writeUInt16LE(20, 6); // version needed
  cd.writeUInt16LE(0x0800, 8); // UTF-8
  cd.writeUInt16LE(entry.isDir ? 0 : 8, 10);
  cd.writeUInt16LE(0, 12);
  cd.writeUInt16LE(0, 14);
  cd.writeUInt32LE(crc, 16);
  cd.writeUInt32LE(comp.length, 20);
  cd.writeUInt32LE(entry.content.length, 24);
  cd.writeUInt16LE(nameBuf.length, 28);
  cd.writeUInt16LE(0, 30); // extra field
  cd.writeUInt16LE(0, 32); // comment length
  cd.writeUInt16LE(0, 34); // disk start
  cd.writeUInt16LE(0, 36); // internal attrs

  // Unix permissions in upper 16 bits of external attributes:
  // Dir: 0o040755 | DOS dir bit 0x10 -> 0x41ed0010
  // Exec: 0o100755 -> 0x81ed0000
  // Regular: 0o100644 -> 0x81a40000
  const rawMode = entry.isDir
    ? ((0o040755 << 16) | 0x10)
    : (entry.isExec ? (0o100755 << 16) : (0o100644 << 16));
  cd.writeUInt32LE(rawMode >>> 0, 38);
  cd.writeUInt32LE(offset, 42);

  cdParts.push(cd, nameBuf);

  offset += 30 + nameBuf.length + comp.length;
}

const cdBuf = Buffer.concat(cdParts);

// End of Central Directory Record (22 bytes)
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(entries.length, 8);
eocd.writeUInt16LE(entries.length, 10);
eocd.writeUInt32LE(cdBuf.length, 12);
eocd.writeUInt32LE(offset, 16);
eocd.writeUInt16LE(0, 20);

const finalZip = Buffer.concat([...localParts, cdBuf, eocd]);
fs.writeFileSync(distZip, finalZip);

const stat = fs.statSync(distZip);
console.log(`[+] SUCCESS: Created macOS distribution archive:`);
console.log(`    Path: ${distZip}`);
console.log(`    Size: ${stat.size} bytes (${(stat.size / 1024).toFixed(2)} KB)`);
