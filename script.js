const STORAGE_KEY = "zivora_store_data_v4";
const LEGACY_STORAGE_KEYS = ["zivora_store_data_v3", "zivora_store_data_v2"];
const ADMIN_PANEL_QUERY = "admin";
const CATEGORY_LABELS = {
  all: "Home",
  kids: "Kids Wear",
  women: "Women's Wear",
  men: "Men's Wear",
  jewellery: "Jewellery",
};

const fallbackImage =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=60";

const defaultData = {
  settings: {
    adminGatePasskey: "zivora-admin-gate",
  },
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
      details: "Soft cotton for daily wear",
      image:
        "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=60",
    },
    {
      id: 2,
      name: "Women Night Suit Set",
      category: "women",
      price: 650,
      details: "Satin finish 2-piece",
      image:
        "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&w=800&q=60",
    },
    {
      id: 3,
      name: "Men Cotton T-Shirt",
      category: "men",
      price: 390,
      details: "Breathable and regular fit",
      image:
        "https://images.unsplash.com/photo-1527719327859-c6ce80353573?auto=format&fit=crop&w=800&q=60",
    },
    {
      id: 4,
      name: "Artificial Stone Necklace",
      category: "jewellery",
      price: 470,
      details: "Lightweight festive design",
      image:
        "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=800&q=60",
    },
    {
      id: 5,
      name: "Women Coat Set",
      category: "women",
      price: 1200,
      details: "Premium winter combo",
      image:
        "https://images.unsplash.com/photo-1554412933-514a83d2f3c8?auto=format&fit=crop&w=800&q=60",
    },
  ],
  carts: {},
  purchases: {},
  tracking: {},
  nextProductId: 6,
};

let store = loadData();
let currentUser = null;
let adminGateUnlocked = false;
let selectedMaterial = "all";

const loginSection = document.getElementById("loginSection");
const adminAccessSection = document.getElementById("adminAccessSection");
const appSection = document.getElementById("appSection");
const adminPanel = document.getElementById("adminPanel");
const resellerPanel = document.getElementById("resellerPanel");
const welcomeText = document.getElementById("welcomeText");
const loginMessage = document.getElementById("loginMessage");
const adminGateMessage = document.getElementById("adminGateMessage");
const loginHint = document.getElementById("loginHint");
const productImageFileInput = document.getElementById("productImageFile");
const uploadFileName = document.getElementById("uploadFileName");

