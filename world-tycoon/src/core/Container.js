/**
 * core/Container.js
 * Inversion of Control (IoC) Service Container for World Tycoon.
 * Implements Dependency Inversion Principle (DIP) and Interface Segregation Principle (ISP).
 * Decouples core game mechanics from low-level DOM, Three.js, WebAudio, and WebRTC drivers.
 */

import { eventBus } from './EventBus.js';

class ServiceContainer {
  constructor() {
    /** @type {Map<string, any>} */
    this.services = new Map();
    // Register the shared EventBus by default
    this.register('events', eventBus);
  }

  /**
   * Register a service instance or factory.
   * @param {string} key
   * @param {*} service
   */
  register(key, service) {
    this.services.set(key, service);
    return this;
  }

  /**
   * Resolve a registered service.
   * Throws if service is not found and no fallback provided.
   * @template T
   * @param {string} key
   * @param {T} [fallback]
   * @returns {T}
   */
  resolve(key, fallback = null) {
    if (this.services.has(key)) {
      return this.services.get(key);
    }
    if (fallback !== null) {
      return fallback;
    }
    throw new Error(`[ServiceContainer] Service not registered: "${key}"`);
  }

  /**
   * Checks if a service is registered.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.services.has(key);
  }

  /**
   * Clears all services except the core event bus.
   */
  reset() {
    this.services.clear();
    this.register('events', eventBus);
  }
}

/** Global default ServiceContainer instance */
export const container = new ServiceContainer();
