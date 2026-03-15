const STORAGE_KEY = "zivora_store_data_v4";
const LEGACY_KEYS = ["zivora_store_data_v3", "zivora_store_data_v2", "zivora_store_data_v1"];

const CATEGORY_LABELS = {
  kids: "Kids Wear",
  women: "Women's Wear",
  men: "Men's Wear",
  jewellery: "Jewellery",
};

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80&auto=format&fit=crop";

const defaultData = {
  users: [
    { id: "admin", password: "admin123", role: "admin", wallet: 0 },
    { id: "reseller01", password: "reseller123", role: "reseller", wallet: 2500 },
  ],
  products: [
    {
      id: 1,
      name: "Kids Cartoon T-Shirt",
      category: "kids",
      price: 250,
      brand: "TinyPop",
      size: "3-4Y",
      material: "Cotton",
      stock: 40,
      details: "Soft cotton round-neck T-shirt for kids.",
      image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=700&q=80&auto=format&fit=crop",
    },
    {
      id: 2,
      name: "Women Night Suit",
      category: "women",
      price: 650,
      brand: "DreamWear",
      size: "M",
      material: "Rayon",
      stock: 25,
      details: "Breathable and comfortable nightwear set.",
      image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&q=80&auto=format&fit=crop",
    },
    {
      id: 3,
      name: "Men Cotton T-Shirt",
      category: "men",
      price: 390,
      brand: "UrbanBasic",
      size: "L",
      material: "Cotton",
      stock: 35,
      details: "Regular fit premium men t-shirt.",
      image: "https://images.unsplash.com/photo-1484515991647-c5760fcecfc7?w=700&q=80&auto=format&fit=crop",
    },
    {
      id: 4,
      name: "Artificial Necklace",
      category: "jewellery",
      price: 470,
      brand: "ShineCraft",
      size: "Free",
      material: "Alloy",
      stock: 18,
      details: "Lightweight festive necklace set.",
      image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=700&q=80&auto=format&fit=crop",
    },
  ],
  carts: {},
  tracking: {},
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
const loginModeHint = document.getElementById("loginModeHint");

function isAdminEntryUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("panel") === "admin";
}

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
    tracking: data.tracking && typeof data.tracking === "object" ? data.tracking : {},
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
    brand: String(p.brand || "Generic"),
    size: String(p.size || "Free"),
    material: String(p.material || "Mixed"),
    stock: Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0,
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
  if (!isAdminEntryUrl()) {
    loginModeHint.classList.add("hidden");
    return;
  }

  document.getElementById("userId").value = "admin";
  loginModeHint.classList.remove("hidden");
  loginModeHint.textContent = "Admin mode URL opened. Enter admin password to access the admin panel.";
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

  if (user.role === "admin" && !isAdminEntryUrl()) {
    loginMessage.textContent = "Admin login is only allowed from admin URL: index.html?panel=admin";
    return;
  }

  currentUser = user;
  loginMessage.textContent = "";
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
    const option = document.createElement("option");
    option.value = u.id;
    option.textContent = `${u.id} (${u.wallet} coins)`;
    walletUser.appendChild(option);
  });

  document.getElementById("usersTableWrap").innerHTML = `
    <table class="table">
      <thead><tr><th>Username</th><th>Password</th><th>Role</th><th>Wallet</th><th>Action</th></tr></thead>
      <tbody>
      ${store.users
        .map(
          (u) => `<tr>
            <td>${u.id}</td>
            <td>${u.password}</td>
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
      <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Brand</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead>
      <tbody>
      ${store.products
        .map(
          (p) => `<tr>
            <td><img class="thumb" src="${p.image}" alt="${p.name}" /></td>
            <td>${p.name}</td>
            <td>${CATEGORY_LABELS[p.category]}</td>
            <td>${p.brand}</td>
            <td>${p.price}</td>
            <td>${p.stock}</td>
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

  all.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.label;
    btn.className = `chip ${selectedCategory === item.key ? "active" : ""}`;
    btn.addEventListener("click", () => {
      selectedCategory = item.key;
      buildCategoryFilters();
      renderCatalogCards();
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
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const box = document.getElementById("catalogCards");

  const list = store.products.filter((p) => {
    const byCategory = selectedCategory === "all" || p.category === selectedCategory;
    const searchable = `${p.name} ${p.details} ${p.brand} ${p.material}`.toLowerCase();
    const bySearch = !query || searchable.includes(query);
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
          <p class="meta">${p.brand} • ${p.material} • Size: ${p.size}</p>
          <p class="meta">Stock: ${p.stock}</p>
          <p><strong>${p.price} coins</strong> • ${CATEGORY_LABELS[p.category]}</p>
          <button data-add-cart="${p.id}" ${p.stock <= 0 ? "disabled" : ""}>${p.stock <= 0 ? "Out of Stock" : "Add to Cart"}</button>
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
  const product = store.products.find((p) => p.id === productId);
  if (!product || product.stock <= 0) return;

  getUserCart(currentUser.id).push(productId);
  saveData();
  renderCartUI();
}

function renderCartUI() {
  const cart = getUserCart(currentUser.id);
  const items = cart.map((id) => store.products.find((p) => p.id === id)).filter(Boolean);
  const total = items.reduce((sum, item) => sum + item.price, 0);

  document.getElementById("cartCountBadge").textContent = String(items.length);
  document.getElementById("cartSummary").textContent = `${items.length} item(s) • ${total} coins`;

  document.getElementById("cartItems").innerHTML = items.length
    ? items.map((i) => `<div class="mini-item"><span>${i.name}</span><strong>${i.price}</strong></div>`).join("")
    : '<p class="muted">Cart is empty.</p>';
}

function clearCart() {
  store.carts[currentUser.id] = [];
  saveData();
  renderCartUI();
}

function checkout() {
  const cart = getUserCart(currentUser.id);
  if (!cart.length) {
    alert("Cart is empty.");
    return;
  }

  const items = cart.map((id) => store.products.find((p) => p.id === id)).filter(Boolean);
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const user = getUserById(currentUser.id);

  if (user.wallet < total) {
    alert("Not enough coins.");
    return;
  }

  const stockOk = items.every((item) => item.stock > 0);
  if (!stockOk) {
    alert("Some items are out of stock. Please refresh cart.");
    return;
  }

  user.wallet -= total;
  items.forEach((item) => {
    item.stock -= 1;
  });
  store.carts[currentUser.id] = [];

  const orderId = `ORD-${Date.now()}`;
  const updatedAt = new Date().toLocaleString();
  if (!store.tracking[currentUser.id]) store.tracking[currentUser.id] = [];

  store.tracking[currentUser.id].push({
    orderId,
    status: "Dispatched",
    location: "Dealer Warehouse",
    updatedAt,
    items: items.map((item) => item.name),
    total,
  });

  saveData();
  renderResellerData();
  alert(`Order placed successfully: ${orderId}`);
}

function renderTrackingRecords() {
  const records = (store.tracking[currentUser.id] || []).slice().reverse();
  const box = document.getElementById("trackingRecords");

  box.innerHTML = records.length
    ? records
        .map(
          (r) => `<div class="record"><strong>${r.orderId}</strong><div>${r.items.join(", ")}</div><div>${r.total} coins • ${r.status}</div><small>${r.location} • ${r.updatedAt}</small></div>`
        )
        .join("")
    : '<p class="muted">No orders yet.</p>';
}

function createUser(event) {
  event.preventDefault();
  const id = document.getElementById("newUserId").value.trim();
  const password = document.getElementById("newUserPassword").value.trim();

  if (!id || !password) return;
  if (getUserById(id)) {
    alert("Username already exists.");
    return;
  }

  store.users.push({ id, password, role: "reseller", wallet: 0 });
  saveData();
  event.target.reset();
  renderAdminData();
}

function deleteUser(userId) {
  if (!confirm(`Delete reseller ${userId}?`)) return;
  store.users = store.users.filter((u) => u.id !== userId);
  delete store.carts[userId];
  delete store.tracking[userId];
  saveData();
  renderAdminData();
}

function addProduct(event) {
  event.preventDefault();

  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value;
  const price = Number(document.getElementById("productPrice").value);
  const brand = document.getElementById("productBrand").value.trim();
  const size = document.getElementById("productSize").value.trim();
  const material = document.getElementById("productMaterial").value.trim();
  const stock = Number(document.getElementById("productStock").value);
  const image = document.getElementById("productImage").value.trim() || PLACEHOLDER_IMAGE;
  const details = document.getElementById("productDetails").value.trim();

  if (!name || !category || !price || !brand || !size || !material || !details) return;

  store.products.push({
    id: store.nextProductId++,
    name,
    category,
    price,
    brand,
    size,
    material,
    stock: Number.isFinite(stock) ? stock : 0,
    details,
    image,
  });

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

function changeAdminPassword(event) {
  event.preventDefault();
  const current = document.getElementById("currentAdminPassword").value;
  const next = document.getElementById("newAdminPassword").value.trim();
  const admin = getUserById("admin");

  if (!admin) return;
  if (admin.password !== current) {
    alert("Current admin password is incorrect.");
    return;
  }
  if (!next || next.length < 4) {
    alert("New password should be at least 4 characters.");
    return;
  }

  admin.password = next;
  saveData();
  event.target.reset();
  renderAdminData();
  alert("Admin password updated.");
}

function resetDemoData() {
  if (!confirm("Reset all data to demo defaults?")) return;
  store = clone(defaultData);
  saveData();
  loginMessage.textContent = "Data reset complete. Use admin / admin123";
}

function bindEvents() {
  document.getElementById("loginForm").addEventListener("submit", login);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("createUserForm").addEventListener("submit", createUser);
  document.getElementById("changeAdminPasswordForm").addEventListener("submit", changeAdminPassword);
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
