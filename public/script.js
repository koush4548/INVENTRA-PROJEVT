const API_BASE = '/api';
let qrScanner = null;
let salesCart = [];
let appCurrency = '₹';

function getToken() {
  return localStorage.getItem('token');
}

function getUsername() {
  return localStorage.getItem('username');
}

function money(value) {
  return `${appCurrency}${value}`;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

function showAuthMessage(message, type) {
  const box = document.getElementById('authMessage');
  if (!box) return;
  box.textContent = message;
  box.className = `auth-message ${type}`;
  box.classList.remove('hidden');
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

function initLoginPage() {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  if (!loginBtn || !registerBtn) return;

  loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showAuthMessage('Enter username and password', 'error');
      return;
    }

    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      localStorage.setItem('token', res.token);
      localStorage.setItem('username', res.username);
      window.location.href = '/dashboard';
    } catch (error) {
      showAuthMessage(error.message, 'error');
    }
  });

  registerBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showAuthMessage('Enter username and password', 'error');
      return;
    }

    try {
      const res = await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      showAuthMessage(res.message || 'Registered successfully. Now login.', 'success');
    } catch (error) {
      showAuthMessage(error.message, 'error');
    }
  });
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');

  document.querySelectorAll('.nav-link').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });

  if (pageId === 'salesHistoryPage') loadSalesHistory();
  if (pageId === 'analyticsPage') loadAnalytics();
  if (pageId === 'settingsPage') loadSettings();
}

function applySettings(setting) {
  appCurrency = setting.currency || '₹';

  const title = document.querySelector('.topbar h1');
  if (title && setting.companyName) {
    title.textContent = setting.companyName;
  } else if (title) {
    title.textContent = 'Inventory Management System';
  }

  document.documentElement.style.setProperty('--accent', setting.accentColor || '#6d7cff');

  document.body.classList.remove('light-theme');
  if (setting.theme === 'light') {
    document.body.classList.add('light-theme');
  }

  const lowStockText = document.getElementById('lowStockText');
  if (lowStockText) {
    lowStockText.textContent = `Limit: ${setting.lowStockLimit ?? 5}`;
  }
}

async function updateSettingField(field, value) {
  try {
    const res = await api('/settings', {
      method: 'PATCH',
      body: JSON.stringify({ [field]: value })
    });

    applySettings(res.setting);

    await Promise.all([
      loadDashboard(),
      loadProducts(),
      loadSalesHistory(),
      loadAnalytics()
    ]);
  } catch (error) {
    showToast(error.message);
  }
}

function bindAutoSettings() {
  const fields = [
    ['settingCompanyName', 'companyName'],
    ['settingStoreLocation', 'storeLocation'],
    ['settingNotificationEmail', 'notificationEmail'],
    ['settingInvoicePrefix', 'invoicePrefix'],
    ['settingTheme', 'theme'],
    ['settingAccentColor', 'accentColor'],
    ['settingCurrency', 'currency'],
    ['settingLowStockLimit', 'lowStockLimit']
  ];

  fields.forEach(([id, field]) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('change', async () => {
      let value = el.value;
      if (field === 'lowStockLimit') value = Number(value || 5);
      await updateSettingField(field, value);
      showToast('Updated');
    });
  });

  const alertsCheckbox = document.getElementById('settingLowStockAlerts');
  if (alertsCheckbox) {
    alertsCheckbox.addEventListener('change', async () => {
      await updateSettingField('lowStockAlerts', alertsCheckbox.checked);
      showToast('Updated');
    });
  }
}

async function loadDashboard() {
  try {
    const stats = await api('/products/dashboard/stats');
    document.getElementById('statProducts').textContent = stats.totalProducts;
    document.getElementById('statQuantity').textContent = stats.totalQuantity;
    document.getElementById('statLowStock').textContent = stats.lowStock;
    document.getElementById('statValue').textContent = money(stats.inventoryValue);

    const lowStockText = document.getElementById('lowStockText');
    if (lowStockText) {
      lowStockText.textContent = `Limit: ${stats.lowStockLimit}`;
    }
  } catch (error) {
    showToast(error.message);
  }
}

