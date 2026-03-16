const STORAGE_KEY = "zivora_store_data_v4";
const LEGACY_STORAGE_KEYS = ["zivora_store_data_v3", "zivora_store_data_v2"];
const SESSION_USER_KEY = "zivora_current_user";
const SESSION_ADMIN_GATE = "zivora_admin_gate_unlocked";

const CATEGORY_LABELS = {
  all: "Home",
  kids: "Kids Wear",
  women: "Women's Wear",
  men: "Men's Wear",
  jewellery: "Jewellery",
};

const BADGE_LABELS = {
  trending: "Trending",
  "best-seller": "Best Seller",
  "new-arrival": "New Arrival",
};

const fallbackImage =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=60";

const defaultData = {
  settings: { adminGatePasskey: "zivora-admin-gate" },
  users: [
    { id: "admin", password: "admin123", role: "admin", wallet: 0 },
    { id: "reseller01", password: "reseller123", role: "reseller", wallet: 2500 },
  ],
  products: [
    { id: 1, name: "Kids Cartoon T-Shirt", category: "kids", price: 250, details: "Soft cotton for daily wear", image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=60" },
    { id: 2, name: "Women Night Suit Set", category: "women", price: 650, details: "Satin finish 2-piece", image: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&w=800&q=60" },
    { id: 3, name: "Men Cotton T-Shirt", category: "men", price: 390, details: "Breathable and regular fit", image: "https://images.unsplash.com/photo-1527719327859-c6ce80353573?auto=format&fit=crop&w=800&q=60" },
    { id: 4, name: "Artificial Stone Necklace", category: "jewellery", price: 470, details: "Lightweight festive design", image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=800&q=60" },
  ],
  carts: {},
  purchases: {},
  tracking: {},
  nextProductId: 5,
};

let store = loadData();
let selectedMaterial = "all";
const page = document.body.dataset.page;

function loadData() {
  const primaryRaw = localStorage.getItem(STORAGE_KEY);
  if (primaryRaw) {
    try { return migrateData(JSON.parse(primaryRaw)); } catch { localStorage.removeItem(STORAGE_KEY); }
  }
  for (const key of LEGACY_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const migrated = migrateData(JSON.parse(raw));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch { localStorage.removeItem(key); }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  return structuredClone(defaultData);
}

function migrateData(data) {
  const migrated = structuredClone(data || {});
  if (!migrated.settings) migrated.settings = {};
  if (!migrated.settings.adminGatePasskey) migrated.settings.adminGatePasskey = defaultData.settings.adminGatePasskey;
  if (!Array.isArray(migrated.users)) migrated.users = structuredClone(defaultData.users);
  migrated.users = migrated.users.map((u) => ({ ...u, wallet: Number.isFinite(Number(u.wallet)) ? Number(u.wallet) : 0 }));
  if (!Array.isArray(migrated.products)) migrated.products = [];
  migrated.products = migrated.products.map((p) => ({ ...p, image: p.image || fallbackImage }));
  if (!migrated.nextProductId) migrated.nextProductId = migrated.products.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;
  if (!migrated.carts) migrated.carts = {};
  if (!migrated.purchases) migrated.purchases = {};
  if (!migrated.tracking) migrated.tracking = {};
  return migrated;
}

function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
function refreshStore() { store = loadData(); }
function getUserById(id) { return store.users.find((u) => u.id === id); }
function getSessionUser() { return sessionStorage.getItem(SESSION_USER_KEY); }
function setSessionUser(id) { sessionStorage.setItem(SESSION_USER_KEY, id); }
function clearSession() { sessionStorage.removeItem(SESSION_USER_KEY); sessionStorage.removeItem(SESSION_ADMIN_GATE); }
function isAdminGateUnlocked() { return sessionStorage.getItem(SESSION_ADMIN_GATE) === "1"; }

function requireRole(role) {
  refreshStore();
  const userId = getSessionUser();
  const user = getUserById(userId);
  if (!user || user.role !== role) {
    window.location.href = role === "admin" ? "admin-login.html" : "index.html";
    return null;
  }
  const welcome = document.getElementById("welcomeText");
  if (welcome) welcome.textContent = `Logged in as ${user.id} (${user.role})`;
  renderNavCartCount(user.id);
  return user;
}

function logout() { clearSession(); window.location.href = "index.html"; }

function renderNavCartCount(userId) {
  const node = document.getElementById("navCartCount");
  if (!node) return;
  const count = (store.carts[userId] || []).length;
  node.textContent = String(count);
}

function bindLogout() {
  const btn = document.getElementById("logoutBtn");
  if (btn) btn.addEventListener("click", logout);
}

function getUserCart(userId) {
  if (!store.carts[userId]) store.carts[userId] = [];
  return store.carts[userId];
}

function loginUser(event, expectedRole) {
  event.preventDefault();
  refreshStore();
  const id = document.getElementById("userId").value.trim();
  const password = document.getElementById("password").value;
  const message = document.getElementById("loginMessage");
  const user = getUserById(id);
  if (!user || user.password !== password || user.role !== expectedRole) {
    message.textContent = "Invalid credentials for this login.";
    return;
  }
  if (expectedRole === "admin" && !isAdminGateUnlocked()) {
    message.textContent = "Unlock admin gate first.";
    return;
  }
  setSessionUser(user.id);
  window.location.href = expectedRole === "admin" ? "admin-users.html" : "reseller-home.html";
}

function unlockAdminGate(event) {
  event.preventDefault();
  refreshStore();
  const pass = document.getElementById("adminGatePassword").value;
  const msg = document.getElementById("adminGateMessage");
  if (pass !== store.settings.adminGatePasskey) {
    msg.textContent = "Invalid gate passkey.";
    return;
  }
  sessionStorage.setItem(SESSION_ADMIN_GATE, "1");
  msg.textContent = "Gate unlocked. Now login as admin.";
  event.target.reset();
}

function renderResellerNav() {
  const nav = document.getElementById("resellerNavLinks");
  if (!nav) return;
  nav.innerHTML = Object.entries(CATEGORY_LABELS).map(([key, label]) =>
    `<button class="category-link ${selectedMaterial === key ? "active" : ""}" data-category-link="${key}">${label}</button>`).join("");
  nav.querySelectorAll("[data-category-link]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMaterial = button.getAttribute("data-category-link");
      renderResellerNav();
      renderCatalog();
    });
  });
}

function renderCatalog() {
  const catalog = document.getElementById("catalog");
  const title = document.getElementById("catalogSectionTitle");
  if (!catalog || !title) return;
  const products = selectedMaterial === "all" ? store.products : store.products.filter((p) => p.category === selectedMaterial);
  title.textContent = selectedMaterial === "all" ? "Home: All categories" : `Category page: ${CATEGORY_LABELS[selectedMaterial] || "Selected"}`;
  if (!products.length) {
    catalog.innerHTML = '<div class="product-item muted">No products in this category yet.</div>';
    return;
  }
  const userId = getSessionUser();
  catalog.innerHTML = "";
  products.forEach((p) => {
    const item = document.createElement("div");
    item.className = "product-item";
    item.innerHTML = `<img src="${p.image}" alt="${p.name}" loading="lazy" /><strong>${p.name}</strong><small>${p.details}</small><p>${p.price} coins • ${CATEGORY_LABELS[p.category] || p.category}</p><button data-product-id="${p.id}">Add to Cart</button>`;
    item.querySelector("button").addEventListener("click", () => {
      getUserCart(userId).push(p.id);
      saveData();
      renderNavCartCount(userId);
      alert(`${p.name} added to cart.`);
    });
    catalog.appendChild(item);
  });
}

function renderWallet(user) {
  const wallet = document.getElementById("walletBalance");
  if (wallet) wallet.textContent = `${user.wallet} 🪙`;
}

function cartItemsWithProducts(userId) {
  return getUserCart(userId).map((id) => store.products.find((p) => p.id === id)).filter(Boolean);
}

function renderCart(user) {
  const items = cartItemsWithProducts(user.id);
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const summary = document.getElementById("cartSummary");
  if (summary) summary.textContent = `${items.length} item(s) • ${total} coins`;
  const cartItems = document.getElementById("cartItems");
  if (cartItems) {
    cartItems.innerHTML = items.length ? items.map((it) => `<div class="record"><strong>${it.name}</strong><div>${it.price} coins</div></div>`).join("") : '<p class="muted">Cart is empty.</p>';
  }
}

function getShippingAddressFromForm() {
  const name = document.getElementById("shipName").value.trim();
  const phoneRaw = document.getElementById("shipPhone").value.trim();
  const line = document.getElementById("shipLine").value.trim();
  const city = document.getElementById("shipCity").value.trim();
  const state = document.getElementById("shipState").value.trim();
  const pincode = document.getElementById("shipPincode").value.trim();
  if (!name || !phoneRaw || !line || !city || !state || !pincode) return { error: "Please fill all shipping fields." };
  const phone = phoneRaw.replace(/\D/g, "");
  if (!/^\d{10}$/.test(phone)) return { error: "Phone number must be 10 digits." };
  if (!/^\d{6}$/.test(pincode)) return { error: "Pincode must be 6 digits." };
  return { address: { name, phone, line, city, state, pincode } };
}

function saveShippingAddress(event) {
  event.preventDefault();
  const parsed = getShippingAddressFromForm();
  if (parsed.error) return alert(parsed.error);
  const a = parsed.address;
  document.getElementById("savedAddressPreview").textContent = `Ready: ${a.name}, ${a.line}, ${a.city}, ${a.state} - ${a.pincode} (${a.phone})`;
}

function checkout(user) {
  const items = cartItemsWithProducts(user.id);
  if (!items.length) return alert("Cart is empty.");
  const parsed = getShippingAddressFromForm();
  if (parsed.error) return alert(parsed.error);
  const total = items.reduce((sum, item) => sum + item.price, 0);
  if (user.wallet < total) return alert("Not enough coins in wallet.");

  user.wallet -= total;
  store.carts[user.id] = [];
  if (!store.purchases[user.id]) store.purchases[user.id] = [];
  if (!store.tracking[user.id]) store.tracking[user.id] = [];
  const orderId = `ORD-${Date.now()}`;
  const purchasedAt = new Date().toLocaleString();
  const address = parsed.address;

  store.purchases[user.id].push({ orderId, items, total, purchasedAt, shippingAddress: address });
  store.tracking[user.id].push({ orderId, status: "Order Placed", location: `${address.city}, ${address.state}`, updatedAt: purchasedAt });
  saveData();
  document.getElementById("shippingForm").reset();
  document.getElementById("savedAddressPreview").textContent = "Shipping details will be collected during checkout for each order.";
  renderCart(user);
  renderWallet(user);
  renderNavCartCount(user.id);
  alert(`Checkout successful! ${orderId} created.`);
}

function renderPurchaseRecords(user) {
  const box = document.getElementById("purchaseRecords");
  if (!box) return;
  const records = store.purchases[user.id] || [];
  box.innerHTML = records.length ? records.slice().reverse().map((r) => `<div class="record"><strong>${r.orderId}</strong>${r.items.map((it) => `<div class="purchase-item"><img src="${it.image || fallbackImage}" alt="${it.name}" /><span>${it.name}</span></div>`).join("")}<small>${r.purchasedAt}</small><div>Total: ${r.total} coins</div></div>`).join("") : '<p class="muted">No purchases yet.</p>';
}

function renderTrackingRecords(user) {
  const box = document.getElementById("trackingRecords");
  if (!box) return;
  const records = store.tracking[user.id] || [];
  box.innerHTML = records.length ? records.slice().reverse().map((t) => `<div class="record"><strong>${t.orderId}</strong><div>Status: ${t.status}</div><div>Location: ${t.location}</div><small>Updated: ${t.updatedAt}</small></div>`).join("") : '<p class="muted">No tracking updates yet.</p>';
}

function renderUsersTable() {
  const resellerUsers = store.users.filter((u) => u.role === "reseller");
  const walletUser = document.getElementById("walletUser");
  if (walletUser) {
    walletUser.innerHTML = '<option value="">Select reseller</option>';
    resellerUsers.forEach((u) => walletUser.insertAdjacentHTML("beforeend", `<option value="${u.id}">${u.id} (wallet: ${u.wallet} coins)</option>`));
  }
  const rows = store.users.map((u) => `<tr><td>${u.id}</td><td>${u.password}</td><td>${u.role}</td><td>${u.wallet} coins</td><td>${u.role === "reseller" ? `<button class="danger small" data-delete-user="${u.id}">Delete</button>` : "-"}</td></tr>`).join("");
  const wrap = document.getElementById("usersTableWrap");
  if (!wrap) return;
  wrap.innerHTML = `<table class="table"><thead><tr><th>User ID</th><th>Password</th><th>Role</th><th>Wallet</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`;
  wrap.querySelectorAll("[data-delete-user]").forEach((b) => b.addEventListener("click", () => deleteResellerUser(b.getAttribute("data-delete-user"))));
}

function renderProductsAdminTable() {
  const wrap = document.getElementById("productsTableWrap");
  if (!wrap) return;
  if (!store.products.length) return (wrap.innerHTML = '<p class="muted">No products available.</p>');
  const rows = store.products.map((p) => `<tr><td>${p.id}</td><td>${p.name}</td><td>${CATEGORY_LABELS[p.category] || p.category}</td><td>${p.price}</td><td><button class="danger small" data-delete-product="${p.id}">Delete</button></td></tr>`).join("");
  wrap.innerHTML = `<table class="table"><thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Price (coins)</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`;
  wrap.querySelectorAll("[data-delete-product]").forEach((b) => b.addEventListener("click", () => deleteProduct(Number(b.getAttribute("data-delete-product")))));
}

function renderOrdersAdminTable() {
  const wrap = document.getElementById("ordersTableWrap");
  if (!wrap) return;
  const rows = [];
  Object.entries(store.purchases).forEach(([userId, orders]) => orders.forEach((order) => rows.push({ userId, order, track: (store.tracking[userId] || []).find((t) => t.orderId === order.orderId) })));
  if (!rows.length) return (wrap.innerHTML = '<p class="muted">No booked orders found.</p>');
  wrap.innerHTML = `<table class="table"><thead><tr><th>Order ID</th><th>Reseller</th><th>Total</th><th>Tracking</th><th>Location</th><th>Actions</th></tr></thead><tbody>${rows.slice().reverse().map(({userId,order,track})=>`<tr><td>${order.orderId}</td><td>${userId}</td><td>${order.total} coins</td><td><select data-track-status="${order.orderId}" data-track-user="${userId}">${["Order Placed","Packed","Shipped","Out for Delivery","Delivered","Cancelled"].map((s)=>`<option value="${s}" ${s === (track?.status || "Order Placed") ? "selected" : ""}>${s}</option>`).join("")}</select></td><td><input type="text" value="${track?.location || "-"}" data-track-location="${order.orderId}" data-track-user="${userId}" /></td><td><div class="row"><button class="small" data-update-order="${order.orderId}" data-order-user="${userId}">Update</button><button class="danger small" data-cancel-order="${order.orderId}" data-order-user="${userId}">Cancel</button></div></td></tr>`).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-update-order]").forEach((b) => b.addEventListener("click", () => {
    const orderId = b.getAttribute("data-update-order");
    const userId = b.getAttribute("data-order-user");
    const status = wrap.querySelector(`[data-track-status="${orderId}"][data-track-user="${userId}"]`).value;
    const location = wrap.querySelector(`[data-track-location="${orderId}"][data-track-user="${userId}"]`).value.trim();
    updateOrderTracking(userId, orderId, status, location);
  }));
  wrap.querySelectorAll("[data-cancel-order]").forEach((b) => b.addEventListener("click", () => cancelOrder(b.getAttribute("data-order-user"), b.getAttribute("data-cancel-order"))));
}

function createUser(event) {
  event.preventDefault();
  const id = document.getElementById("newUserId").value.trim();
  const password = document.getElementById("newUserPassword").value;
  if (!id || !password) return;
  if (getUserById(id)) return alert("User ID already exists.");
  store.users.push({ id, password, role: "reseller", wallet: 0 });
  saveData();
  event.target.reset();
  renderUsersTable();
}

function deleteResellerUser(userId) {
  if (!window.confirm(`Delete reseller ${userId}?`)) return;
  store.users = store.users.filter((u) => !(u.id === userId && u.role === "reseller"));
  delete store.carts[userId]; delete store.purchases[userId]; delete store.tracking[userId];
  saveData(); renderUsersTable();
}

function addCoins(event) {
  event.preventDefault();
  const userId = document.getElementById("walletUser").value;
  const amount = Number(document.getElementById("coinAmount").value);
  const user = getUserById(userId);
  if (!user || user.role !== "reseller" || amount < 1) return;
  user.wallet += amount; saveData(); event.target.reset(); renderUsersTable();
}

async function createProduct(event) {
  event.preventDefault();
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value;
  const badge = document.getElementById("productBadge").value;
  const price = Number(document.getElementById("productPrice").value);
  const details = document.getElementById("productDetails").value.trim();
  const imageUrl = document.getElementById("productImage").value.trim();
  const fileInput = document.getElementById("productImageFile");
  const imageFile = fileInput.files[0];
  let image = imageUrl;
  if (imageFile) image = await fileToDataUrl(imageFile);
  if (!image) image = fallbackImage;
  if (!name || !category || !price || !details) return;
  store.products.push({ id: store.nextProductId++, name, category, price, details, image });
  saveData();
  event.target.reset();
  const uploadText = document.getElementById("uploadFileName");
  if (uploadText) uploadText.textContent = "No file selected (you can still use image URL)";
  renderProductsAdminTable();
}

function openEditProductModal(productId) {
  const product = store.products.find((p) => p.id === productId);
  if (!product) return;

  document.getElementById("editProductId").value = String(product.id);
  document.getElementById("editProductName").value = product.name;
  document.getElementById("editProductCategory").value = product.category;
  document.getElementById("editProductBadge").value = product.badge || "";
  document.getElementById("editProductPrice").value = String(product.price);
  document.getElementById("editProductDetails").value = product.details;
  document.getElementById("editProductImage").value = product.image;
  document.getElementById("editProductModal").classList.remove("hidden");
}

function closeEditProductModal() {
  document.getElementById("editProductModal").classList.add("hidden");
}

function updateProduct(event) {
  event.preventDefault();
  const productId = Number(document.getElementById("editProductId").value);
  const product = store.products.find((p) => p.id === productId);
  if (!product) return;

  const name = document.getElementById("editProductName").value.trim();
  const category = document.getElementById("editProductCategory").value;
  const badge = document.getElementById("editProductBadge").value;
  const price = Number(document.getElementById("editProductPrice").value);
  const details = document.getElementById("editProductDetails").value.trim();
  const image = document.getElementById("editProductImage").value.trim() || fallbackImage;

  if (!name || !category || !price || !details) {
    alert("Please fill all required fields.");
    return;
  }

  product.name = name;
  product.category = category;
  product.badge = badge;
  product.price = price;
  product.details = details;
  product.image = image;

  saveData();
  closeEditProductModal();
  renderAdminData();
  if (currentUser?.role === "reseller") {
    renderResellerData();
  }
  alert("Product updated.");
}

function fileToDataUrl(file) {
  if (!file.type.startsWith("image/")) return Promise.reject(new Error("Please upload image only."));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("File read failed."));
    reader.readAsDataURL(file);
  });
}

function deleteProduct(productId) {
  const product = store.products.find((p) => p.id === productId);
  if (!product || !window.confirm(`Delete product \"${product.name}\"?`)) return;
  store.products = store.products.filter((p) => p.id !== productId);
  Object.keys(store.carts).forEach((uid) => { store.carts[uid] = (store.carts[uid] || []).filter((id) => id !== productId); });
  saveData();
  renderProductsAdminTable();
}

function updateOrderTracking(userId, orderId, status, location) {
  if (!status || !location) return alert("Tracking status and location are required.");
  if (!store.tracking[userId]) store.tracking[userId] = [];
  const existing = store.tracking[userId].find((t) => t.orderId === orderId);
  const updatedAt = new Date().toLocaleString();
  if (existing) { existing.status = status; existing.location = location; existing.updatedAt = updatedAt; }
  else store.tracking[userId].push({ orderId, status, location, updatedAt });
  saveData(); renderOrdersAdminTable();
}

function cancelOrder(userId, orderId) {
  if (!window.confirm(`Cancel order ${orderId} for ${userId}?`)) return;
  const orders = store.purchases[userId] || [];
  const order = orders.find((o) => o.orderId === orderId);
  if (!order) return;
  const user = getUserById(userId);
  if (user) user.wallet += order.total;
  store.purchases[userId] = orders.filter((o) => o.orderId !== orderId);
  if (store.tracking[userId]) store.tracking[userId] = store.tracking[userId].filter((t) => t.orderId !== orderId);
  saveData(); renderOrdersAdminTable();
}

function changeAdminPassword(event) {
  event.preventDefault();
  const newPass = document.getElementById("newAdminPassword").value;
  if (!newPass || newPass.length < 4) return alert("Admin password must be at least 4 characters.");
  getUserById("admin").password = newPass;
  saveData(); event.target.reset(); alert("Admin password updated.");
}

function changeGatePasskey(event) {
  event.preventDefault();
  const newPasskey = document.getElementById("newGatePassword").value;
  if (!newPasskey || newPasskey.length < 4) return alert("Gate passkey must be at least 4 characters.");
  store.settings.adminGatePasskey = newPasskey;
  saveData(); event.target.reset(); alert("Gate passkey updated.");
}

function init() {
  bindLogout();
  if (page === "login") {
    document.getElementById("loginForm").addEventListener("submit", (e) => loginUser(e, "reseller"));
    return;
  }
  if (page === "admin-login") {
    document.getElementById("adminGateForm").addEventListener("submit", unlockAdminGate);
    document.getElementById("loginForm").addEventListener("submit", (e) => loginUser(e, "admin"));
    return;
  }

  const isAdminPage = page.startsWith("admin-");
  const user = requireRole(isAdminPage ? "admin" : "reseller");
  if (!user) return;

  if (page === "reseller-home") {
    renderResellerNav();
    renderCatalog();
  } else if (page === "reseller-wallet") {
    renderWallet(user);
  } else if (page === "reseller-orders") {
    renderPurchaseRecords(user);
    renderTrackingRecords(user);
  } else if (page === "reseller-cart") {
    renderWallet(user);
    renderCart(user);
    document.getElementById("shippingForm").addEventListener("submit", saveShippingAddress);
    document.getElementById("clearCartBtn").addEventListener("click", () => {
      store.carts[user.id] = [];
      saveData();
      renderCart(user);
      renderNavCartCount(user.id);
    });
    document.getElementById("checkoutBtn").addEventListener("click", () => checkout(user));
  } else if (page === "admin-users") {
    renderUsersTable();
    document.getElementById("createUserForm").addEventListener("submit", createUser);
    document.getElementById("walletForm").addEventListener("submit", addCoins);
  } else if (page === "admin-products") {
    renderProductsAdminTable();
    document.getElementById("productForm").addEventListener("submit", (e) => createProduct(e).catch((err) => alert(err.message || "Unable to upload.")));
    const fileInput = document.getElementById("productImageFile");
    fileInput.addEventListener("change", () => {
      const node = document.getElementById("uploadFileName");
      node.textContent = fileInput.files[0] ? `Selected file: ${fileInput.files[0].name}` : "No file selected (you can still use image URL)";
    });
  } else if (page === "admin-orders") {
    renderOrdersAdminTable();
  } else if (page === "admin-security") {
    document.getElementById("changeAdminPasswordForm").addEventListener("submit", changeAdminPassword);
    document.getElementById("changeGatePasswordForm").addEventListener("submit", changeGatePasskey);
  }

  window.addEventListener("storage", () => window.location.reload());
}

saveData();
init();
