
const DB_NAME = 'POSScanDatabase';
const DB_VERSION = 1;

let database;

export function openDatabase() {
  if (database) return Promise.resolve(database);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', {
          keyPath: 'id',
          autoIncrement: true
        });
      }

      if (!db.objectStoreNames.contains('sales')) {
        db.createObjectStore('sales', {
          keyPath: 'id',
          autoIncrement: true
        });
      }
    };

    request.onsuccess = () => {
      database = request.result;
      resolve(database);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function saveRecord(storeName, record) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const request = transaction.objectStore(storeName).put(record);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getRecords(storeName) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRecord(storeName, id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const request = transaction.objectStore(storeName).delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function clearRecords(storeName) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const request = transaction.objectStore(storeName).clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}