function resetProductForm() {
  document.getElementById('productId').value = '';
  document.getElementById('productName').value = '';
  document.getElementById('productBarcode').value = '';
  document.getElementById('productCategory').value = '';
  document.getElementById('productQty').value = '';
  document.getElementById('productCost').value = '';
  document.getElementById('productSell').value = '';
  document.getElementById('productWarehouse').value = '';
}

async function loadProducts() {
  try {
    const res = await api('/products');
    const tbody = document.getElementById('productsTableBody');
    const select = document.getElementById('salesProductSelect');

    if (tbody) tbody.innerHTML = '';
    if (select) select.innerHTML = '<option value="">Select product</option>';

    res.products.forEach((product) => {
      if (tbody) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${product.name}</td>
          <td>${product.barcode || '-'}</td>
          <td>${product.category}</td>
          <td>${product.quantity}</td>
          <td>${money(product.costPrice)}</td>
          <td>${money(product.sellPrice)}</td>
          <td>${product.warehouse}</td>
          <td>${new Date(product.createdAt).toLocaleString()}</td>
          <td>
            <div class="table-actions">
              <button class="action-btn edit-btn" data-id="${product._id}">Edit</button>
              <button class="action-btn delete-btn" data-id="${product._id}">Delete</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      }

      if (select) {
        const option = document.createElement('option');
        option.value = product._id;
        option.textContent = `${product.name} | Stock: ${product.quantity} | ${money(product.sellPrice)}`;
        option.dataset.name = product.name;
        option.dataset.price = product.sellPrice;
        select.appendChild(option);
      }
    });

    bindProductActions(res.products);
  } catch (error) {
    showToast(error.message);
  }
}

function bindProductActions(products) {
  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = products.find((x) => x._id === btn.dataset.id);
      if (!p) return;

      document.getElementById('productId').value = p._id;
      document.getElementById('productName').value = p.name;
      document.getElementById('productBarcode').value = p.barcode;
      document.getElementById('productCategory').value = p.category;
      document.getElementById('productQty').value = p.quantity;
      document.getElementById('productCost').value = p.costPrice;
      document.getElementById('productSell').value = p.sellPrice;
      document.getElementById('productWarehouse').value = p.warehouse;

      showPage('productsPage');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('Product loaded for edit');
    });
  });

  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this product?')) return;

      try {
        await api(`/products/${btn.dataset.id}`, { method: 'DELETE' });
        showToast('Product deleted');
        await Promise.all([loadProducts(), loadDashboard(), loadAudits()]);
      } catch (error) {
        showToast(error.message);
      }
    });
  });
}

async function saveProduct() {
  const id = document.getElementById('productId').value;

  const data = {
    name: document.getElementById('productName').value.trim(),
    barcode: document.getElementById('productBarcode').value.trim(),
    category: document.getElementById('productCategory').value.trim() || 'General',
    quantity: Number(document.getElementById('productQty').value || 0),
    costPrice: Number(document.getElementById('productCost').value || 0),
    sellPrice: Number(document.getElementById('productSell').value || 0),
    warehouse: document.getElementById('productWarehouse').value.trim() || 'Main'
  };

  if (!data.name) {
    showToast('Product name required');
    return;
  }

  try {
    if (id) {
      await api(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showToast('Product updated');
    } else {
      await api('/products', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast('Product added');
    }

    resetProductForm();
    await Promise.all([loadProducts(), loadDashboard(), loadAudits()]);
  } catch (error) {
    showToast(error.message);
  }
}

async function loadAudits() {
  try {
    const res = await api('/audits');

    const userTbody = document.getElementById('userAuditTableBody');
    const productTbody = document.getElementById('productAuditTableBody');
    const userCount = document.getElementById('userAuditCount');
    const productCount = document.getElementById('productAuditCount');

    if (!userTbody || !productTbody) return;

    userTbody.innerHTML = '';
    productTbody.innerHTML = '';

    const userAudits = res.audits.filter((a) => a.type === 'USER');
    const productAudits = res.audits.filter((a) => a.type === 'PRODUCT');

    userCount.textContent = userAudits.length;
    productCount.textContent = productAudits.length;

    userAudits.forEach((a) => {
      const d = new Date(a.createdAt);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.username || '-'}</td>
        <td>${a.details || '-'}</td>
        <td>${d.toLocaleDateString()}</td>
        <td>${d.toLocaleTimeString()}</td>
      `;
      userTbody.appendChild(tr);
    });

    productAudits.forEach((a) => {
      const d = new Date(a.createdAt);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.productName || '-'}</td>
        <td>${a.details || '-'}</td>
        <td>${d.toLocaleDateString()}</td>
        <td>${d.toLocaleTimeString()}</td>
      `;
      productTbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message);
  }
}

function renderCart() {
  const tbody = document.getElementById('salesCartTableBody');
  const totalEl = document.getElementById('salesGrandTotal');
  if (!tbody || !totalEl) return;

  tbody.innerHTML = '';
  let grandTotal = 0;

  salesCart.forEach((item, index) => {
    grandTotal += item.total;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.productName}</td>
      <td>${item.quantity}</td>
      <td>${money(item.price)}</td>
      <td>${money(item.total)}</td>
      <td><button class="action-btn delete-btn" data-index="${index}">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });

  totalEl.textContent = money(grandTotal);

  tbody.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      salesCart.splice(Number(btn.dataset.index), 1);
      renderCart();
    });
  });
}

