/**
 * game/audio.js
 * Unified audio subsystem facade re-exporting Web Audio context, procedural SFX, and adaptive music.
 * Refactored following Clean Code Single Responsibility Principles (SRP).
 */

export * from './audio/context.js';
export * from './audio/sfx.js';
export * from './audio/music.js';
