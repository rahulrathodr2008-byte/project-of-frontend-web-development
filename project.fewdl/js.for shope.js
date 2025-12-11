// ======== Simple product data (could be loaded from API) ========
const PRODUCTS = Object.freeze([
  { id: "p1", name: "Wireless Headphones", category: "electronics", price: 3999 },
  { id: "p2", name: "Mechanical Keyboard", category: "electronics", price: 5499 },
  { id: "p3", name: "Smartwatch Classic", category: "electronics", price: 6999 },
  { id: "p4", name: "Premium Hoodie", category: "fashion", price: 1999 },
  { id: "p5", name: "Running Shoes", category: "fashion", price: 2999 },
  { id: "p6", name: "Cotton T‑Shirt", category: "fashion", price: 899 },
  { id: "p7", name: "Table Lamp", category: "home", price: 1299 },
  { id: "p8", name: "Non‑stick Pan Set", category: "home", price: 2499 },
  { id: "p9", name: "Wall Art Frame", category: "home", price: 799 }
]);

// ======== Local storage helpers with basic hardening ========
const STORAGE_KEYS = Object.freeze({
  USER: "secureShop.currentUser",
  USERS: "secureShop.users",
  CART: "secureShop.cart",
  ORDERS: "secureShop.orders"
});

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function loadState(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw ? safeParse(raw, fallback) : fallback;
}

function saveState(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ======== Simple hashing (demo only, not cryptographically secure) ========
function hashString(str) {
  // Basic DJB2 hash for demo; use bcrypt/argon2 on server in production.[web:3][web:9]
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

// ======== Authentication (localStorage demo) ========
let currentUser = loadState(STORAGE_KEYS.USER, null);
let users = loadState(STORAGE_KEYS.USERS, {}); // { email: { passwordHash } }

function setCurrentUser(email) {
  currentUser = email;
  saveState(STORAGE_KEYS.USER, email);
  updateUserUI();
  loadOrdersUI();
}

function registerUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (users[normalizedEmail]) {
    throw new Error("User already exists");
  }
  const passwordHash = hashString(password);
  users[normalizedEmail] = { passwordHash };
  saveState(STORAGE_KEYS.USERS, users);
}

function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = users[normalizedEmail];
  if (!user) {
    throw new Error("Invalid credentials");
  }
  const passwordHash = hashString(password);
  if (user.passwordHash !== passwordHash) {
    throw new Error("Invalid credentials");
  }
  setCurrentUser(normalizedEmail);
}

function logoutUser() {
  currentUser = null;
  saveState(STORAGE_KEYS.USER, null);
  updateUserUI();
}

// ======== CSRF-like token (demo) ========
function generateCsrfToken() {
  const array = new Uint32Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, n => n.toString(16)).join("");
}

let csrfToken = generateCsrfToken();

// ======== Cart management ========
let cart = loadState(STORAGE_KEYS.CART, {}); // { productId: quantity }

function addToCart(productId) {
  cart[productId] = (cart[productId] || 0) + 1;
  saveState(STORAGE_KEYS.CART, cart);
  updateCartCount();
}

function updateCartItem(productId, delta) {
  if (!cart[productId]) return;
  const newQty = cart[productId] + delta;
  if (newQty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = newQty;
  }
  saveState(STORAGE_KEYS.CART, cart);
  renderCart();
  renderCheckoutSummary();
  updateCartCount();
}

function clearCart() {
  cart = {};
  saveState(STORAGE_KEYS.CART, cart);
  updateCartCount();
}

function cartItemsWithDetails() {
  return Object.entries(cart).map(([id, qty]) => {
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return null;
    return { ...product, qty, lineTotal: product.price * qty };
  }).filter(Boolean);
}

function cartTotals() {
  const items = cartItemsWithDetails();
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { items, subtotal };
}

// ======== Orders (per user) ========
function loadOrders() {
  const allOrders = loadState(STORAGE_KEYS.ORDERS, {});
  if (!currentUser) return [];
  return allOrders[currentUser] || [];
}

function saveOrder(order) {
  const allOrders = loadState(STORAGE_KEYS.ORDERS, {});
  if (!currentUser) return;
  const userOrders = allOrders[currentUser] || [];
  userOrders.unshift(order);
  allOrders[currentUser] = userOrders;
  saveState(STORAGE_KEYS.ORDERS, allOrders);
}

