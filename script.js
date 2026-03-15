const STORAGE_KEY = "zivora_store_data_v3";
const LEGACY_KEYS = ["zivora_store_data_v2", "zivora_store_data_v1"];

const CATEGORY_LABELS = {
  kids: "Kids Wear",
  women: "Women's Wear",
  men: "Men's Wear",
  jewellery: "Jewellery",
};

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80&auto=format&fit=crop";

const defaultData = {
  users: [
    { id: "admin", password: "admin123", role: "admin", wallet: 0 },
    { id: "reseller01", password: "reseller123", role: "reseller", wallet: 2500 },
  ],
  products: [
    { id: 1, name: "Kids Cartoon T-Shirt", category: "kids", price: 250, details: "Soft cotton", image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&q=80&auto=format&fit=crop" },
    { id: 2, name: "Women Night Suit", category: "women", price: 650, details: "Comfort set", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80&auto=format&fit=crop" },
    { id: 3, name: "Men Cotton T-Shirt", category: "men", price: 390, details: "Regular fit", image: "https://images.unsplash.com/photo-1484515991647-c5760fcecfc7?w=600&q=80&auto=format&fit=crop" },
    { id: 4, name: "Artificial Necklace", category: "jewellery", price: 470, details: "Festive design", image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=600&q=80&auto=format&fit=crop" },
  ],
  carts: {},
  purchases: {},
  tracking: {},
  bankBalance: 0,
  nextProductId: 5,
};

let store = loadData();
let currentUser = null;
let selectedCategory = "all";

const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");
const adminPanel = document.getElementById("adminPanel");
const resellerPanel = document.getElementById("resellerPanel");
const welcomeText = document.getElementById("welcomeText");
const loginMessage = document.getElementById("loginMessage");

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadData() {
  const rawCurrent = localStorage.getItem(STORAGE_KEY);
  const rawLegacy = LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean);
  const raw = rawCurrent || rawLegacy;

  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return clone(defaultData);
  }

  try {
    const migrated = migrateData(JSON.parse(raw));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return clone(defaultData);
  }
}

function migrateData(data) {
  const merged = {
    ...clone(defaultData),
    ...data,
    users: Array.isArray(data.users) ? data.users : clone(defaultData.users),
    products: Array.isArray(data.products) ? data.products : clone(defaultData.products),
    carts: data.carts && typeof data.carts === "object" ? data.carts : {},
    purchases: data.purchases && typeof data.purchases === "object" ? data.purchases : {},
    tracking: data.tracking && typeof data.tracking === "object" ? data.tracking : {},
    bankBalance: Number.isFinite(data.bankBalance) ? data.bankBalance : 0,
    nextProductId: Number.isFinite(data.nextProductId) ? data.nextProductId : defaultData.nextProductId,
  };

  merged.users = merged.users
    .map((u) => ({
      id: String(u.id || "").trim(),
      password: String(u.password || ""),
      role: u.role === "admin" ? "admin" : "reseller",
      wallet: Number(u.wallet) || 0,
    }))
    .filter((u) => u.id && u.password);

  if (!merged.users.some((u) => u.id === "admin")) {
    merged.users.unshift({ id: "admin", password: "admin123", role: "admin", wallet: 0 });
  }

  merged.products = merged.products.map((p, i) => ({
    id: Number(p.id) || i + 1,
    name: String(p.name || "Product"),
    category: CATEGORY_LABELS[p.category] ? p.category : "women",
    price: Number(p.price) || 1,
    details: String(p.details || "No details"),
    image: String(p.image || PLACEHOLDER_IMAGE),
  }));

  const maxId = merged.products.reduce((max, p) => Math.max(max, p.id), 0);
  merged.nextProductId = Math.max(merged.nextProductId, maxId + 1);

  return merged;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getUserById(userId) {
  return store.users.find((u) => u.id === userId);
}

function setupLoginHintFromUrl() {
  if (window.location.hash !== "#admin") return;
  document.getElementById("userId").value = "admin";
  loginMessage.textContent = "Admin URL opened. Enter password.";
}

function login(event) {
  event.preventDefault();
  const id = document.getElementById("userId").value.trim();
  const password = document.getElementById("password").value;
  const user = getUserById(id);

  if (!user || user.password !== password) {
    loginMessage.textContent = "Invalid credentials.";
    return;
  }

  currentUser = user;
  loginSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  welcomeText.textContent = `Logged in as ${user.id} (${user.role})`;
  renderRolePanel();
}

function logout() {
  currentUser = null;
  document.getElementById("loginForm").reset();
  appSection.classList.add("hidden");
  adminPanel.classList.add("hidden");
  resellerPanel.classList.add("hidden");
  document.getElementById("cartDrawer").classList.add("hidden");
  loginSection.classList.remove("hidden");
}

function renderRolePanel() {
  if (currentUser.role === "admin") {
    adminPanel.classList.remove("hidden");
    resellerPanel.classList.add("hidden");
    renderAdminData();
  } else {
    resellerPanel.classList.remove("hidden");
    adminPanel.classList.add("hidden");
    renderResellerData();
  }
}

function renderAdminData() {
  const resellerUsers = store.users.filter((u) => u.role === "reseller");
  const walletUser = document.getElementById("walletUser");
  walletUser.innerHTML = '<option value="">Select reseller</option>';

  resellerUsers.forEach((u) => {
    const op = document.createElement("option");
    op.value = u.id;
    op.textContent = `${u.id} (${u.wallet} coins)`;
    walletUser.appendChild(op);
  });

  document.getElementById("bankBalance").textContent = `₹${store.bankBalance.toLocaleString("en-IN")}`;

  document.getElementById("usersTableWrap").innerHTML = `
    <table class="table">
      <thead><tr><th>ID</th><th>Role</th><th>Wallet</th><th>Action</th></tr></thead>
      <tbody>
      ${store.users
        .map(
          (u) => `<tr>
            <td>${u.id}</td>
            <td>${u.role}</td>
            <td>${u.wallet}</td>
            <td>${u.role === "admin" ? "-" : `<button class="danger btn-sm" data-del-user="${u.id}">Delete</button>`}</td>
          </tr>`
        )
        .join("")}
      </tbody>
    </table>
  `;

  document.getElementById("productsTableWrap").innerHTML = `
    <table class="table">
      <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Action</th></tr></thead>
      <tbody>
      ${store.products
        .map(
          (p) => `<tr>
            <td>${p.name}</td>
            <td>${CATEGORY_LABELS[p.category]}</td>
            <td>${p.price}</td>
            <td><button class="danger btn-sm" data-del-product="${p.id}">Delete</button></td>
          </tr>`
        )
        .join("")}
      </tbody>
    </table>
  `;

  document.querySelectorAll("[data-del-user]").forEach((btn) => {
    btn.addEventListener("click", () => deleteUser(btn.dataset.delUser));
  });
  document.querySelectorAll("[data-del-product]").forEach((btn) => {
    btn.addEventListener("click", () => deleteProduct(Number(btn.dataset.delProduct)));
  });
}

function buildCategoryFilters() {
  const box = document.getElementById("categoryFilters");
  box.innerHTML = "";
  const all = [{ key: "all", label: "All" }, ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label }))];

  all.forEach((c) => {
    const btn = document.createElement("button");
    btn.textContent = c.label;
    btn.className = `chip ${selectedCategory === c.key ? "active" : ""}`;
    btn.addEventListener("click", () => {
      selectedCategory = c.key;
      renderCatalogCards();
      buildCategoryFilters();
    });
    box.appendChild(btn);
  });
}

