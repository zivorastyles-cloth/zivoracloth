const DB_KEY = "zivoraStoreData";
const SESSION_KEY = "zivoraSession";
const CATEGORIES = ["kids wear", "womens wear", "mens wear", "jewellary"];

function defaultState() {
  return {
    users: [{ id: 1, username: "admin", password: "admin123", role: "admin", walletCoins: 0 }],
    products: [],
    orders: [],
    bankLedger: [],
    counters: { user: 2, product: 1, order: 1 }
  };
}

function loadState() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const seeded = defaultState();
    saveState(seeded);
    return seeded;
  }
  return JSON.parse(raw);
}

function saveState(state) {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

function flash(message, type = "success") {
  const el = document.getElementById("flash");
  el.className = `flash ${type}`;
  el.textContent = message;
  setTimeout(() => el.classList.add("hidden"), 2600);
  el.classList.remove("hidden");
}

function qs(id) { return document.getElementById(id); }

function render() {
  const state = loadState();
  const session = getSession();

  qs("loginView").classList.add("hidden");
  qs("adminView").classList.add("hidden");
  qs("resellerView").classList.add("hidden");
  qs("logoutBtn").classList.add("hidden");

  if (!session) {
    qs("loginView").classList.remove("hidden");
    return;
  }

  const currentUser = state.users.find((u) => u.id === session.userId);
  if (!currentUser) {
    setSession(null);
    render();
    return;
  }

  qs("logoutBtn").classList.remove("hidden");

  if (currentUser.role === "admin") {
    renderAdmin(state);
    qs("adminView").classList.remove("hidden");
  } else {
    renderReseller(state, currentUser);
    qs("resellerView").classList.remove("hidden");
  }
}

function renderAdmin(state) {
  const resellers = state.users.filter((u) => u.role === "reseller");
  const topupUser = qs("topupUser");
  topupUser.innerHTML = "<option value=''>Select reseller</option>" +
    resellers.map((u) => `<option value="${u.id}">${u.username} (${u.walletCoins} coins)</option>`).join("");

  qs("resellerTable").innerHTML = resellers.length
    ? resellers.map((u) => `<tr><td>${u.id}</td><td>${u.username}</td><td>${u.walletCoins}</td></tr>`).join("")
    : "<tr><td colspan='3'>No resellers yet.</td></tr>";

  qs("productTable").innerHTML = state.products.length
    ? state.products.map((p) => `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.category}</td><td>${p.priceCoins}</td><td>${p.stock}</td></tr>`).join("")
    : "<tr><td colspan='5'>No products yet.</td></tr>";

  const totalBank = state.bankLedger.reduce((sum, x) => sum + x.amountCoins, 0);
  qs("bankTotal").textContent = String(totalBank);

  qs("adminOrders").innerHTML = state.orders.length
    ? state.orders.map((o) => {
      const user = state.users.find((u) => u.id === o.userId);
      return `<div class="inline-order">
        <div><strong>Order #${o.id}</strong> | ${user?.username || "Unknown"} | ${o.totalCoins} coins</div>
        <div class="hint">Status: ${o.status} | Location: ${o.trackingLocation}</div>
        <div class="order-controls">
          <input id="status-${o.id}" value="${o.status}" />
          <input id="location-${o.id}" value="${o.trackingLocation}" />
          <button class="small-btn" onclick="updateOrder(${o.id})">Update</button>
        </div>
      </div>`;
    }).join("")
    : "<p>No orders yet.</p>";
}

function renderReseller(state, user) {
  qs("walletCoins").textContent = String(user.walletCoins);

  const cart = user.cart || {};
  const columns = qs("categoryColumns");
  columns.innerHTML = CATEGORIES.map((category) => {
    const products = state.products.filter((p) => p.category === category && p.stock > 0);
    return `<article class="card"><h4>${category}</h4>${products.length ? products.map((p) => `
      <div class="product">
        <strong>${p.name}</strong>
        <p>${p.description || "No description"}</p>
        <p>${p.priceCoins} coins | Stock ${p.stock}</p>
        <label>Qty <input id="qty-${p.id}" type="number" min="1" value="1"></label>
        <button onclick="addToCart(${p.id})">Add to Cart</button>
      </div>
    `).join("") : "<p>No products.</p>"}</article>`;
  }).join("");

  const cartLines = Object.entries(cart).map(([pid, qty]) => {
    const product = state.products.find((p) => p.id === Number(pid));
    if (!product) return null;
    const subtotal = qty * product.priceCoins;
    return { pid: Number(pid), qty, name: product.name, subtotal };
  }).filter(Boolean);

  qs("cartItems").innerHTML = cartLines.length
    ? cartLines.map((line) => `<p>${line.name} x ${line.qty} = ${line.subtotal} coins <button onclick="removeFromCart(${line.pid})">Remove</button></p>`).join("")
    : "<p>Cart is empty.</p>";

  const total = cartLines.reduce((sum, l) => sum + l.subtotal, 0);
  qs("cartTotal").textContent = String(total);

  const myOrders = state.orders.filter((o) => o.userId === user.id);
  qs("resellerOrders").innerHTML = myOrders.length
    ? myOrders.map((o) => `<p>Order #${o.id} | ${o.totalCoins} coins | ${o.status} | Location: ${o.trackingLocation}</p>`).join("")
    : "<p>No purchases yet.</p>";
}

function withState(mutator) {
  const state = loadState();
  mutator(state);
  saveState(state);
  render();
}

qs("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = qs("loginUsername").value.trim();
  const password = qs("loginPassword").value;
  const state = loadState();
  const user = state.users.find((u) => u.username === username && u.password === password);
  if (!user) return flash("Invalid credentials.", "error");
  setSession({ userId: user.id });
  flash("Login successful.");
  render();
});

