# World Tycoon: Global Edition

[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![WebRTC](https://img.shields.io/badge/WebRTC-PeerJS-339933?style=for-the-badge&logo=webrtc)](https://peerjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Build & Release](https://img.shields.io/github/actions/workflow/status/Naman5981/Monopoly/build-and-release.yml?branch=main&style=for-the-badge&label=Build%20%26%20Release)](https://github.com/Naman5981/Monopoly/actions/workflows/build-and-release.yml)
[![Download EXE](https://img.shields.io/badge/Download-WorldTycoon.exe-brightgreen?style=for-the-badge&logo=windows)](https://github.com/Naman5981/Monopoly/releases/download/latest/WorldTycoon.exe)

A 3D Monopoly board game built with Three.js, WebRTC (PeerJS), and Tailwind CSS. You can play solo against AI bots or start an online match with friends using a simple 4-character room code.

Downloads and releases are available on the [Releases page](https://github.com/Naman5981/Monopoly/releases/tag/latest).

---

## Downloads

| Platform | File | Notes |
| :--- | :--- | :--- |
| Windows | [WorldTycoon.exe](https://github.com/Naman5981/Monopoly/releases/download/latest/WorldTycoon.exe) | Single executable, no setup required. Double-click to start. |
| Windows (ZIP) | [WorldTycoon_Online_Game.zip](https://github.com/Naman5981/Monopoly/releases/download/latest/WorldTycoon_Online_Game.zip) | Portable directory with batch launcher. |
| macOS | [WorldTycoon-Mac.zip](https://github.com/Naman5981/Monopoly/releases/download/latest/WorldTycoon-Mac.zip) | Mac app bundle. |

---

## Features

- **P2P Multiplayer**: Share a 4-digit code or link to play with friends over WebRTC. No account setup or dedicated server needed.
- **Solo Play with AI**: Fill any empty seat with an AI bot for quick offline matches.
- **3D Board**: 32 international cities, animated road traffic, day/sunset/night lighting modes, and visible houses and skyscrapers on tiles.
- **Property Trading & Upgrades**: Buy cities, complete color sets, construct houses and skyscrapers, trade with opponents, and collect rent.
- **Special Tiles**: Tropical Island jail, World Festival rent boost, World Tour Airport fast-travel, and Chance wheels.
- **Avatars & Reactions**: 4 character archetypes (Aviator, Banker, Explorer, Cyber Nova), custom colors, and animated emoji reactions.
- **Synthesized Audio**: Sound effects for dice rolls, token moves, purchases, and victory celebrations built with the Web Audio API.

---

## Controls

| Action | Input |
| :--- | :--- |
| Roll dice / Confirm turn | `Space` or click Roll |
| Rotate camera | Right-click + drag, or Middle-click + drag |
| Pan camera | Left-click + drag |
| Zoom | Mouse wheel |
| Send reactions | Click emojis on the bottom dock |

---

## Running Locally

### Option 1: Development Server (Node.js)
```bash
cd world-tycoon
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### Option 2: PowerShell Server
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```
Open `http://localhost:3000` in your browser.

### Option 3: Windows Batch Script
Double-click `run.bat` in the project root.

---

## Building the Windows Executable

To compile `WorldTycoon.exe` from source:
```powershell
powershell -ExecutionPolicy Bypass -File .\build_exe.ps1
```

---

## License

MIT
