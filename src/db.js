
const DB_NAME = 'POSScanDatabase';
const DB_VERSION = 1;

let dbPromise;

export function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
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

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function getRecords(storeName) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction(storeName, 'readonly')
      .objectStore(storeName)
      .getAll();

    request.onsuccess = () => resolve(request.result);
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

export async function deleteRecord(storeName, id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction(storeName, 'readwrite')
      .objectStore(storeName)
      .delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function clearRecords(storeName) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction(storeName, 'readwrite')
      .objectStore(storeName)
      .clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function completeSale(sale, updatedProducts) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ['products', 'sales'],
      'readwrite'
    );

    const productStore = transaction.objectStore('products');
    const saleStore = transaction.objectStore('sales');

    updatedProducts.forEach(product => {
      productStore.put(product);
    });

    const request = saleStore.put(sale);
    let saleId;

    request.onsuccess = () => {
      saleId = request.result;
    };

    transaction.oncomplete = () => resolve(saleId);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
