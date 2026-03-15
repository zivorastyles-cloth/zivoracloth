import os
import sqlite3
from datetime import datetime
from functools import wraps

from flask import Flask, flash, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "store.db")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")


CATEGORY_OPTIONS = ["kids wear", "womens wear", "mens wear", "jewellary"]


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    cur = db.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'reseller')),
            wallet_coins INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price_coins INTEGER NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            description TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_coins INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Packed',
            tracking_location TEXT NOT NULL DEFAULT 'Warehouse',
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price_coins INTEGER NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS bank_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            amount_coins INTEGER NOT NULL,
            note TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );
        """
    )
    admin_exists = cur.execute("SELECT id FROM users WHERE role='admin' LIMIT 1").fetchone()
    if not admin_exists:
        cur.execute(
            "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, 'admin', ?)",
            ("admin", generate_password_hash("admin123"), datetime.utcnow().isoformat()),
        )
    db.commit()
    db.close()


def login_required(role=None):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user_id = session.get("user_id")
            if not user_id:
                flash("Please login first.", "error")
                return redirect(url_for("login"))

            user = get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if not user:
                session.clear()
                flash("Session expired. Login again.", "error")
                return redirect(url_for("login"))

            if role and user["role"] != role:
                flash("You do not have permission to access this page.", "error")
                return redirect(url_for("dashboard"))

            g.current_user = user
            return func(*args, **kwargs)

        return wrapper

    return decorator


@app.route("/")
def home():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"]
        user = get_db().execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if user and check_password_hash(user["password_hash"], password):
            session["user_id"] = user["id"]
            flash("Logged in successfully.", "success")
            return redirect(url_for("dashboard"))
        flash("Invalid credentials.", "error")
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    flash("Logged out.", "success")
    return redirect(url_for("login"))


@app.route("/dashboard")
@login_required()
def dashboard():
    user = g.current_user
    db = get_db()
    if user["role"] == "admin":
        resellers = db.execute("SELECT * FROM users WHERE role='reseller' ORDER BY id DESC").fetchall()
        products = db.execute("SELECT * FROM products ORDER BY id DESC").fetchall()
        orders = db.execute(
            """
            SELECT o.*, u.username
            FROM orders o
            JOIN users u ON u.id = o.user_id
            ORDER BY o.id DESC
            """
        ).fetchall()
        bank_total = db.execute("SELECT COALESCE(SUM(amount_coins), 0) AS total FROM bank_ledger").fetchone()["total"]
        return render_template(
            "admin_dashboard.html",
            resellers=resellers,
            products=products,
            orders=orders,
            bank_total=bank_total,
            categories=CATEGORY_OPTIONS,
        )

    products_by_category = {}
    for category in CATEGORY_OPTIONS:
        products_by_category[category] = db.execute(
            "SELECT * FROM products WHERE category = ? AND stock > 0 ORDER BY id DESC", (category,)
        ).fetchall()

    orders = db.execute(
        "SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC", (user["id"],)
    ).fetchall()
    cart = session.get("cart", {})
    cart_count = sum(cart.values())
    return render_template(
        "reseller_dashboard.html",
        products_by_category=products_by_category,
        orders=orders,
        wallet_coins=user["wallet_coins"],
        cart_count=cart_count,
    )


@app.post("/admin/users/create")
@login_required(role="admin")
def create_reseller():
    username = request.form["username"].strip()
    password = request.form["password"].strip()
    if not username or not password:
        flash("Username and password are required.", "error")
        return redirect(url_for("dashboard"))

    try:
        get_db().execute(
            "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, 'reseller', ?)",
            (username, generate_password_hash(password), datetime.utcnow().isoformat()),
        )
        get_db().commit()
        flash("Reseller created.", "success")
    except sqlite3.IntegrityError:
        flash("Username already exists.", "error")
    return redirect(url_for("dashboard"))


@app.post("/admin/wallet/topup")
@login_required(role="admin")
def topup_wallet():
    user_id = request.form.get("user_id", type=int)
    coins = request.form.get("coins", type=int)
    if not user_id or not coins or coins <= 0:
        flash("Enter valid reseller and coins.", "error")
        return redirect(url_for("dashboard"))

    db = get_db()
    reseller = db.execute("SELECT * FROM users WHERE id = ? AND role = 'reseller'", (user_id,)).fetchone()
    if not reseller:
        flash("Reseller not found.", "error")
        return redirect(url_for("dashboard"))

    db.execute("UPDATE users SET wallet_coins = wallet_coins + ? WHERE id = ?", (coins, user_id))
    db.commit()
    flash(f"Added {coins} coins to {reseller['username']}.", "success")
    return redirect(url_for("dashboard"))


@app.post("/admin/products/create")
@login_required(role="admin")
def create_product():
    name = request.form["name"].strip()
    category = request.form["category"].strip().lower()
    price = request.form.get("price_coins", type=int)
    stock = request.form.get("stock", type=int)
    description = request.form.get("description", "").strip()

    if category not in CATEGORY_OPTIONS:
        flash("Invalid category.", "error")
        return redirect(url_for("dashboard"))
    if not name or not price or price <= 0 or stock is None or stock < 0:
        flash("Provide valid product details.", "error")
        return redirect(url_for("dashboard"))

    db = get_db()
    db.execute(
        """
        INSERT INTO products (name, category, price_coins, stock, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (name, category, price, stock, description, datetime.utcnow().isoformat()),
    )
    db.commit()
    flash("Product created.", "success")
    return redirect(url_for("dashboard"))


