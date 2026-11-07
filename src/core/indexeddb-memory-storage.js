
/**
 * XSUS AI Core — IndexedDB Memory Storage
 * Version: 1.0.0
 *
 * Ruajtje lokale e memories për browser.
 * Përdor të njëjtën kontratë bazë storage si JSON adapteri.
 */

export const INDEXEDDB_MEMORY_STORAGE_VERSION = "1.0.0";

const DEFAULT_DATABASE_NAME = "xsus-ai-memory";
const DEFAULT_STORE_NAME = "memory";

function validateOptions(options) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError("Konfigurimi duhet të jetë objekt.");
  }

  if (
    options.databaseName !== undefined &&
    (
      typeof options.databaseName !== "string" ||
      options.databaseName.trim() === ""
    )
  ) {
    throw new TypeError("databaseName duhet të jetë tekst jo bosh.");
  }

  if (
    options.storeName !== undefined &&
    (
      typeof options.storeName !== "string" ||
      options.storeName.trim() === ""
    )
  ) {
    throw new TypeError("storeName duhet të jetë tekst jo bosh.");
  }
}

function createStorageError(code, message, cause) {
  const error = new Error(message);
  error.code = code;

  if (cause !== undefined) {
    error.cause = cause;
  }

  return error;
}

export function createIndexedDBMemoryStorage(options = {}) {
  validateOptions(options);

  if (
    typeof globalThis.indexedDB === "undefined" ||
    typeof globalThis.indexedDB.open !== "function"
  ) {
    throw createStorageError(
      "INDEXEDDB_UNAVAILABLE",
      "IndexedDB nuk është i disponueshëm në këtë mjedis."
    );
  }

  const databaseName =
    options.databaseName ?? DEFAULT_DATABASE_NAME;

  const storeName =
    options.storeName ?? DEFAULT_STORE_NAME;

  let databasePromise = null;
  let closed = false;

  function openDatabase() {
    if (closed) {
      return Promise.reject(
        createStorageError(
          "STORAGE_CLOSED",
          "Storage është mbyllur."
        )
      );
    }

    if (databasePromise) {
      return databasePromise;
    }

    databasePromise = new Promise((resolve, reject) => {
      let request;

      try {
        request = globalThis.indexedDB.open(databaseName, 1);
      } catch (error) {
        reject(
          createStorageError(
            "DATABASE_OPEN_FAILED",
            "Hapja e databazës IndexedDB dështoi.",
            error
          )
        );
        return;
      }

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName);
        }
      };

      request.onsuccess = () => {
        const database = request.result;

        database.onversionchange = () => {
          database.close();
          databasePromise = null;
        };

        resolve(database);
      };

      request.onerror = () => {
        databasePromise = null;

        reject(
          createStorageError(
            "DATABASE_OPEN_FAILED",
            "Hapja e databazës IndexedDB dështoi.",
            request.error
          )
        );
      };

      request.onblocked = () => {
        databasePromise = null;

        reject(
          createStorageError(
            "DATABASE_BLOCKED",
            "Hapja e databazës është bllokuar."
          )
        );
      };
    });

    return databasePromise;
  }

  async function executeTransaction(mode, operation) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
      let transaction;
      let result;

      try {
        transaction = database.transaction(storeName, mode);

        const store = transaction.objectStore(storeName);

        result = operation(store);
      } catch (error) {
        reject(
          createStorageError(
            "STORAGE_OPERATION_FAILED",
            "Operacioni në IndexedDB dështoi.",
            error
          )
        );
        return;
      }

      transaction.oncomplete = () => {
        resolve(result);
      };

      transaction.onerror = () => {
        reject(
          createStorageError(
            "STORAGE_OPERATION_FAILED",
            "Transaksioni IndexedDB dështoi.",
            transaction.error
          )
        );
      };

      transaction.onabort = () => {
        reject(
          createStorageError(
            "STORAGE_TRANSACTION_ABORTED",
            "Transaksioni IndexedDB u anulua.",
            transaction.error
          )
        );
      };
    });
  }

  async function get(key) {
    if (typeof key !== "string" || key.length === 0) {
      throw new TypeError("Çelësi duhet të jetë tekst jo bosh.");
    }

    return executeTransaction("readonly", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  async function set(key, value) {
    if (typeof key !== "string" || key.length === 0) {
      throw new TypeError("Çelësi duhet të jetë tekst jo bosh.");
    }

    return executeTransaction("readwrite", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.put(value, key);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async function deleteItem(key) {
    if (typeof key !== "string" || key.length === 0) {
      throw new TypeError("Çelësi duhet të jetë tekst jo bosh.");
    }

    return executeTransaction("readwrite", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(key);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async function has(key) {
    if (typeof key !== "string" || key.length === 0) {
      throw new TypeError("Çelësi duhet të jetë tekst jo bosh.");
    }

    return executeTransaction("readonly", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getKey(key);

        request.onsuccess = () => {
          resolve(request.result !== undefined);
        };

        request.onerror = () => reject(request.error);
      });
    });
  }

  async function keys() {
    return executeTransaction("readonly", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => reject(request.error);
      });
    });
  }

  async function clear() {
    return executeTransaction("readwrite", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async function getStats() {
    return executeTransaction("readonly", (store) => {
      return new Promise((resolve, reject) => {
        const request = store.count();

        request.onsuccess = () => {
          resolve(
            Object.freeze({
              databaseName,
              storeName,
              itemCount: request.result,
              version: INDEXEDDB_MEMORY_STORAGE_VERSION,
            })
          );
        };

        request.onerror = () => reject(request.error);
      });
    });
  }

  async function close() {
    if (closed) {
      return;
    }

    closed = true;

    if (databasePromise) {
      try {
        const database = await databasePromise;
        database.close();
      } catch {
        // Databaza mund të mos jetë hapur ende.
      }
    }

    databasePromise = null;
  }

  return Object.freeze({
    version: INDEXEDDB_MEMORY_STORAGE_VERSION,
    get,
    set,
    delete: deleteItem,
    has,
    keys,
    clear,
    getStats,
    close,
  });
}
