export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      });
    }

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Zivora Cloth Store</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #f4f4f8; color: #222; }
      main { max-width: 900px; margin: 40px auto; background: #fff; padding: 24px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,.1); }
      h1 { margin-top: 0; }
      code { background: #f1f1f1; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Zivora Cloth Reseller Store</h1>
      <p>This repository contains a Flask application for the full reseller workflow (admin panel, wallet coins, products, cart, and order tracking).</p>
      <p>For local run, start Flask with <code>python app.py</code> and open <code>http://localhost:5000</code>.</p>
      <p>Worker health endpoint: <code>/health</code></p>
    </main>
  </body>
</html>`;

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
};
