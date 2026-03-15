# Zivora Cloth Reseller Store

A reseller-only ecommerce app for kids wear, womens wear, mens wear, and jewellary with:

- Admin-managed login IDs (no signup)
- Wallet coins system for resellers
- Cart + checkout flow
- Separate bank ledger tracking from wallet balance
- Purchase history + tracking location
- Admin panel for user/product/order management

## Run locally (Flask app)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open: `http://localhost:5000`

Default admin login:
- username: `admin`
- password: `admin123`

## Cloudflare deploy compatibility

This repo now includes a minimal Cloudflare Worker (`worker.js`) and `wrangler.toml` so `npx wrangler deploy` succeeds in platforms expecting a Worker entrypoint.

- Worker root route (`/`) shows a landing page.
- Worker `/health` returns JSON.
- Full ecommerce/admin functionality remains in the Flask app for local/server deployment.
