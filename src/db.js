
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
import { getRecords, saveRecord, completeSale } from './db.js';

async function addToCart(product) {
  const existing = state.cart.find(item => item.id === product.id);
  const reserved = existing ? existing.qty : 0;

  if (product.stock <= reserved) {
    alert('Not enough stock available.');
    return;
  }

  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1
    });
  }

  render();
}

async function removeFromCart(index) {
  state.cart.splice(index, 1);
  render();
}

async function checkout() {
  if (!state.cart.length) {
    alert('Your shopping cart is empty.');
    return;
  }

  const updatedProducts = state.products.map(product => {
    const item = state.cart.find(p => p.id === product.id);

    return item
      ? { ...product, stock: product.stock - item.qty }
      : product;
  });

  if (updatedProducts.some(p => p.stock < 0)) {
    alert('Insufficient stock. Please review your cart.');
    return;
  }

  const total = state.cart.reduce(
    (sum, item) => sum + item.price * item.qty, 0
  );

  const sale = {
    total,
    currency: state.currency,
    date: new Date().toLocaleString(),
    createdAt: new Date().toISOString(),
    items: state.cart.map(item => ({ ...item }))
  };

  try {
    sale.id = await completeSale(sale, updatedProducts);
    state.products = updatedProducts;
    state.sales.unshift(sale);
    state.cart = [];
    render();
    alert('Sale completed successfully!');
  } catch (error) {
    alert('Sale failed. Your stock has not been deducted.');
    throw error;
  }
}
