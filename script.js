const STORAGE_KEY = "zivora_store_data_v1";
const CATEGORY_LABELS = {
  kids: "Kids Wear",
  women: "Women's Wear",
  men: "Men's Wear",
  jewellery: "Jewellery",
};

const defaultData = {
  users: [
    { id: "admin", password: "admin123", role: "admin", wallet: 0 },
    { id: "reseller01", password: "reseller123", role: "reseller", wallet: 2500 },
  ],
  products: [
    { id: 1, name: "Kids Cartoon T-Shirt", category: "kids", price: 250, details: "Soft cotton for daily wear" },
    { id: 2, name: "Women Night Suit Set", category: "women", price: 650, details: "Satin finish 2-piece" },
    { id: 3, name: "Men Cotton T-Shirt", category: "men", price: 390, details: "Breathable and regular fit" },
    { id: 4, name: "Artificial Stone Necklace", category: "jewellery", price: 470, details: "Lightweight festive design" },
    { id: 5, name: "Women Coat Set", category: "women", price: 1200, details: "Premium winter combo" },
  ],
  carts: {},
  purchases: {},
  tracking: {},
  bankBalance: 0,
  nextProductId: 6,
};

let store = loadData();
let currentUser = null;

const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");
const adminPanel = document.getElementById("adminPanel");
const resellerPanel = document.getElementById("resellerPanel");
const welcomeText = document.getElementById("welcomeText");
const loginMessage = document.getElementById("loginMessage");

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return structuredClone(defaultData);
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return structuredClone(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getUserById(userId) {
  return store.users.find((u) => u.id === userId);
}

function login(event) {
  event.preventDefault();
  const id = document.getElementById("userId").value.trim();
  const password = document.getElementById("password").value;
  const user = getUserById(id);

  if (!user || user.password !== password) {
    loginMessage.textContent = "Invalid credentials or unauthorized access.";
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
  loginSection.classList.remove("hidden");
}

function renderRolePanel() {
  if (!currentUser) return;
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
    option.textContent = `${u.id} (wallet: ${u.wallet} coins)`;
    walletUser.appendChild(option);
  });

  document.getElementById("bankBalance").textContent = `₹${store.bankBalance.toLocaleString("en-IN")}`;

  const rows = store.users
    .map(
      (u) => `<tr>
        <td>${u.id}</td>
        <td>${u.role}</td>
        <td>${u.wallet} coins</td>
      </tr>`
    )
    .join("");

  document.getElementById("usersTableWrap").innerHTML = `
    <table class="table">
      <thead><tr><th>User ID</th><th>Role</th><th>Wallet</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderResellerData() {
  const user = getUserById(currentUser.id);
  currentUser = user;
  document.getElementById("walletBalance").textContent = `${user.wallet} 🪙`;
  renderCatalog();
  renderCartSummary();
  renderPurchaseRecords();
  renderTrackingRecords();
}

function renderCatalog() {
  const catalog = document.getElementById("catalog");
  catalog.innerHTML = "";

  Object.entries(CATEGORY_LABELS).forEach(([key, label]) => {
    const products = store.products.filter((p) => p.category === key);

    const col = document.createElement("div");
    col.className = "category-column";
    col.innerHTML = `<h4>${label}</h4>`;

    if (!products.length) {
      const empty = document.createElement("div");
      empty.className = "product-item muted";
      empty.textContent = "No products added yet.";
      col.appendChild(empty);
    }

    products.forEach((p) => {
      const item = document.createElement("div");
      item.className = "product-item";
      item.innerHTML = `
        <strong>${p.name}</strong>
        <small>${p.details}</small>
        <p>${p.price} coins</p>
        <button data-product-id="${p.id}">Add to Cart</button>
      `;
      item.querySelector("button").addEventListener("click", () => addToCart(p.id));
      col.appendChild(item);
    });

    catalog.appendChild(col);
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

  const items = cart.map((id) => store.products.find((p) => p.id === id)).filter(Boolean);
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const user = getUserById(currentUser.id);

  if (user.wallet < total) {
    alert("Not enough coins in wallet.");
    return;
  }

  user.wallet -= total;
  store.bankBalance += total;
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
  });

  store.tracking[currentUser.id].push({
    orderId,
    status: "Dispatched",
    location: "Dealer Warehouse",
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
        <div>${r.items.map((it) => it.name).join(", ")}</div>
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

function addProduct(event) {
  event.preventDefault();
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value;
  const price = Number(document.getElementById("productPrice").value);
  const details = document.getElementById("productDetails").value.trim();

  if (!name || !category || !price || !details) return;

  store.products.push({
    id: store.nextProductId++,
    name,
    category,
    price,
    details,
  });

  saveData();
  event.target.reset();
  alert("Product uploaded.");
}

function addCoins(event) {
  event.preventDefault();
  const userId = document.getElementById("walletUser").value;
  const amount = Number(document.getElementById("coinAmount").value);
  if (!userId || !amount) return;

  const user = getUserById(userId);
  if (!user || user.role !== "reseller") return;

  user.wallet += amount;
  saveData();
  event.target.reset();
  renderAdminData();
  alert(`${amount} coins added to ${user.id}.`);
}

function bindEvents() {
  document.getElementById("loginForm").addEventListener("submit", login);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("createUserForm").addEventListener("submit", createUser);
  document.getElementById("productForm").addEventListener("submit", addProduct);
  document.getElementById("walletForm").addEventListener("submit", addCoins);
  document.getElementById("checkoutBtn").addEventListener("click", checkout);
  document.getElementById("clearCartBtn").addEventListener("click", clearCart);
}

bindEvents();