@app.post("/admin/orders/<int:order_id>/update")
@login_required(role="admin")
def update_order(order_id):
    status = request.form.get("status", "Packed").strip()
    location = request.form.get("tracking_location", "Warehouse").strip()
    if not status or not location:
        flash("Status and location are required.", "error")
        return redirect(url_for("dashboard"))

    db = get_db()
    db.execute("UPDATE orders SET status = ?, tracking_location = ? WHERE id = ?", (status, location, order_id))
    db.commit()
    flash("Order updated.", "success")
    return redirect(url_for("dashboard"))


@app.post("/cart/add/<int:product_id>")
@login_required(role="reseller")
def add_to_cart(product_id):
    qty = request.form.get("qty", type=int) or 1
    if qty <= 0:
        flash("Invalid quantity.", "error")
        return redirect(url_for("dashboard"))

    product = get_db().execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if not product:
        flash("Product not found.", "error")
        return redirect(url_for("dashboard"))

    cart = session.get("cart", {})
    key = str(product_id)
    cart[key] = cart.get(key, 0) + qty
    session["cart"] = cart
    flash("Added to cart.", "success")
    return redirect(url_for("dashboard"))


@app.route("/cart")
@login_required(role="reseller")
def view_cart():
    db = get_db()
    cart = session.get("cart", {})
    items = []
    total = 0
    for pid, qty in cart.items():
        product = db.execute("SELECT * FROM products WHERE id = ?", (int(pid),)).fetchone()
        if not product:
            continue
        subtotal = product["price_coins"] * qty
        total += subtotal
        items.append({"product": product, "qty": qty, "subtotal": subtotal})

    user = db.execute("SELECT * FROM users WHERE id = ?", (g.current_user["id"],)).fetchone()
    return render_template("cart.html", items=items, total=total, wallet=user["wallet_coins"])


@app.post("/cart/checkout")
@login_required(role="reseller")
def checkout():
    db = get_db()
    cart = session.get("cart", {})
    if not cart:
        flash("Your cart is empty.", "error")
        return redirect(url_for("view_cart"))

    products = {}
    total = 0
    for pid, qty in cart.items():
        product = db.execute("SELECT * FROM products WHERE id = ?", (int(pid),)).fetchone()
        if not product:
            flash("One product in cart was removed.", "error")
            return redirect(url_for("view_cart"))
        if product["stock"] < qty:
            flash(f"Insufficient stock for {product['name']}.", "error")
            return redirect(url_for("view_cart"))
        products[int(pid)] = product
        total += product["price_coins"] * qty

    user = db.execute("SELECT * FROM users WHERE id = ?", (g.current_user["id"],)).fetchone()
    if user["wallet_coins"] < total:
        flash("Not enough wallet coins.", "error")
        return redirect(url_for("view_cart"))

    order_cursor = db.execute(
        "INSERT INTO orders (user_id, total_coins, created_at) VALUES (?, ?, ?)",
        (user["id"], total, datetime.utcnow().isoformat()),
    )
    order_id = order_cursor.lastrowid

    for pid, qty in cart.items():
        product = products[int(pid)]
        db.execute(
            """
            INSERT INTO order_items (order_id, product_id, quantity, price_coins)
            VALUES (?, ?, ?, ?)
            """,
            (order_id, int(pid), qty, product["price_coins"]),
        )
        db.execute("UPDATE products SET stock = stock - ? WHERE id = ?", (qty, int(pid)))

    db.execute("UPDATE users SET wallet_coins = wallet_coins - ? WHERE id = ?", (total, user["id"]))
    db.execute(
        "INSERT INTO bank_ledger (source, amount_coins, note, created_at) VALUES (?, ?, ?, ?)",
        (
            "reseller_checkout",
            total,
            f"Order #{order_id} paid via wallet coins by user {user['username']}",
            datetime.utcnow().isoformat(),
        ),
    )
    db.commit()

    session["cart"] = {}
    flash(f"Checkout successful. Order #{order_id} created.", "success")
    return redirect(url_for("dashboard"))


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
