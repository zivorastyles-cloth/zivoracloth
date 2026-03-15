# Zivora Cloth Reseller Store (HTML/CSS/JavaScript)

This is a reseller-only ecommerce website built with **HTML, CSS, and JavaScript only**.

## Features

- No signup flow. Login only with admin-created IDs.
- Category columns: **Kids Wear**, **Womens Wear**, **Mens Wear**, **Jewellary**.
- Admin panel to:
  - create reseller logins
  - upload coins to reseller wallet
  - upload products
  - update order status + tracking location
- Reseller panel to:
  - browse products by category
  - add products to cart
  - checkout with wallet coins
  - view purchase history and tracking
- Bank ledger is tracked separately from reseller wallets.

## Run

Because this is static HTML/CSS/JS, you can open it directly or serve it with any static server.

### Option 1: open file directly

Open `index.html` in your browser.

### Option 2: serve locally

```bash
npx serve .
```

Then open the shown URL.

## Default admin login

- username: `admin`
- password: `admin123`

> Data is stored in browser `localStorage`.
