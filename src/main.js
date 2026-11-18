
import './style.css';

const state = {
  products: JSON.parse(localStorage.getItem('pos_products') || '[]'),
  cart: [],
  sales: JSON.parse(localStorage.getItem('pos_sales') || '[]'),
  currency: localStorage.getItem('pos_currency') || 'USD'
};

const app = document.querySelector('#app');

function save() {
  localStorage.setItem('pos_products', JSON.stringify(state.products));
  localStorage.setItem('pos_sales', JSON.stringify(state.sales));
  localStorage.setItem('pos_currency', state.currency);
}

function money(value) {
  return state.currency === 'USD'
    ? '$' + Number(value).toFixed(2)
    : 'SSP ' + Number(value).toFixed(2);
}

function render() {
  const totalSales = state.sales
    .filter(s => s.currency === state.currency)
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
      </section>

      <section class="card">
        <h3>Add New Product</h3>
        <input id="productName" placeholder="Product name">
        <input id="productBarcode" placeholder="Barcode">
        <input id="productPrice" type="number" min="0" step="0.01" placeholder="Price">
        <input id="productStock" type="number" min="0" step="1" placeholder="Stock quantity">
        <button id="addProduct">Save Product</button>
      </section>

      <section class="card">
        <h3>Barcode Scanner</h3>
        <button id="scanButton">Open Camera Scanner</button>
        <p id="scanStatus">Camera scanning setup coming next.</p>
      </section>

      <section class="card">
        <h3>Products</h3>
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
    state.products.map((p, i) => `
      <div class="product">
        <strong>${escapeHTML(p.name)}</strong>
        <p>${money(p.price)} | Stock: ${p.stock}</p>
        <button data-add="${i}" ${p.stock < 1 ? 'disabled' : ''}>Add to Cart</button>
      </div>
    `).join('') || '<p>No products yet.</p>';

  document.querySelector('#cartList').innerHTML =
    state.cart.map((p, i) => `
      <div class="product">
        ${escapeHTML(p.name)} × ${p.qty}
        <button data-remove="${i}">Remove</button>
      </div>
    `).join('') || '<p>Cart is empty.</p>';

  document.querySelector('#salesHistory').innerHTML =
    state.sales.map(s => `
      <p>${escapeHTML(s.date)} — ${s.currency} ${s.total.toFixed(2)}</p>
    `).join('') || '<p>No sales recorded.</p>';

  document.querySelector('#currency').onchange = e => {
    state.currency = e.target.value;
    save();
    render();
  };

  document.querySelector('#addProduct').onclick = () => {
    const name = document.querySelector('#productName').value.trim();
    const barcode = document.querySelector('#productBarcode').value.trim();
    const price = Number(document.querySelector('#productPrice').value);
    const stock = Number(document.querySelector('#productStock').value);

    if (!name || !Number.isFinite(price) || price <= 0 ||
        !Number.isInteger(stock) || stock < 0) {
      alert('Enter a valid name, price and stock quantity.');
      return;
    }

    if (barcode && state.products.some(p => p.barcode === barcode)) {
      alert('This barcode already exists.');
      return;
    }

    state.products.push({ name, barcode, price, stock });
    save();
    render();
  };

  document.querySelectorAll('[data-add]').forEach(button => {
    button.onclick = () => {
      const p = state.products[Number(button.dataset.add)];
      const existing = state.cart.find(item => item.barcode === p.barcode &&
        item.name === p.name);

      if (p.stock <= 0) return alert('Out of stock.');

      if (existing) existing.qty++;
      else state.cart.push({ ...p, qty: 1 });

      p.stock--;
      save();
      render();
    };
  });

  document.querySelectorAll('[data-remove]').forEach(button => {
    button.onclick = () => {
      const item = state.cart[Number(button.dataset.remove)];
      const product = state.products.find(p =>
        p.name === item.name && p.barcode === item.barcode
      );

      if (product) product.stock += item.qty;
      state.cart.splice(Number(button.dataset.remove), 1);
      save();
      render();
    };
  });

  document.querySelector('#checkout').onclick = () => {
    if (!state.cart.length) return alert('Cart is empty.');

    const total = state.cart.reduce(
      (sum, p) => sum + p.price * p.qty, 0
    );

    state.sales.unshift({
      total,
      currency: state.currency,
      date: new Date().toLocaleString()
    });

    state.cart = [];
    save();
    render();
    alert('Sale completed successfully!');
  };

  document.querySelector('#scanButton').onclick = () => {
    document.querySelector('#scanStatus').textContent =
      'Camera scanner will be connected in the scanner module.';
  };
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

render();
