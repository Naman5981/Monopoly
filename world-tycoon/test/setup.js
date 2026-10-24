/**
 * test/setup.js
 * Universal mock setup for testing world-tycoon game engine and P2P networking under Node.js.
 */

export function setupBrowserMocks() {
  if (typeof globalThis.window === 'undefined') {
    const mockContext = new Proxy({
      canvas: { width: 100, height: 100 },
      measureText: () => ({ width: 10 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {}
    }, {
      get(target, prop) {
        if (prop in target) return target[prop];
        return () => {};
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      }
    });

    function createMockElement(tag = 'DIV', id = '') {
      return {
        id,
        tagName: tag.toUpperCase(),
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false,
          toggle: () => {}
        },
        style: {
          setProperty: () => {},
          removeProperty: () => {},
          getPropertyValue: () => ''
        },
        getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 100, bottom: 100, right: 100 }),
        setAttribute: () => {},
        getAttribute: () => null,
        removeAttribute: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        appendChild: () => {},
        removeChild: () => {},
        remove: () => {},
        prepend: () => {},
        getContext: () => mockContext,
        querySelector: () => createMockElement(),
        querySelectorAll: () => [],
        innerHTML: '',
        textContent: '',
        value: '',
        width: 100,
        height: 100,
        disabled: false,
        focus: () => {},
        blur: () => {}
      };
    }

    const dummyElement = createMockElement();

    const elementsById = new Map();
    globalThis.document = {
      getElementById: (id) => {
        if (!elementsById.has(id)) {
          elementsById.set(id, createMockElement('DIV', id));
        }
        return elementsById.get(id);
      },
      querySelector: () => createMockElement(),
      querySelectorAll: () => [],
      createElement: (tag) => createMockElement(tag),
      addEventListener: () => {},
      removeEventListener: () => {},
      body: createMockElement('BODY')
    };

    const mockStorage = new Map();
    globalThis.localStorage = {
      getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
      clear: () => mockStorage.clear()
    };

    globalThis.window = {
      document: globalThis.document,
      localStorage: globalThis.localStorage,
      addEventListener: () => {},
      removeEventListener: () => {},
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      setInterval: globalThis.setInterval,
      clearInterval: globalThis.clearInterval,
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => {},
      location: {
        href: 'http://localhost:5173/',
        origin: 'http://localhost:5173',
        protocol: 'http:',
        host: 'localhost:5173',
        pathname: '/',
        search: ''
      },
      navigator: {
        clipboard: {
          writeText: async () => {}
        }
      },
      alert: () => {}
    };

    globalThis.Path2D = class Path2D {
      arc() {}
      moveTo() {}
      lineTo() {}
      closePath() {}
    };

    globalThis.Audio = class Audio {
      play() { return Promise.resolve(); }
      pause() {}
      load() {}
    };

    globalThis.requestAnimationFrame = () => 1;
    globalThis.cancelAnimationFrame = () => {};
  }
}

// Auto-initialize browser mocks on import
setupBrowserMocks();