function renderResellerData() {
  const user = getUserById(currentUser.id);
  currentUser = user;
  document.getElementById("walletBalance").textContent = `${user.wallet} 🪙`;
  buildCategoryFilters();
  renderCatalogCards();
  renderCartUI();
  renderTrackingRecords();
}

function renderCatalogCards() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const box = document.getElementById("catalogCards");

  const list = store.products.filter((p) => {
    const byCategory = selectedCategory === "all" || p.category === selectedCategory;
    const bySearch = !q || p.name.toLowerCase().includes(q) || p.details.toLowerCase().includes(q);
    return byCategory && bySearch;
  });

  if (!list.length) {
    box.innerHTML = '<p class="muted">No matching products found.</p>';
    return;
  }

  box.innerHTML = list
    .map(
      (p) => `
      <article class="product-card">
        <img src="${p.image}" alt="${p.name}" loading="lazy" />
        <div class="product-body">
          <h4>${p.name}</h4>
          <p class="muted">${p.details}</p>
          <p><strong>${p.price} coins</strong> • ${CATEGORY_LABELS[p.category]}</p>
          <button data-add-cart="${p.id}">Add to Cart</button>
        </div>
      </article>
    `
    )
    .join("");

  document.querySelectorAll("[data-add-cart]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(Number(btn.dataset.addCart)));
  });
}

function getUserCart(userId) {
  if (!store.carts[userId]) store.carts[userId] = [];
  return store.carts[userId];
}

function addToCart(productId) {
  getUserCart(currentUser.id).push(productId);
  saveData();
  renderCartUI();
}

