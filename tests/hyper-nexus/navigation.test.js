
import {
  describe,
  expect,
  test,
  vi
} from "vitest";

import {
  DEFAULT_NAVIGATION_MODULE,
  HYPER_NEXUS_NAVIGATION,
  isValidNavigationModule,
  resolveNavigationModule,
  getNavigationFromLocation,
  createNavigationController
} from "../../app-ui/shell/navigation.js";

function createMockWindow(initialHash = "#overview") {
  let hash = initialHash;
  const listeners = new Map();

  const location = {
    get hash() {
      return hash;
    },
    set hash(value) {
      hash = value;
    }
  };

  const history = {
    pushState: vi.fn((_state, _title, url) => {
      hash = String(url).split("#")[1]
        ? `#${String(url).split("#")[1]}`
        : "";
    }),

    replaceState: vi.fn((_state, _title, url) => {
      hash = String(url).split("#")[1]
        ? `#${String(url).split("#")[1]}`
        : "";
    })
  };

  return {
    location,
    history,

    addEventListener: vi.fn((type, handler) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }

      listeners.get(type).add(handler);
    }),

    removeEventListener: vi.fn((type, handler) => {
      listeners.get(type)?.delete(handler);
    }),

    dispatch(type) {
      for (const handler of listeners.get(type) || []) {
        handler({ type });
      }
    },

    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    }
  };
}

describe("Hyper Nexus — Navigation Controller", () => {

  test("ka Overview si modul fillestar", () => {
    expect(DEFAULT_NAVIGATION_MODULE).toBe("overview");
  });

  test("përdor nëntë modulet e registry", () => {
    expect(Object.keys(HYPER_NEXUS_NAVIGATION))
      .toHaveLength(9);
  });

  test("njeh modulet e regjistruara", () => {
    expect(isValidNavigationModule("overview"))
      .toBe(true);

    expect(isValidNavigationModule("architecture"))
      .toBe(true);

    expect(isValidNavigationModule("unknown"))
      .toBe(false);
  });

  test("modulet e panjohura kthehen te Overview", () => {
    expect(resolveNavigationModule("unknown"))
      .toBe("overview");
  });

  test("lexon modulin nga URL hash", () => {
    expect(
      getNavigationFromLocation({
        hash: "#command-center"
      })
    ).toBe("command-center");
  });

  test("hash i pavlefshëm kthehet te Overview", () => {
    expect(
      getNavigationFromLocation({
        hash: "#not-existing"
      })
    ).toBe("overview");
  });

  test("inicializon navigimin", () => {
    const windowRef = createMockWindow();
    const onNavigate = vi.fn();

    const controller = createNavigationController({
      windowRef,
      onNavigate
    });

    controller.initialize();

    expect(controller.isInitialized()).toBe(true);
    expect(controller.getCurrentModule()).toBe("overview");
    expect(onNavigate).toHaveBeenCalledTimes(1);

    controller.destroy();
  });

  test("navigon te një modul i regjistruar", () => {
    const windowRef = createMockWindow();
    const onNavigate = vi.fn();

    const controller = createNavigationController({
      windowRef,
      onNavigate
    });

    controller.initialize();

    controller.navigate("command-center");

    expect(controller.getCurrentModule())
      .toBe("command-center");

    expect(windowRef.location.hash)
      .toBe("#command-center");

    expect(onNavigate).toHaveBeenCalledTimes(2);

    controller.destroy();
  });

  test("nuk dërgon njoftim të dyfishtë", () => {
    const windowRef = createMockWindow();
    const onNavigate = vi.fn();

    const controller = createNavigationController({
      windowRef,
      onNavigate
    });

    controller.initialize();
    controller.navigate("overview");

    expect(onNavigate).toHaveBeenCalledTimes(1);

    controller.destroy();
  });

  test("përditëson navigimin nga historia", () => {
    const windowRef = createMockWindow();
    const onNavigate = vi.fn();

    const controller = createNavigationController({
      windowRef,
      onNavigate
    });

    controller.initialize();

    windowRef.location.hash = "#architecture";
    windowRef.dispatch("popstate");

    expect(controller.getCurrentModule())
      .toBe("architecture");

    expect(onNavigate).toHaveBeenCalledTimes(2);

    controller.destroy();
  });

  test("pastron event listeners gjatë destroy", () => {
    const windowRef = createMockWindow();

    const controller = createNavigationController({
      windowRef
    });

    controller.initialize();

    expect(windowRef.listenerCount("popstate"))
      .toBe(1);

    expect(windowRef.listenerCount("hashchange"))
      .toBe(1);

    controller.destroy();

    expect(windowRef.listenerCount("popstate"))
      .toBe(0);

    expect(windowRef.listenerCount("hashchange"))
      .toBe(0);
  });

  test("nuk inicializohet dy herë", () => {
    const windowRef = createMockWindow();
    const onNavigate = vi.fn();

    const controller = createNavigationController({
      windowRef,
      onNavigate
    });

    controller.initialize();
    controller.initialize();

    expect(windowRef.listenerCount("popstate"))
      .toBe(1);

    expect(onNavigate).toHaveBeenCalledTimes(1);

    controller.destroy();
  });

});