function addToCart() {
  const select = document.getElementById('salesProductSelect');
  const qtyInput = document.getElementById('salesQuantity');
  const productId = select.value;
  const quantity = Number(qtyInput.value || 0);

  if (!productId) {
    showToast('Select a product');
    return;
  }

  if (quantity <= 0) {
    showToast('Enter valid quantity');
    return;
  }

  const selected = select.options[select.selectedIndex];
  const productName = selected.dataset.name;
  const price = Number(selected.dataset.price || 0);

  const existing = salesCart.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
    existing.total = existing.quantity * existing.price;
  } else {
    salesCart.push({
      productId,
      productName,
      quantity,
      price,
      total: quantity * price
    });
  }

  qtyInput.value = '';
  renderCart();
}

async function confirmSale() {
  if (!salesCart.length) {
    showToast('Cart is empty');
    return;
  }

  const customerName = document.getElementById('salesCustomerName').value.trim() || 'Walk-in Customer';

  try {
    await api('/sales', {
      method: 'POST',
      body: JSON.stringify({
        customerName,
        items: salesCart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      })
    });

    salesCart = [];
    renderCart();
    document.getElementById('salesCustomerName').value = '';
    showToast('Sale completed');

    await Promise.all([
      loadProducts(),
      loadDashboard(),
      loadAudits(),
      loadSalesHistory(),
      loadAnalytics()
    ]);
  } catch (error) {
    showToast(error.message);
  }
}

