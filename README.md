# 🌐 World Tycoon: Global Edition (Monopoly 3D)

[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![WebRTC](https://img.shields.io/badge/WebRTC-PeerJS-339933?style=for-the-badge&logo=webrtc)](https://peerjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Windows Executable](https://img.shields.io/badge/Windows-Standalone_EXE-0078D6?style=for-the-badge&logo=windows)](https://microsoft.com)

**World Tycoon: Global Edition** is an isometric 3D global property trading board game built with **Three.js**, **WebRTC P2P DataChannels (PeerJS)**, **Web Audio API**, and **Tailwind CSS**. It combines classic Monopoly real-estate trading mechanics with modern serverless multiplayer, animated 3D dioramas, customizable avatars, and live auctions.

---

## 🎮 Highlights & Current Features

### 🌐 1. Serverless WebRTC P2P Multiplayer
- **Direct Peer-to-Peer Networking**: Play online with friends anywhere in the world using WebRTC DataChannels powered by PeerJS.
- **Easy Room Sharing**: Generate instant 4-character Room Codes (e.g. `8492`) or one-click copyable invite links (`?room=8492`).
- **Synchronized Turn State**: Real-time broadcast and receipt of dice rolls, property acquisitions, house/skyscraper construction, mortgages, auction bids, trades, reactions, and chat events.
- **Room Preservation on Return to Lobby**: Online players remain connected in the room when returning to the lobby after match completion—no accidental room disconnections.

### 🏆 2. Victory Celebration & Seamless Rematches
- **Victory Royale Card**: Displays champion accolades, final cash totals, and empire city counts with spinning radiant sunbursts and celebratory crowd fanfares.
- **Instant Play Again Button**: Restart immediately with the same players and settings. In multiplayer, the host triggers a synchronous rematch for all connected clients.
- **Dedicated Lobby Button**: Brings all table players back to the interactive 3D lobby without disconnecting the multiplayer room session.
- **Guest Rematch Requests**: Connected guests can request a rematch with real-time notification alerts sent to the host.

### 👥 3. Interactive 3D Lobby Table
- **Dynamic Player Count**: Support for 2, 3, or 4 players (1v1, Triangle, or Grand Slam).
- **Custom Tycoon Profiles**: Custom player names with a 🎲 Randomize Names generator.
- **Human vs AI Bots**: Flexible slot assignment allowing solo play against smart AI bots or any mix of human and bot opponents.
- **4 Distinct Character Archetypes**:
  - ✈️ **The Aviator**: Vintage flight helmet & brass goggles
  - 🎩 **The Banker**: Top hat & golden monocle
  - 🧭 **The Explorer**: Safari pith helmet & crest
  - 👑 **Cyber Nova**: Futuristic neon crown & visor
- **Candy Color Themes**: Ruby Red, Sky Blue, Lawn Green, Lime, Purple, Peach, Pink, Turquoise.
- **Live 3D Hero Podium**: Center stage featuring a 3D rotating grass island with custom avatars, trees, and mini dice.

### 🏙️ 4. 3D Isometric Diorama & World Board
- **32 International Tiles**: Global metropolitan cities across color groups (London, Tokyo, New York, Paris, Rome, Sydney, Cairo, etc.) plus exotic Resort Destinations.
- **Procedural 3D Architecture**: Distinct 3D houses and skyscrapers that dynamically construct and populate on the game tiles as properties are upgraded.
- **Animated Atmosphere**:
  - Dual-lane road traffic with independent wheel rotation and suspension bobbing.
  - Floating low-poly atmospheric clouds and hot-air balloons.
  - Animated central city park with water fountain and trees.
  - Dynamic time-of-day lighting: **☀️ Day**, **🌅 Sunset**, and **🌙 Cyber Night**.

### 💼 5. Real Estate & Monopoly Mechanics
- **Color Group Monopolies**: Owning all cities of a color set unlocks house and skyscraper construction, with doubled base rent.
- **Property Management & Mortgages**: Manage Cities portfolio inspector to mortgage properties for 50% cash value or unmortgage for 55%.
- **Live City Auctions**: When a player declines purchasing an unowned city, it can be put up for live public bidding with interactive countdown timers and raise increments.
- **Player-to-Player Trading**: Propose direct property trades and cash considerations with any opponent.

### 🎡 6. Corner Landmarks & Special Mechanics
- 🚩 **START**: Collect +300K salary every time you pass the origin tile.
- 🏝️ **Tropical Island**: Detention zone requiring doubles or 150K bail to escape.
- 🎪 **World Festival**: Accumulates tax jackpot pools and applies a 2× festival rent boost to an owned city.
- ✈️ **World Tour Airport**: Select and fly directly to any tile across the entire board.
- 🎡 **Chance Fortune Wheel**: 8 dynamic randomized outcomes including cash bonuses, rent multipliers, free city deeds, and travel perks.

### 🔊 7. Procedural Web Audio & Physics Reactions
- **100% Synthesized Sound FX**: Procedural Web Audio API sound synthesis for dice rolls, token hops, building construction, auction gavels, cash registers, and victory heralds without external audio asset downloads.
- **Interactive Reactions**: Physics-based floating emoji animations (Tomato Splat 🍅, Cash Shower 💸, Fire Celebration 🔥, Sunglasses 😎, Tears 😭, Rocket 🚀).

### 💻 8. Standalone Windows Executable (`WorldTycoon.exe`)
- Embedded C# multi-threaded HTTP server compiled with .NET Framework 4.0+.
- Packaged with all web assets into a lightweight, standalone Windows executable (~127 KB) that runs out-of-the-box with zero installation or runtime dependencies.

---

## 🚀 Getting Started

### Option 1: Standalone Windows Executable (Fastest)
1. Double-click `WorldTycoon.exe` in the root folder.
2. The game will automatically launch in your default web browser on `http://localhost:3000`.

### Option 2: Windows Batch Launcher
1. Double-click `run.bat` in the project root.
2. If `WorldTycoon.exe` exists, it will launch the game; otherwise, it will start the local PowerShell server (`server.ps1`).

### Option 3: Local PowerShell Server
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```
Open your browser at `http://localhost:3000`.

### Option 4: Vite Development Server
```bash
cd world-tycoon
npm install
npm run dev
```

---

## 📂 Project Architecture

```
Monopoly/
├── world-tycoon/                    # Modular web application
│   ├── index.html                   # Game shell, UI HUD & modals
│   ├── package.json                 # Project configuration
│   ├── vite.config.js               # Vite build configuration
│   └── src/
│       ├── main.js                  # App bootstrap, clock loop & global bindings
│       ├── style.css                # Game CSS, animations & UI styling
│       ├── game/
│       │   ├── data.js              # 32 Board tiles, archetypes & prizes
│       │   ├── state.js             # Reactive game state & match settings
│       │   ├── rules.js             # Rent calculations, monopolies & liquidation
│       │   ├── audio.js             # Web Audio procedural sound synthesizer
│       │   ├── engine.js            # Turn progression, dice rolls & AI bot logic
│       │   ├── persistence.js       # LocalStorage auto-save & match resume
│       │   └── utils.js             # Formatting & currency helpers
│       ├── network/
│       │   └── p2p.js               # WebRTC PeerJS multiplayer engine
│       ├── three/
│       │   ├── scene.js             # Three.js 3D diorama, avatars, dice & traffic
│       │   └── effects.js           # Confetti cannons, lighting & reactions
│       └── ui/
│           ├── setup.js             # Interactive landing lobby table manager
│           ├── hud.js               # 4-Corner player HUD cards & live ticker
│           └── modals.js            # Buy city, auction, chance wheel & trade dialogs
├── release-notes/                   # Version history & architectural enhancement sheets
│   ├── README.md                    # Master release registry
│   ├── v2.0.0-architecture-modularization.md # 3D diorama modularization & facade
│   └── v2.1.0-performance-optimization.md    # CPU 70-90% reduction & 60 FPS pacing
├── Launcher.cs                      # C# Standalone WebRTC server launcher source
├── build_exe.ps1                    # Compiles Launcher.cs into WorldTycoon.exe
├── build_zip.ps1                    # Packages world-tycoon/ into world-tycoon.zip
├── package_distribution.ps1         # Builds standalone distribution package
├── server.ps1                       # Lightweight local HTTP server
├── run.bat                          # One-click Windows launch script
└── README.md                        # Documentation & feature overview
```

---

## 📜 Release Notes & Architecture History

For detailed architectural specifications, performance benchmarks, and version histories, see the [release-notes/](file:///c:/Users/karti/OneDrive/Desktop/Anti%20Gravity/Monopoly/Monopoly/release-notes/) directory:

- [Release Notes Master Registry](file:///c:/Users/karti/OneDrive/Desktop/Anti%20Gravity/Monopoly/Monopoly/release-notes/README.md)
- [v2.1.0 — CPU & Rendering Pipeline Performance Optimization](file:///c:/Users/karti/OneDrive/Desktop/Anti%20Gravity/Monopoly/Monopoly/release-notes/v2.1.0-performance-optimization.md) (Fixes 70–90% CPU usage, adds 60 FPS limiter, lobby background bypass, on-demand shadows, and eliminates GPU readback stalls)
- [v2.0.0 — Three.js Architecture Modularization](file:///c:/Users/karti/OneDrive/Desktop/Anti%20Gravity/Monopoly/Monopoly/release-notes/v2.0.0-architecture-modularization.md) (Modularizes 4,504-line monolith into 19 submodules under the Facade pattern)

---

## 🛠️ Building the Standalone Executable

To compile `WorldTycoon.exe` from source:
```powershell
# 1. Package game assets into zip
powershell -ExecutionPolicy Bypass -File .\build_zip.ps1

# 2. Compile C# launcher with embedded assets
powershell -ExecutionPolicy Bypass -File .\build_exe.ps1

# 3. Create clean distribution package
powershell -ExecutionPolicy Bypass -File .\package_distribution.ps1
```

---

## 📜 License
MIT License. Built for fun, open real-estate strategy gaming!