function renderCartUI() {
  const cart = getUserCart(currentUser.id);
  const items = cart.map((id) => store.products.find((p) => p.id === id)).filter(Boolean);
  const total = items.reduce((s, i) => s + i.price, 0);

  document.getElementById("cartCountBadge").textContent = String(items.length);
  document.getElementById("cartSummary").textContent = `${items.length} item(s) • ${total} coins`;
  document.getElementById("cartItems").innerHTML = items.length
    ? items.map((i) => `<div class="mini-item">${i.name} <strong>${i.price}</strong></div>`).join("")
    : '<p class="muted">Cart is empty.</p>';
}

function clearCart() {
  store.carts[currentUser.id] = [];
  saveData();
  renderCartUI();
}

function checkout() {
  const cart = getUserCart(currentUser.id);
  if (!cart.length) return alert("Cart is empty.");

  const items = cart.map((id) => store.products.find((p) => p.id === id)).filter(Boolean);
  const total = items.reduce((s, i) => s + i.price, 0);
  const user = getUserById(currentUser.id);

  if (user.wallet < total) return alert("Not enough coins.");

  user.wallet -= total;
  store.bankBalance += total;
  store.carts[currentUser.id] = [];

  const orderId = `ORD-${Date.now()}`;
  const time = new Date().toLocaleString();
  if (!store.tracking[currentUser.id]) store.tracking[currentUser.id] = [];

  store.tracking[currentUser.id].push({
    orderId,
    status: "Dispatched",
    location: "Dealer Warehouse",
    updatedAt: time,
    items: items.map((x) => x.name),
  });

  saveData();
  renderResellerData();
  alert(`Order ${orderId} placed.`);
}

function renderTrackingRecords() {
  const records = (store.tracking[currentUser.id] || []).slice().reverse();
  const box = document.getElementById("trackingRecords");
  box.innerHTML = records.length
    ? records
        .map(
          (r) => `<div class="record"><strong>${r.orderId}</strong><div>${r.items.join(", ")}</div><div>${r.status} • ${r.location}</div><small>${r.updatedAt}</small></div>`
        )
        .join("")
    : '<p class="muted">No orders yet.</p>';
}

function createUser(event) {
  event.preventDefault();
  const id = document.getElementById("newUserId").value.trim();
  const password = document.getElementById("newUserPassword").value;
  if (!id || !password) return;
  if (getUserById(id)) return alert("User already exists.");

  store.users.push({ id, password, role: "reseller", wallet: 0 });
  saveData();
  event.target.reset();
  renderAdminData();
}

function deleteUser(userId) {
  if (!confirm(`Delete user ${userId}?`)) return;
  store.users = store.users.filter((u) => u.id !== userId);
  delete store.carts[userId];
  delete store.purchases[userId];
  delete store.tracking[userId];
  saveData();
  renderAdminData();
}

function addProduct(event) {
  event.preventDefault();
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value;
  const price = Number(document.getElementById("productPrice").value);
  const details = document.getElementById("productDetails").value.trim();
  const image = document.getElementById("productImage").value.trim() || PLACEHOLDER_IMAGE;

  if (!name || !category || !price || !details) return;

  store.products.push({ id: store.nextProductId++, name, category, price, details, image });
  saveData();
  event.target.reset();
  renderAdminData();
}

function deleteProduct(productId) {
  if (!confirm("Delete this product?")) return;
  store.products = store.products.filter((p) => p.id !== productId);
  Object.keys(store.carts).forEach((userId) => {
    store.carts[userId] = (store.carts[userId] || []).filter((id) => id !== productId);
  });
  saveData();
  renderAdminData();
}

function addCoins(event) {
  event.preventDefault();
  const userId = document.getElementById("walletUser").value;
  const amount = Number(document.getElementById("coinAmount").value);
  const user = getUserById(userId);
  if (!user || !amount) return;
  user.wallet += amount;
  saveData();
  event.target.reset();
  renderAdminData();
}

function resetDemoData() {
  if (!confirm("Reset all data?")) return;
  store = clone(defaultData);
  saveData();
  loginMessage.textContent = "Data reset. Use admin / admin123";
}

function bindEvents() {
  document.getElementById("loginForm").addEventListener("submit", login);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("createUserForm").addEventListener("submit", createUser);
  document.getElementById("productForm").addEventListener("submit", addProduct);
  document.getElementById("walletForm").addEventListener("submit", addCoins);
  document.getElementById("checkoutBtn").addEventListener("click", checkout);
  document.getElementById("clearCartBtn").addEventListener("click", clearCart);
  document.getElementById("resetDataBtn").addEventListener("click", resetDemoData);
  document.getElementById("searchInput").addEventListener("input", renderCatalogCards);
  document.getElementById("openCartBtn").addEventListener("click", () => document.getElementById("cartDrawer").classList.remove("hidden"));
  document.getElementById("closeCartBtn").addEventListener("click", () => document.getElementById("cartDrawer").classList.add("hidden"));
}

bindEvents();
setupLoginHintFromUrl();
