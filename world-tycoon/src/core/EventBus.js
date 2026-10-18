/**
 * core/EventBus.js
 * Decoupled Publish-Subscribe Event Bus for World Tycoon.
 * Implements Dependency Inversion (DIP) and Single Responsibility (SRP).
 * Allows game engine, UI, 3D scene, audio, and network layers to communicate
 * without direct, tight coupling.
 */

export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event topic.
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void} Unsubscribe function
   */
  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`EventBus: Handler for "${event}" must be a function.`);
    }
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event topic once.
   * @param {string} event
   * @param {Function} handler
   */
  once(event, handler) {
    const unsubscribe = this.on(event, (...args) => {
      unsubscribe();
      handler(...args);
    });
    return unsubscribe;
  }

  /**
   * Unsubscribe a handler from an event.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit an event to all registered listeners.
   * Listeners are invoked with payload data. Errors in listeners are safely caught
   * to prevent one listener from crashing the entire pipeline.
   * @param {string} event
   * @param {*} [payload]
   */
  emit(event, payload) {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) return;
    for (const handler of Array.from(handlers)) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${event}":`, err);
      }
    }
  }

  /**
   * Clears all registered event listeners.
   */
  clear() {
    this.listeners.clear();
  }
}

/** Global default EventBus instance */
export const eventBus = new EventBus();