// ======== DOM elements ========
const productGridEl = document.getElementById("product-grid");
const cartSectionEl = document.getElementById("cart-section");
const cartItemsEl = document.getElementById("cart-items");
const cartCountEl = document.getElementById("cart-count");
const cartTotalEl = document.getElementById("cart-total");
const btnCart = document.getElementById("btn-cart");
const cartCloseBtn = document.getElementById("cart-close");
const btnCheckout = document.getElementById("btn-checkout");
const checkoutSectionEl = document.getElementById("checkout-section");
const checkoutCloseBtn = document.getElementById("checkout-close");
const checkoutItemsEl = document.getElementById("checkout-items");
const summarySubtotalEl = document.getElementById("summary-subtotal");
const summaryTotalEl = document.getElementById("summary-total");
const checkoutForm = document.getElementById("checkout-form");
const csrfInput = document.getElementById("csrf-token-input");

const categoryListEl = document.getElementById("category-list");
const filterMinPriceEl = document.getElementById("filter-min-price");
const filterMaxPriceEl = document.getElementById("filter-max-price");
const filterSearchEl = document.getElementById("filter-search");
const filterApplyBtn = document.getElementById("filter-apply");
const filterResetBtn = document.getElementById("filter-reset");

const authSectionEl = document.getElementById("auth-section");
const authCloseBtn = document.getElementById("auth-close");
const authTitleEl = document.getElementById("auth-title");
const tabLoginBtn = document.getElementById("tab-login");
const tabRegisterBtn = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const currentUserLabel = document.getElementById("current-user-label");

const navProductsBtn = document.getElementById("nav-products");
const navOrdersBtn = document.getElementById("nav-orders");
const productsSectionEl = document.getElementById("products-section");
const ordersSectionEl = document.getElementById("orders-section");
const ordersListEl = document.getElementById("orders-list");

// ======== Rendering ========
let activeCategory = "all";

function renderProducts() {
  const minPrice = Number(filterMinPriceEl.value) || 0;
  const maxPrice = Number(filterMaxPriceEl.value) || Number.MAX_SAFE_INTEGER;
  const query = filterSearchEl.value.trim().toLowerCase();

  productGridEl.innerHTML = "";

  PRODUCTS.filter(p => {
    if (activeCategory !== "all" && p.category !== activeCategory) return false;
    if (p.price < minPrice || p.price > maxPrice) return false;
    if (query && !p.name.toLowerCase().includes(query)) return false;
    return true;
  }).forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image" aria-hidden="true">
        <span>🛒</span>
      </div>
      <div class="product-category">${escapeHTML(product.category)}</div>
      <div class="product-title">${escapeHTML(product.name)}</div>
      <div class="product-meta">
        <span class="product-price">${product.price.toLocaleString("en-IN")} ₹</span>
        <span>In stock</span>
      </div>
      <div class="product-actions">
        <button class="btn primary full" data-add-to-cart="${product.id}">
          Add to cart
        </button>
      </div>
    `;
    productGridEl.appendChild(card);
  });
}

function renderCart() {
  const { items, subtotal } = cartTotals();
  cartItemsEl.innerHTML = "";

  if (!items.length) {
    cartItemsEl.innerHTML = `<p>Your cart is empty.</p>`;
    cartTotalEl.textContent = "0";
    return;
  }

  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div class="cart-item-title">${escapeHTML(item.name)}</div>
      <div>${item.price.toLocaleString("en-IN")} ₹</div>
      <div class="cart-item-qty">
        <button class="qty-btn" data-qty-dec="${item.id}">−</button>
        <span>${item.qty}</span>
        <button class="qty-btn" data-qty-inc="${item.id}">+</button>
      </div>
      <div>${item.lineTotal.toLocaleString("en-IN")} ₹</div>
    `;
    cartItemsEl.appendChild(row);
  });

  cartTotalEl.textContent = subtotal.toLocaleString("en-IN");
}

