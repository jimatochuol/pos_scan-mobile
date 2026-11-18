
import './style.css';
import { getRecords, saveRecord } from './db.js';
import { startScanner } from './scanner.js';

const state = {
  products: [],
  sales: [],
  cart: [],
  currency: localStorage.getItem('pos_currency') || 'USD',
  busy: false
};

const app = document.querySelector('#app');

function money(amount) {
  return state.currency === 'USD'
    ? '$' + Number(amount).toFixed(2)
    : 'SSP ' + Number(amount).toFixed(2);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

async function loadData() {
  state.products = await getRecords('products');
  state.sales = await getRecords('sales');
}

async function addProduct() {
  const name = document.querySelector('#productName').value.trim();
  const barcode = document.querySelector('#productBarcode').value.trim();
  const price = Number(document.querySelector('#productPrice').value);
  const stock = Number(document.querySelector('#productStock').value);

  if (!name || !Number.isFinite(price) || price <= 0 ||
      !Number.isInteger(stock) || stock < 0) {
    alert('Enter a valid product name, price and stock quantity.');
    return;
  }

  if (barcode && state.products.some(p => p.barcode === barcode)) {
    alert('This barcode already exists.');
    return;
  }

  const product = { name, barcode, price, stock };
  product.id = await saveRecord('products', product);

  state.products.push(product);
  render();
}

async function changeStock(product, amount) {
  product.stock += amount;
  await saveRecord('products', product);
}

async function addToCart(product) {
  if (product.stock <= 0) {
    alert('This product is out of stock.');
    return;
  }

  const existing = state.cart.find(item => item.id === product.id);

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

  await changeStock(product, -1);
  render();
}

async function removeFromCart(index) {
  const item = state.cart[index];
  const product = state.products.find(p => p.id === item.id);

  if (product) {
    await changeStock(product, item.qty);
  }

  state.cart.splice(index, 1);
  render();
}

async function checkout() {
  if (!state.cart.length) {
    alert('Your shopping cart is empty.');
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

  sale.id = await saveRecord('sales', sale);

  state.sales.unshift(sale);
  state.cart = [];

  render();
  alert('Sale completed successfully!');
}

async function scanProduct() {
  if (state.busy) return;

  state.busy = true;
  const status = document.querySelector('#scanStatus');
  status.textContent = 'Opening camera...';

  try {
    const barcode = await startScanner();

    if (!barcode) {
      status.textContent = 'No barcode detected. Try again.';
      return;
    }

    const product = state.products.find(
      p => p.barcode === barcode
    );

    if (!product) {
      document.querySelector('#productBarcode').value = barcode;
      status.textContent = 'New barcode detected. Enter product details to register it.';
      document.querySelector('#productName').focus();
      return;
    }

    await addToCart(product);
    status.textContent = 'Scanned: ' + product.name;

  } catch (error) {
    console.error(error);
    status.textContent = error.message || 'Scanner could not start.';
    alert(status.textContent);
  } finally {
    state.busy = false;
  }
}

function render() {
  const today = new Date().toDateString();

  const totalSales = state.sales
    .filter(s => s.currency === state.currency &&
      new Date(s.createdAt).toDateString() === today)
    .reduce((sum, s) => sum + s.total, 0);

  const cartTotal = state.cart.reduce(
    (sum, item) => sum + item.price * item.qty, 0
  );

  app.innerHTML = `
    <header>
      <h2>POS Scan Mobile</h2>
      <p>Sales & Inventory Management</p>
    </header>

    <main>
      <section class="stats">
        <div class="card">
          <span>Today's Sales</span>
          <h2>${money(totalSales)}</h2>
        </div>
        <div class="card">
          <span>Total Products</span>
          <h2>${state.products.length}</h2>
        </div>
      </section>

      <section class="card">
        <h3>Currency</h3>
        <select id="currency">
          <option value="USD" ${state.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
          <option value="SSP" ${state.currency === 'SSP' ? 'selected' : ''}>SSP</option>
        </select>
        <p class="small">Changing currency changes the display only. It does not convert stored prices.</p>
      </section>

      <section class="card">
        <h3>Add New Product</h3>
        <input id="productName" placeholder="Product name">
        <input id="productBarcode" placeholder="Barcode number">
        <input id="productPrice" type="number" min="0" step="0.01" placeholder="Price">
        <input id="productStock" type="number" min="0" step="1" placeholder="Stock quantity">
        <button id="addProduct">Save Product</button>
      </section>

      <section class="card">
        <h3>Barcode Scanner</h3>
        <button id="scanButton">Open Camera Scanner</button>
        <p id="scanStatus" class="small">Ready to scan products.</p>
      </section>

      <section class="card">
        <h3>Products & Inventory</h3>
        <div id="productList"></div>
      </section>

      <section class="card">
        <h3>Shopping Cart</h3>
        <div id="cartList"></div>
        <h3>Total: <span id="cartTotal">${money(cartTotal)}</span></h3>
        <button id="checkout">Complete Sale</button>
      </section>

      <section class="card">
        <h3>Sales History</h3>
        <div id="salesHistory"></div>
      </section>
    </main>
  `;

  document.querySelector('#productList').innerHTML =
    state.products.map(p => `
      <div class="product">
        <strong>${escapeHTML(p.name)}</strong>
        <p>Barcode: ${escapeHTML(p.barcode || 'Not registered')}</p>
        <p>${money(p.price)} | Stock: ${p.stock}</p>
        <button data-add="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>Add to Cart</button>
      </div>
    `).join('') || '<p>No products added yet.</p>';

  document.querySelector('#cartList').innerHTML =
    state.cart.map((item, index) => `
      <div class="product">
        <strong>${escapeHTML(item.name)}</strong>
        <p>${item.qty} × ${money(item.price)}</p>
        <button data-remove="${index}">Remove</button>
      </div>
    `).join('') || '<p>Your cart is empty.</p>';

  document.querySelector('#salesHistory').innerHTML =
    state.sales.map(s => `
      <div class="product">
        <strong>${escapeHTML(s.date)}</strong>
        <p>${s.currency === 'USD' ? '$' : 'SSP '}${s.total.toFixed(2)}</p>
      </div>
    `).join('') || '<p>No sales recorded yet.</p>';

  document.querySelector('#currency').onchange = event => {
    state.currency = event.target.value;
    localStorage.setItem('pos_currency', state.currency);
    render();
  };

  document.querySelector('#addProduct').onclick = async () => {
    try {
      await addProduct();
    } catch (error) {
      alert('Could not save product: ' + error.message);
    }
  };

  document.querySelectorAll('[data-add]').forEach(button => {
    button.onclick = async () => {
      try {
        const product = state.products.find(
          p => p.id === Number(button.dataset.add)
        );
        if (product) await addToCart(product);
      } catch (error) {
        alert('Could not update stock: ' + error.message);
      }
    };
  });

  document.querySelectorAll('[data-remove]').forEach(button => {
    button.onclick = async () => {
      try {
        await removeFromCart(Number(button.dataset.remove));
      } catch (error) {
        alert('Could not remove product: ' + error.message);
      }
    };
  });

  document.querySelector('#checkout').onclick = async () => {
    try {
      await checkout();
    } catch (error) {
      alert('Sale could not be saved: ' + error.message);
    }
  };

  document.querySelector('#scanButton').onclick = scanProduct;
}

async function startApp() {
  app.innerHTML = '<main><div class="card">Loading POS database...</div></main>';

  try {
    await loadData();
    render();
  } catch (error) {
    console.error(error);
    app.innerHTML = '<main><div class="card">Unable to open local database. Please restart the application.</div></main>';
  }
}

startApp();
