# Zivora Cloth Reseller Store

A reseller-only ecommerce app for kids wear, womens wear, mens wear, and jewellary with:

- Admin-managed login IDs (no signup)
- Wallet coins system for resellers
- Cart + checkout flow
- Separate bank ledger tracking from wallet balance
- Purchase history + tracking location
- Admin panel for user/product/order management

## Run locally

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
