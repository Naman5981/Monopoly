# 📜 World Tycoon — Release Notes & Version History

Welcome to the official release registry for **World Tycoon: Global Edition**. This directory tracks the evolution of the codebase, architectural enhancements, performance optimizations, and feature milestones.

---

## 📑 Version Index

| Version | Release Date | Title | Key Enhancements | Document |
| :--- | :--- | :--- | :--- | :--- |
| **v2.1.0** | 2026-10-15 | **CPU & GPU Performance Pipeline Optimization** | 60 FPS limiter, lobby background bypass, on-demand shadow passes, HUD portrait caching, fluid hop step transitions | [v2.1.0 Notes](file:///c:/Users/karti/OneDrive/Desktop/Anti%20Gravity/Monopoly/Monopoly/release-notes/v2.1.0-performance-optimization.md) |
| **v2.0.0** | 2026-10-15 | **Three.js Architecture Modularization** | Monolithic `scene.js` (4,504 lines) decoupled into 19 single-responsibility submodules and unified Facade pattern | [v2.0.0 Notes](file:///c:/Users/karti/OneDrive/Desktop/Anti%20Gravity/Monopoly/Monopoly/release-notes/v2.0.0-architecture-modularization.md) |
| **v1.5.0** | 2026-10-14 | **Standalone Launcher & P2P WebRTC Multiplayer** | C# embedded HTTP server, background daemon, PeerJS WebRTC cloud broker, automated build scripts | [v1.5.0 Notes](file:///c:/Users/karti/OneDrive/Desktop/Anti%20Gravity/Monopoly/Monopoly/release-notes/v1.5.0-launcher-and-multiplayer.md) |
| **v1.0.0** | 2026-10-10 | **Initial 3D Board Release** | Isometric 3D diorama, 32 board properties, procedural avatars, dice physics, property upgrades, audio SFX | [v1.0.0 Notes](file:///c:/Users/karti/OneDrive/Desktop/Anti%20Gravity/Monopoly/Monopoly/release-notes/v1.0.0-initial-release.md) |

---

## 🎯 Architecture Standards & Quality Goals

Every release in World Tycoon adheres to these core architectural commitments:
- **Zero Breaking Changes:** External callers (`engine.js`, `modals.js`, `hud.js`, `setup.js`, `main.js`, `persistence.js`) communicate through a stable facade.
- **Vanilla ES Module Compliance:** Standard `.js` modules with explicit file extensions for native browser execution without bundler overhead.
- **Single Responsibility Principle:** Code is segregated by domain (`core`, `board`, `assets`, `pawns`, `stages`, `environment`).
- **60 FPS High Efficiency:** Strict frame budgeting, on-demand shadow updates, and zero synchronous GPU-to-CPU stalls.
