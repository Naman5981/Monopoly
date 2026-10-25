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

    const elementsById = new Map();

    function createMockElement(tag = 'DIV', id = '') {
      const classes = new Set();
      const attributes = new Map();
      const elementListeners = new Map();
      const children = [];
      const childMapByClass = new Map();
      let _id = id;

      const element = {
        get id() {
          return _id;
        },
        set id(val) {
          _id = val;
          if (val) elementsById.set(val, element);
        },
        tagName: tag.toUpperCase(),
        parentElement: null,
        get className() {
          return Array.from(classes).join(' ');
        },
        set className(val) {
          classes.clear();
          if (typeof val === 'string') {
            val.split(/\s+/).forEach(c => c && classes.add(c));
          }
        },
        classList: {
          add: (...cls) => cls.forEach(c => c && classes.add(c)),
          remove: (...cls) => cls.forEach(c => classes.delete(c)),
          contains: (c) => classes.has(c),
          toggle: (c, force) => {
            if (force === true) { classes.add(c); return true; }
            if (force === false) { classes.delete(c); return false; }
            if (classes.has(c)) { classes.delete(c); return false; }
            classes.add(c); return true;
          }
        },
        style: {
          setProperty: () => {},
          removeProperty: () => {},
          getPropertyValue: () => ''
        },
        getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 100, bottom: 100, right: 100 }),
        setAttribute: (k, v) => attributes.set(k, String(v)),
        getAttribute: (k) => attributes.has(k) ? attributes.get(k) : null,
        removeAttribute: (k) => attributes.delete(k),
        addEventListener: (type, fn) => {
          if (!elementListeners.has(type)) elementListeners.set(type, new Set());
          elementListeners.get(type).add(fn);
        },
        removeEventListener: (type, fn) => {
          elementListeners.get(type)?.delete(fn);
        },
        dispatchEvent: (event) => {
          elementListeners.get(event?.type)?.forEach(fn => fn(event));
          return true;
        },
        appendChild: (child) => {
          children.push(child);
          if (child && typeof child === 'object') child.parentElement = element;
          return child;
        },
        removeChild: (child) => {
          const idx = children.indexOf(child);
          if (idx !== -1) children.splice(idx, 1);
          if (child && typeof child === 'object') child.parentElement = null;
          return child;
        },
        remove: function() {
          if (this.parentElement && typeof this.parentElement.removeChild === 'function') {
            this.parentElement.removeChild(this);
          }
        },
        prepend: () => {},
        getContext: () => mockContext,
        get children() {
          return children;
        },
        querySelector: (sel) => {
          if (typeof sel === 'string' && sel.startsWith('#')) {
            return document.getElementById(sel.slice(1));
          }
          if (typeof sel === 'string' && sel.startsWith('.')) {
            const cls = sel.slice(1);
            for (const c of children) {
              if (c.classList?.contains(cls)) return c;
            }
            if (cls === 'island-iron-bars' || cls === 'hud-detention-badge') {
              if (element.innerHTML && element.innerHTML.includes(cls)) {
                const badgeEl = createMockElement('SPAN');
                badgeEl.classList.add(cls);
                const m = element.innerHTML.match(/JAIL \d\/3/);
                badgeEl.textContent = m ? m[0] : 'JAIL';
                return badgeEl;
              }
              return null;
            }
            if (!childMapByClass.has(cls)) {
              const mock = createMockElement('DIV');
              mock.classList.add(cls);
              if (element.innerHTML && element.innerHTML.includes(cls)) {
                const regex = new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([^<]*)`, 'i');
                const m = element.innerHTML.match(regex);
                if (m) mock.textContent = m[1].trim();
              }
              childMapByClass.set(cls, mock);
            }
            return childMapByClass.get(cls);
          }
          return createMockElement();
        },
        querySelectorAll: () => [],
        _innerHTML: '',
        get innerHTML() {
          return this._innerHTML;
        },
        set innerHTML(val) {
          this._innerHTML = typeof val === 'string' ? val : '';
          if (typeof val === 'string') {
            const idTextMatches = [...val.matchAll(/id="([^"]+)"[^>]*>([^<]*)/g)];
            for (const match of idTextMatches) {
              const childId = match[1];
              const text = match[2].trim();
              if (text && globalThis.document?.getElementById) {
                const childEl = globalThis.document.getElementById(childId);
                if (childEl) childEl.textContent = text;
              }
            }
          }
        },
        textContent: '',
        value: '',
        width: 100,
        height: 100,
        disabled: false,
        focus: () => {},
        blur: () => {}
      };

      if (id) {
        elementsById.set(id, element);
      }

      return element;
    }

    const dummyElement = createMockElement();

    globalThis.document = {
      getElementById: (id) => {
        if (!elementsById.has(id)) {
          elementsById.set(id, createMockElement('DIV', id));
        }
        return elementsById.get(id);
      },
      querySelector: (sel) => {
        if (typeof sel === 'string' && sel.startsWith('#')) {
          return document.getElementById(sel.slice(1));
        }
        return createMockElement();
      },
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

    const mockSession = new Map();
    globalThis.sessionStorage = {
      getItem: (k) => (mockSession.has(k) ? mockSession.get(k) : null),
      setItem: (k, v) => mockSession.set(k, String(v)),
      removeItem: (k) => mockSession.delete(k),
      clear: () => mockSession.clear()
    };

    const windowListeners = new Map();
    globalThis.KeyboardEvent = class KeyboardEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.key = init.key || '';
        this.code = init.code || '';
        this.bubbles = !!init.bubbles;
        this.shiftKey = !!init.shiftKey;
        this.ctrlKey = !!init.ctrlKey;
        this.altKey = !!init.altKey;
      }
      preventDefault() { this.defaultPrevented = true; }
    };

    globalThis.window = {
      document: globalThis.document,
      localStorage: globalThis.localStorage,
      sessionStorage: globalThis.sessionStorage,
      KeyboardEvent: globalThis.KeyboardEvent,
      addEventListener: (type, fn) => {
        if (!windowListeners.has(type)) windowListeners.set(type, new Set());
        windowListeners.get(type).add(fn);
      },
      removeEventListener: (type, fn) => {
        windowListeners.get(type)?.delete(fn);
      },
      dispatchEvent: (event) => {
        windowListeners.get(event?.type)?.forEach(fn => fn(event));
        return true;
      },
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