qs("logoutBtn").addEventListener("click", () => {
  setSession(null);
  flash("Logged out.");
  render();
});

qs("createResellerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  withState((state) => {
    const username = qs("resellerUsername").value.trim();
    const password = qs("resellerPassword").value.trim();
    if (!username || !password) return flash("Username and password required.", "error");
    if (state.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return flash("Username already exists.", "error");
    }
    state.users.push({ id: state.counters.user++, username, password, role: "reseller", walletCoins: 0, cart: {} });
    qs("createResellerForm").reset();
    flash("Reseller created.");
  });
});

qs("topupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  withState((state) => {
    const userId = Number(qs("topupUser").value);
    const coins = Number(qs("topupCoins").value);
    const user = state.users.find((u) => u.id === userId && u.role === "reseller");
    if (!user || coins <= 0) return flash("Select a reseller and valid coin value.", "error");
    user.walletCoins += coins;
    qs("topupForm").reset();
    flash(`Uploaded ${coins} coins to ${user.username}.`);
  });
});

qs("productForm").addEventListener("submit", (e) => {
  e.preventDefault();
  withState((state) => {
    const name = qs("productName").value.trim();
    const category = qs("productCategory").value;
    const priceCoins = Number(qs("productPrice").value);
    const stock = Number(qs("productStock").value);
    const description = qs("productDesc").value.trim();
    if (!name || !CATEGORIES.includes(category) || priceCoins <= 0 || stock < 0) {
      return flash("Enter valid product details.", "error");
    }
    state.products.push({ id: state.counters.product++, name, category, priceCoins, stock, description });
    qs("productForm").reset();
    flash("Product created.");
  });
});

window.updateOrder = (orderId) => {
  withState((state) => {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return flash("Order not found.", "error");
    const status = qs(`status-${orderId}`).value.trim();
    const trackingLocation = qs(`location-${orderId}`).value.trim();
    if (!status || !trackingLocation) return flash("Status and location required.", "error");
    order.status = status;
    order.trackingLocation = trackingLocation;
    flash("Order updated.");
  });
};

window.addToCart = (productId) => {
  withState((state) => {
    const session = getSession();
    const user = state.users.find((u) => u.id === session?.userId && u.role === "reseller");
    const product = state.products.find((p) => p.id === productId);
    const qty = Number(qs(`qty-${productId}`).value);
    if (!user || !product || qty <= 0) return flash("Invalid cart request.", "error");
    const currentQty = user.cart?.[productId] || 0;
    if (currentQty + qty > product.stock) return flash("Stock not sufficient.", "error");
    user.cart = user.cart || {};
    user.cart[productId] = currentQty + qty;
    flash("Added to cart.");
  });
};

window.removeFromCart = (productId) => {
  withState((state) => {
    const session = getSession();
    const user = state.users.find((u) => u.id === session?.userId && u.role === "reseller");
    if (!user?.cart?.[productId]) return;
    delete user.cart[productId];
    flash("Item removed from cart.");
  });
};

qs("checkoutBtn").addEventListener("click", () => {
  withState((state) => {
    const session = getSession();
    const user = state.users.find((u) => u.id === session?.userId && u.role === "reseller");
    if (!user) return flash("Reseller session not found.", "error");
    const cartEntries = Object.entries(user.cart || {});
    if (!cartEntries.length) return flash("Cart is empty.", "error");

    let total = 0;
    for (const [pid, qty] of cartEntries) {
      const product = state.products.find((p) => p.id === Number(pid));
      if (!product) return flash("A product in cart no longer exists.", "error");
      if (product.stock < qty) return flash(`Not enough stock for ${product.name}.`, "error");
      total += product.priceCoins * qty;
    }

    if (user.walletCoins < total) return flash("Not enough wallet coins.", "error");

    for (const [pid, qty] of cartEntries) {
      const product = state.products.find((p) => p.id === Number(pid));
      product.stock -= qty;
    }

    user.walletCoins -= total;
    const orderId = state.counters.order++;
    state.orders.push({
      id: orderId,
      userId: user.id,
      items: cartEntries.map(([pid, qty]) => ({ productId: Number(pid), qty })),
      totalCoins: total,
      status: "Packed",
      trackingLocation: "Warehouse"
    });
    state.bankLedger.push({ source: "reseller_checkout", amountCoins: total, note: `Order #${orderId}` });
    user.cart = {};
    flash(`Checkout complete. Order #${orderId} created.`);
  });
});

render();