function renderCheckoutSummary() {
  const { items, subtotal } = cartTotals();
  checkoutItemsEl.innerHTML = "";
  if (!items.length) {
    checkoutItemsEl.innerHTML = `<p>No items in cart.</p>`;
    summarySubtotalEl.textContent = "0 ₹";
    summaryTotalEl.textContent = "0 ₹";
    return;
  }

  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "checkout-item";
    row.innerHTML = `
      <span>${escapeHTML(item.name)} × ${item.qty}</span>
      <span>${item.lineTotal.toLocaleString("en-IN")} ₹</span>
    `;
    checkoutItemsEl.appendChild(row);
  });

  summarySubtotalEl.textContent = `${subtotal.toLocaleString("en-IN")} ₹`;
  summaryTotalEl.textContent = `${subtotal.toLocaleString("en-IN")} ₹`;
}

function updateCartCount() {
  const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  cartCountEl.textContent = count;
}

function updateUserUI() {
  if (currentUser) {
    currentUserLabel.textContent = currentUser;
    btnLogin.classList.add("hidden");
    btnLogout.classList.remove("hidden");
  } else {
    currentUserLabel.textContent = "Guest";
    btnLogin.classList.remove("hidden");
    btnLogout.classList.add("hidden");
  }
}

function loadOrdersUI() {
  ordersListEl.innerHTML = "";
  if (!currentUser) {
    ordersListEl.innerHTML = `<p>Please login to see your orders.</p>`;
    return;
  }
  const orders = loadOrders();
  if (!orders.length) {
    ordersListEl.innerHTML = `<p>No orders yet.</p>`;
    return;
  }
  orders.forEach(order => {
    const card = document.createElement("article");
    card.className = "order-card";
    card.innerHTML = `
      <div class="order-header">
        <span>Order #${order.id}</span>
        <span>${new Date(order.createdAt).toLocaleString()}</span>
      </div>
      <div>Total: ${order.total.toLocaleString("en-IN")} ₹</div>
      <div>Items:</div>
      <ul class="order-items">
        ${order.items.map(item => `
          <li>${escapeHTML(item.name)} × ${item.qty}</li>
        `).join("")}
      </ul>
    `;
    ordersListEl.appendChild(card);
  });
}

// ======== Navigation & modal helpers ========
function openModal(sectionEl) {
  sectionEl.classList.remove("hidden");
  sectionEl.setAttribute("aria-hidden", "false");
}

function closeModal(sectionEl) {
  sectionEl.classList.add("hidden");
  sectionEl.setAttribute("aria-hidden", "true");
}

function showProductsView() {
  productsSectionEl.classList.remove("hidden");
  ordersSectionEl.classList.add("hidden");
  navProductsBtn.classList.add("active");
  navOrdersBtn.classList.remove("active");
}

function showOrdersView() {
  productsSectionEl.classList.add("hidden");
  ordersSectionEl.classList.remove("hidden");
  navProductsBtn.classList.remove("active");
  navOrdersBtn.classList.add("active");
  loadOrdersUI();
}

// ======== Filtering ========
categoryListEl.addEventListener("click", e => {
  if (e.target.tagName.toLowerCase() !== "li") return;
  activeCategory = e.target.dataset.category;
  [...categoryListEl.children].forEach(li => li.classList.remove("active"));
  e.target.classList.add("active");
  renderProducts();
});

filterApplyBtn.addEventListener("click", () => {
  renderProducts();
});

filterResetBtn.addEventListener("click", () => {
  filterMinPriceEl.value = "";
  filterMaxPriceEl.value = "";
  filterSearchEl.value = "";
  activeCategory = "all";
  [...categoryListEl.children].forEach(li => {
    li.classList.toggle("active", li.dataset.category === "all");
  });
  renderProducts();
});

// ======== Product actions ========
productGridEl.addEventListener("click", e => {
  const btn = e.target.closest("button[data-add-to-cart]");
  if (!btn) return;
  const id = btn.getAttribute("data-add-to-cart");
  addToCart(id);
});

// ======== Cart events ========
btnCart.addEventListener("click", () => {
  renderCart();
  openModal(cartSectionEl);
});

cartCloseBtn.addEventListener("click", () => {
  closeModal(cartSectionEl);
});