function loadData() {
  const primaryRaw = localStorage.getItem(STORAGE_KEY);
  if (primaryRaw) {
    try {
      return migrateData(JSON.parse(primaryRaw));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  for (const key of LEGACY_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const migrated = migrateData(JSON.parse(raw));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {
      localStorage.removeItem(key);
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  return structuredClone(defaultData);
}

function migrateData(data) {
  const migrated = structuredClone(data || {});

  if (!migrated.settings) migrated.settings = {};
  if (!migrated.settings.adminGatePasskey) {
    migrated.settings.adminGatePasskey = defaultData.settings.adminGatePasskey;
  }

  if (!Array.isArray(migrated.users)) migrated.users = structuredClone(defaultData.users);
  migrated.users = migrated.users.map((user) => ({
    ...user,
    wallet: Number.isFinite(Number(user.wallet)) ? Number(user.wallet) : 0,
  }));

  if (!Array.isArray(migrated.products)) migrated.products = [];
  migrated.products = migrated.products.map((product) => ({
    ...product,
    image: product.image || fallbackImage,
  }));

  if (!migrated.nextProductId) {
    migrated.nextProductId = migrated.products.reduce((max, p) => Math.max(max, p.id || 0), 0) + 1;
  }

  if (!migrated.carts) migrated.carts = {};
  if (!migrated.purchases) migrated.purchases = {};
  if (!migrated.tracking) migrated.tracking = {};

  return migrated;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function refreshStore() {
  store = loadData();
}

function getUserById(userId) {
  return store.users.find((u) => u.id === userId);
}

function isAdminRoute() {
  const params = new URLSearchParams(window.location.search);
  return params.get(ADMIN_PANEL_QUERY) === "1";
}

function updateLoginModeUI() {
  if (isAdminRoute()) {
    adminAccessSection.classList.remove("hidden");
    loginHint.textContent = "Enter your credentials to continue.";
  } else {
    adminAccessSection.classList.add("hidden");
    loginHint.textContent = "Enter your credentials to continue.";
  }
}

function unlockAdminGate(event) {
  event.preventDefault();
  const pass = document.getElementById("adminGatePassword").value;
  if (pass !== store.settings.adminGatePasskey) {
    adminGateMessage.textContent = "Invalid gate passkey.";
    return;
  }
  adminGateUnlocked = true;
  adminGateMessage.textContent = "Admin gate unlocked. You can now login as admin.";
  event.target.reset();
}

function login(event) {
  event.preventDefault();
  refreshStore();
  const id = document.getElementById("userId").value.trim();
  const password = document.getElementById("password").value;
  const user = getUserById(id);

  if (!user || user.password !== password) {
    loginMessage.textContent = "Invalid credentials or unauthorized access.";
    return;
  }

  if (user.role === "admin") {
    if (!isAdminRoute()) {
      loginMessage.textContent = "Admin login is only allowed on the private admin URL (?admin=1).";
      return;
    }
    if (!adminGateUnlocked) {
      loginMessage.textContent = "Unlock admin gate first using passkey.";
      return;
    }
  }

  if (user.role === "reseller" && isAdminRoute()) {
    loginMessage.textContent = "Reseller login is blocked on admin URL. Use normal URL.";
    return;
  }

  currentUser = user;
  selectedMaterial = "all";
  loginMessage.textContent = "";
  loginSection.classList.add("hidden");
  adminAccessSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  welcomeText.textContent = `Logged in as ${user.id} (${user.role})`;
  renderRolePanel();
}

function logout() {
  currentUser = null;
  adminGateUnlocked = false;
  selectedMaterial = "all";
  document.getElementById("loginForm").reset();
  appSection.classList.add("hidden");
  adminPanel.classList.add("hidden");
  resellerPanel.classList.add("hidden");
  document.getElementById("resellerNavLinks").classList.add("hidden");
  loginSection.classList.remove("hidden");
  updateLoginModeUI();
}

function renderRolePanel() {
  if (!currentUser) return;
  if (currentUser.role === "admin") {
    document.getElementById("resellerNavLinks").classList.add("hidden");
    adminPanel.classList.remove("hidden");
    resellerPanel.classList.add("hidden");
    renderAdminData();
  } else {
    adminPanel.classList.add("hidden");
    resellerPanel.classList.remove("hidden");
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
    option.textContent = `${u.id} (wallet: ${u.wallet} coins)`;
    walletUser.appendChild(option);
  });

  const rows = store.users
    .map(
      (u) => `<tr>
        <td>${u.id}</td>
        <td>${u.password}</td>
        <td>${u.role}</td>
        <td>${u.wallet} coins</td>
        <td>${
          u.role === "reseller"
            ? `<button class="danger small" data-delete-user="${u.id}">Delete</button>`
            : "-"
        }</td>
      </tr>`
    )
    .join("");

  document.getElementById("usersTableWrap").innerHTML = `
    <table class="table">
      <thead><tr><th>User ID</th><th>Password</th><th>Role</th><th>Wallet</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  document.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", () => {
      const userId = button.getAttribute("data-delete-user");
      deleteResellerUser(userId);
    });
  });
}

function renderResellerNav() {
  const nav = document.getElementById("resellerNavLinks");
  const categories = Object.entries(CATEGORY_LABELS);
  nav.innerHTML = categories
    .map(
      ([key, label]) =>
        `<button class="category-link ${selectedMaterial === key ? "active" : ""}" data-category-link="${key}">${label}</button>`
    )
    .join("");

  nav.classList.remove("hidden");
  nav.querySelectorAll("[data-category-link]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMaterial = button.getAttribute("data-category-link");
      renderResellerNav();
      renderCatalog();
    });
  });
}

function renderResellerData() {
  refreshStore();
  const user = getUserById(currentUser.id);
  if (!user) {
    alert("Your user account is no longer available.");
    logout();
    return;
  }
  currentUser = user;
  welcomeText.textContent = `Logged in as ${user.id} (${user.role})`;
  document.getElementById("walletBalance").textContent = `${user.wallet} 🪙`;
  renderResellerNav();
  renderCatalog();
  renderCartSummary();
  renderPurchaseRecords();
  renderTrackingRecords();
}

function renderCatalog() {
  const catalog = document.getElementById("catalog");
  const title = document.getElementById("catalogSectionTitle");
  const products =
    selectedMaterial === "all"
      ? store.products
      : store.products.filter((product) => product.category === selectedMaterial);

  title.textContent =
    selectedMaterial === "all"
      ? "Home: All categories"
      : `Category page: ${CATEGORY_LABELS[selectedMaterial] || "Selected Material"}`;

  if (!products.length) {
    catalog.innerHTML = '<div class="product-item muted">No products added in this section yet.</div>';
    return;
  }

  catalog.innerHTML = "";
  products.forEach((p) => {
    const item = document.createElement("div");
    item.className = "product-item";
    item.innerHTML = `
      <img src="${p.image}" alt="${p.name}" loading="lazy" />
      <strong>${p.name}</strong>
      <small>${p.details}</small>
      <p>${p.price} coins • ${CATEGORY_LABELS[p.category] || p.category}</p>
      <button data-product-id="${p.id}">Add to Cart</button>
    `;
    item.querySelector("button").addEventListener("click", () => addToCart(p.id));
    catalog.appendChild(item);
  });
}

function getUserCart(userId) {
  if (!store.carts[userId]) store.carts[userId] = [];
  return store.carts[userId];
}

function addToCart(productId) {
  const cart = getUserCart(currentUser.id);
  cart.push(productId);
  saveData();
  renderCartSummary();
}

function renderCartSummary() {
  const cart = getUserCart(currentUser.id);
  const items = cart.map((id) => store.products.find((p) => p.id === id)).filter(Boolean);
  const total = items.reduce((sum, item) => sum + item.price, 0);
  document.getElementById("cartSummary").textContent = `${items.length} item(s) • ${total} coins`;
}

function clearCart() {
  store.carts[currentUser.id] = [];
  saveData();
  renderCartSummary();
}

function checkout() {
  const cart = getUserCart(currentUser.id);
  if (!cart.length) {
    alert("Cart is empty.");
    return;
  }

  const name = prompt("Enter receiver full name:", "")?.trim() || "";
  const phoneRaw = prompt("Enter 10-digit phone number:", "")?.trim() || "";
  const line = prompt("Enter address line:", "")?.trim() || "";
  const city = prompt("Enter city:", "")?.trim() || "";
  const state = prompt("Enter state:", "")?.trim() || "";
  const pincode = prompt("Enter 6-digit pincode:", "")?.trim() || "";

  if (!name || !phoneRaw || !line || !city || !state || !pincode) {
    alert("Checkout cancelled. Please provide complete shipping details.");
    return;
  }

  const phone = phoneRaw.replace(/\D/g, "");
  if (!/^\d{10}$/.test(phone)) {
    alert("Phone number must be 10 digits.");
    return;
  }

  if (!/^\d{6}$/.test(pincode)) {
    alert("Pincode must be 6 digits.");
    return;
  }

  const address = {
    name,
    phone,
    line,
    city,
    state,
    pincode,
  };

  const items = cart.map((id) => store.products.find((p) => p.id === id)).filter(Boolean);
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const user = getUserById(currentUser.id);

  if (user.wallet < total) {
    alert("Not enough coins in wallet.");
    return;
  }

  user.wallet -= total;
  store.carts[currentUser.id] = [];

  if (!store.purchases[currentUser.id]) store.purchases[currentUser.id] = [];
  if (!store.tracking[currentUser.id]) store.tracking[currentUser.id] = [];

  const orderId = `ORD-${Date.now()}`;
  const purchasedAt = new Date().toLocaleString();

  store.purchases[currentUser.id].push({
    orderId,
    items,
    total,
    purchasedAt,
    shippingAddress: address,
  });

  store.tracking[currentUser.id].push({
    orderId,
    status: "Order Placed",
    location: `${address.city}, ${address.state}`,
    updatedAt: purchasedAt,
  });

  saveData();
  renderResellerData();
  alert(`Checkout successful! Order ${orderId} created.`);
}

function renderPurchaseRecords() {
  const box = document.getElementById("purchaseRecords");
  const records = store.purchases[currentUser.id] || [];
  if (!records.length) {
    box.innerHTML = '<p class="muted">No purchases yet.</p>';
    return;
  }

  box.innerHTML = records
    .slice()
    .reverse()
    .map(
      (r) => `<div class="record">
        <strong>${r.orderId}</strong>
        ${r.items
          .map(
            (it) => `<div class="purchase-item"><img src="${it.image || fallbackImage}" alt="${it.name}" /> <span>${
              it.name
            }</span></div>`
          )
          .join("")}
        <small>${r.purchasedAt}</small>
        <div>Total: ${r.total} coins</div>
      </div>`
    )
    .join("");
}

function renderTrackingRecords() {
  const box = document.getElementById("trackingRecords");
  const records = store.tracking[currentUser.id] || [];
  if (!records.length) {
    box.innerHTML = '<p class="muted">No tracking updates yet.</p>';
    return;
  }

  box.innerHTML = records
    .slice()
    .reverse()
    .map(
      (t) => `<div class="record">
        <strong>${t.orderId}</strong>
        <div>Status: ${t.status}</div>
        <div>Location: ${t.location}</div>
        <small>Updated: ${t.updatedAt}</small>
      </div>`
    )
    .join("");
}

function createUser(event) {
  event.preventDefault();
  const id = document.getElementById("newUserId").value.trim();
  const password = document.getElementById("newUserPassword").value;

  if (!id || !password) return;
  if (getUserById(id)) {
    alert("User ID already exists.");
    return;
  }

  store.users.push({ id, password, role: "reseller", wallet: 0 });
  saveData();
  event.target.reset();
  renderAdminData();
  alert("Reseller user created.");
}

function deleteResellerUser(userId) {
  if (!userId) return;
  const confirmDelete = window.confirm(`Delete reseller ${userId}? This cannot be undone.`);
  if (!confirmDelete) return;

  store.users = store.users.filter((user) => !(user.id === userId && user.role === "reseller"));
  delete store.carts[userId];
  delete store.purchases[userId];
  delete store.tracking[userId];
  saveData();
  renderAdminData();
}

function addProduct(event) {
  event.preventDefault();
  createProduct(event).catch((error) => {
    alert(error.message || "Unable to upload product image.");
  });
}

async function createProduct(event) {
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value;
  const price = Number(document.getElementById("productPrice").value);
  const details = document.getElementById("productDetails").value.trim();
  const imageUrl = document.getElementById("productImage").value.trim();
  const imageFile = productImageFileInput.files[0];
  let image = imageUrl;

  if (imageFile) {
    image = await fileToDataUrl(imageFile);
  }

  if (!image) {
    image = fallbackImage;
  }

  if (!name || !category || !price || !details) return;

  store.products.push({
    id: store.nextProductId++,
    name,
    category,
    price,
    details,
    image,
  });

  saveData();
  event.target.reset();
  uploadFileName.textContent = "No file selected (you can still use image URL)";
  alert("Product uploaded.");
}

function fileToDataUrl(file) {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Please upload an image file only."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("File read failed. Please retry."));
    reader.readAsDataURL(file);
  });
}

function updateSelectedFileName() {
  const file = productImageFileInput.files[0];
  uploadFileName.textContent = file ? `Selected file: ${file.name}` : "No file selected (you can still use image URL)";
}

function addCoins(event) {
  event.preventDefault();
  const userId = document.getElementById("walletUser").value;
  const amount = Number(document.getElementById("coinAmount").value);
  if (!userId || !amount || amount < 1) return;

  const user = getUserById(userId);
  if (!user || user.role !== "reseller") return;

  user.wallet += amount;
  saveData();
  event.target.reset();
  renderAdminData();
  alert(`${amount} coins added to ${user.id}.`);
}

function changeAdminPassword(event) {
  event.preventDefault();
  const newPass = document.getElementById("newAdminPassword").value;
  if (!newPass || newPass.length < 4) {
    alert("Admin password must be at least 4 characters.");
    return;
  }

  const admin = getUserById("admin");
  admin.password = newPass;
  saveData();
  event.target.reset();
  renderAdminData();
  alert("Admin login password updated.");
}

function changeGatePasskey(event) {
  event.preventDefault();
  const newPasskey = document.getElementById("newGatePassword").value;
  if (!newPasskey || newPasskey.length < 4) {
    alert("Gate passkey must be at least 4 characters.");
    return;
  }

  store.settings.adminGatePasskey = newPasskey;
  saveData();
  event.target.reset();
  alert("Admin gate passkey updated.");
}

function bindEvents() {
  document.getElementById("adminGateForm").addEventListener("submit", unlockAdminGate);
  document.getElementById("loginForm").addEventListener("submit", login);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("createUserForm").addEventListener("submit", createUser);
  document.getElementById("productForm").addEventListener("submit", addProduct);
  document.getElementById("walletForm").addEventListener("submit", addCoins);
  document.getElementById("checkoutBtn").addEventListener("click", checkout);
  document.getElementById("clearCartBtn").addEventListener("click", clearCart);
  document.getElementById("changeAdminPasswordForm").addEventListener("submit", changeAdminPassword);
  document.getElementById("changeGatePasswordForm").addEventListener("submit", changeGatePasskey);
  document.getElementById("shippingForm").addEventListener("submit", saveShippingAddress);
  productImageFileInput.addEventListener("change", updateSelectedFileName);

  window.addEventListener("storage", () => {
    if (currentUser && currentUser.role === "reseller") {
      renderResellerData();
    }
  });
}

bindEvents();
updateLoginModeUI();
saveData();