async function loadSalesHistory() {
  try {
    const res = await api('/sales');
    const tbody = document.getElementById('salesHistoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    res.sales.forEach((sale) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${sale.invoiceNo}</td>
        <td>${sale.customerName}</td>
        <td>${sale.totalItems}</td>
        <td>${money(sale.grandTotal)}</td>
        <td>${new Date(sale.createdAt).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast(error.message);
  }
}

async function loadAnalytics() {
  try {
    const res = await api('/sales/analytics/summary');
    const revenue = document.getElementById('analyticsRevenue');
    const orders = document.getElementById('analyticsOrders');
    const items = document.getElementById('analyticsItemsSold');
    const topProduct = document.getElementById('analyticsTopProduct');
    const tbody = document.getElementById('analyticsRecentSalesBody');

    if (revenue) revenue.textContent = money(res.totalRevenue);
    if (orders) orders.textContent = res.totalOrders;
    if (items) items.textContent = res.totalItemsSold;
    if (topProduct) topProduct.textContent = res.topProduct || '-';

    if (tbody) {
      tbody.innerHTML = '';
      res.latestSales.forEach((sale) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${sale.invoiceNo}</td>
          <td>${money(sale.amount)}</td>
          <td>${new Date(sale.date).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (error) {
    showToast(error.message);
  }
}

async function loadSettings() {
  try {
    const res = await api('/settings');
    const s = res.setting;

    document.getElementById('settingCompanyName').value = s.companyName || '';
    document.getElementById('settingStoreLocation').value = s.storeLocation || '';
    document.getElementById('settingNotificationEmail').value = s.notificationEmail || '';
    document.getElementById('settingInvoicePrefix').value = s.invoicePrefix || 'INV';
    document.getElementById('settingTheme').value = s.theme || 'dark';
    document.getElementById('settingAccentColor').value = s.accentColor || '#6d7cff';
    document.getElementById('settingCurrency').value = s.currency || '₹';
    document.getElementById('settingLowStockLimit').value = s.lowStockLimit ?? 5;
    document.getElementById('settingLowStockAlerts').checked = !!s.lowStockAlerts;

    applySettings(s);
  } catch (error) {
    showToast(error.message);
  }
}

async function changePassword() {
  showToast('Password change feature can be connected next');
}

async function startScanner() {
  const readerElement = document.getElementById('reader');

  if (!readerElement) {
    showToast('Scanner area not found');
    return;
  }

  if (!window.Html5Qrcode) {
    showToast('QR library not loaded');
    return;
  }

  if (qrScanner) {
    showToast('Scanner already running');
    return;
  }

  try {
    qrScanner = new Html5Qrcode('reader');
    const cameras = await Html5Qrcode.getCameras();

    if (!cameras || cameras.length === 0) {
      showToast('No camera found');
      qrScanner = null;
      return;
    }

    await qrScanner.start(
      cameras[0].id,
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        await stopScanner(false);
        await addProductFromQR(decodedText);
      },
      () => {}
    );

    showToast('Scanner started');
  } catch (error) {
    qrScanner = null;
    showToast('Camera permission denied or scanner failed');
  }
}

async function stopScanner(showMessage = true) {
  if (!qrScanner) return;

  try {
    await qrScanner.stop();
    await qrScanner.clear();
  } catch (error) {}

  qrScanner = null;

  if (showMessage) {
    showToast('Scanner stopped');
  }
}

async function addProductFromQR(text) {
  try {
    const data = JSON.parse(text);

    await api('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name || 'Scanned Product',
        barcode: data.barcode || '',
        category: data.category || 'General',
        quantity: Number(data.quantity || 1),
        costPrice: Number(data.costPrice || 0),
        sellPrice: Number(data.sellPrice || 0),
        warehouse: data.warehouse || 'Main'
      })
    });

    showToast('QR product added');
    await Promise.all([loadProducts(), loadDashboard(), loadAudits()]);
    showPage('productsPage');
  } catch {
    showToast('Invalid QR');
  }
}

async function initDashboardPage() {
  const token = getToken();
  if (!token) {
    window.location.href = '/';
    return;
  }

  document.getElementById('userDisplay').textContent = getUsername();

  document.querySelectorAll('.nav-link').forEach((btn) => {
    btn.onclick = () => showPage(btn.dataset.page);
  });

  document.getElementById('logoutBtn').onclick = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  document.getElementById('saveProductBtn').onclick = saveProduct;
  document.getElementById('clearProductBtn').onclick = resetProductForm;
  document.getElementById('openAddProductBtn').onclick = () => showPage('productsPage');

  document.getElementById('addToCartBtn').onclick = addToCart;
  document.getElementById('clearCartBtn').onclick = () => {
    salesCart = [];
    renderCart();
  };
  document.getElementById('confirmSaleBtn').onclick = confirmSale;

  document.getElementById('changePasswordBtn').onclick = changePassword;

  document.getElementById('startScannerBtn').onclick = startScanner;
  document.getElementById('stopScannerBtn').onclick = () => stopScanner(true);

  await loadSettings();
  bindAutoSettings();

  await Promise.all([
    loadDashboard(),
    loadProducts(),
    loadAudits(),
    loadSalesHistory(),
    loadAnalytics()
  ]);

  renderCart();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('loginBtn')) initLoginPage();
  if (document.getElementById('dashboardPage')) initDashboardPage();
});