cartItemsEl.addEventListener("click", e => {
  const incBtn = e.target.closest("button[data-qty-inc]");
  const decBtn = e.target.closest("button[data-qty-dec]");
  if (incBtn) {
    const id = incBtn.getAttribute("data-qty-inc");
    updateCartItem(id, 1);
  } else if (decBtn) {
    const id = decBtn.getAttribute("data-qty-dec");
    updateCartItem(id, -1);
  }
});

btnCheckout.addEventListener("click", () => {
  const { items } = cartTotals();
  if (!items.length) {
    alert("Cart is empty.");
    return;
  }
  renderCheckoutSummary();
  csrfToken = generateCsrfToken();
  csrfInput.value = csrfToken;
  openModal(checkoutSectionEl);
});

// ======== Checkout submission with basic validation ========
checkoutCloseBtn.addEventListener("click", () => {
  closeModal(checkoutSectionEl);
});

checkoutForm.addEventListener("submit", e => {
  e.preventDefault();

  if (!currentUser) {
    alert("Please login before placing an order.");
    return;
  }

  const formToken = csrfInput.value;
  if (!formToken || formToken !== csrfToken) {
    alert("Session expired. Please try again.");
    csrfToken = generateCsrfToken();
    csrfInput.value = csrfToken;
    return;
  }

  if (!checkoutForm.checkValidity()) {
    alert("Please fill all required fields correctly.");
    return;
  }

  const { items, subtotal } = cartTotals();
  if (!items.length) {
    alert("Cart is empty.");
    return;
  }

  const order = {
    id: Math.floor(Math.random() * 1_000_000),
    createdAt: Date.now(),
    total: subtotal,
    items: items.map(({ id, name, qty, price }) => ({ id, name, qty, price })),
    shipping: {
      name: sanitizeInput(document.getElementById("ship-name").value),
      address: sanitizeInput(document.getElementById("ship-address").value),
      city: sanitizeInput(document.getElementById("ship-city").value),
      zip: sanitizeInput(document.getElementById("ship-zip").value),
      phone: sanitizeInput(document.getElementById("ship-phone").value)
    }
  };

  saveOrder(order);
  clearCart();
  renderCart();
  renderCheckoutSummary();
  loadOrdersUI();
  csrfToken = generateCsrfToken();
  csrfInput.value = csrfToken;

  alert("Payment successful (dummy). Order placed!");
  closeModal(checkoutSectionEl);
  closeModal(cartSectionEl);
});

// ======== Auth modal ========
btnLogin.addEventListener("click", () => {
  openModal(authSectionEl);
});

btnLogout.addEventListener("click", () => {
  if (confirm("Logout from this device?")) {
    logoutUser();
  }
});

authCloseBtn.addEventListener("click", () => {
  closeModal(authSectionEl);
});

tabLoginBtn.addEventListener("click", () => {
  tabLoginBtn.classList.add("active");
  tabRegisterBtn.classList.remove("active");
  authTitleEl.textContent = "Login";
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
});

tabRegisterBtn.addEventListener("click", () => {
  tabRegisterBtn.classList.add("active");
  tabLoginBtn.classList.remove("active");
  authTitleEl.textContent = "Register";
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
});

loginForm.addEventListener("submit", e => {
  e.preventDefault();
  const email = loginEmail.value;
  const password = loginPassword.value;
  try {
    loginUser(email, password);
    loginForm.reset();
    closeModal(authSectionEl);
  } catch (err) {
    alert(err.message);
  }
});

registerForm.addEventListener("submit", e => {
  e.preventDefault();
  const email = registerEmail.value;
  const password = registerPassword.value;
  try {
    registerUser(email, password);
    setCurrentUser(email.trim().toLowerCase());
    registerForm.reset();
    closeModal(authSectionEl);
  } catch (err) {
    alert(err.message);
  }
});

// ======== Navigation events ========
navProductsBtn.addEventListener("click", showProductsView);
navOrdersBtn.addEventListener("click", showOrdersView);

// ======== Simple escaping & sanitization on client ========
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeInput(str) {
  // Trim and remove control chars
  return String(str).trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
}

// ======== Init ========
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  updateCartCount();
  updateUserUI();
  csrfInput.value = csrfToken;
  showProductsView();
});
