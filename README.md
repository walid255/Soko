# SokoSafi

SokoSafi is a React storefront served by Cloudflare Pages. Its Pages Functions API uses PlanetScale for users, products, and orders; Workers KV for sessions, request throttling, and marketplace settings; and R2 for product images.

## Local development

1. Install Node.js 20 or newer and run `npm install`.
2. Copy `.dev.vars.example` to `.dev.vars`. Use a **development** PlanetScale database URL and a random bootstrap token of at least 32 characters. Do not use production credentials locally.
3. Create local Pages bindings and start the app with `npm run dev`. Wrangler serves the built app at `http://localhost:8788`; local KV and R2 data are persisted under `.wrangler/`.
4. Apply `migrations/0001_initial.sql` to the development database before using the API.

`npm run build` creates the static site in `dist/`. `npm run preview` serves that build in the local Pages runtime. `npm run deploy` builds and deploys to an existing Cloudflare Pages project named `sokosafi`.

## Production setup

### 1. PlanetScale

Create a PlanetScale MySQL database and branch, then apply `migrations/0001_initial.sql` followed by `migrations/0002_vendor_product_ownership.sql` to the production branch using the PlanetScale SQL console or `pscale shell`. For an existing installation that already applied `0001`, apply only `0002` before deploying this version; it adds vendor ownership to products.

Create a PlanetScale database password with the least access needed by the application. Save its connection URL as the Pages secret `DATABASE_URL`; do not commit it or place it in a `VITE_` variable.

### 2. Cloudflare storage

Create two Workers KV namespaces and one R2 bucket (for example, `sokosafi-media`). In the Pages project, bind them with these exact names:

| Service | Pages binding |
| --- | --- |
| Workers KV for sessions | `SESSION_KV` |
| Workers KV for settings and rate limits | `APP_KV` |
| R2 bucket for product images | `MEDIA_BUCKET` |

Configure bindings separately for Production and Preview. Use separate databases and storage namespaces for Preview so preview deployments cannot change production data.

### 3. Pages project and secrets

Create a Cloudflare Pages project from this repository, with build command `npm run build` and output directory `dist`. The repository's `wrangler.jsonc` configures the Pages output directory and Workers compatibility.

In **Pages → Settings → Variables and Secrets**, add:

| Name | Type | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Secret | PlanetScale connection URL |
| `BOOTSTRAP_ADMIN_TOKEN` | Secret | One-time initial administrator creation |

The KV and R2 bindings above must also be present in both environments. After configuring the project, deploy with the Pages Git integration or `npm run deploy`.

### 4. Create the first administrator

Set `BOOTSTRAP_ADMIN_TOKEN` to a random secret with at least 32 characters. Send one same-origin request to the deployed site, using a password of at least 12 characters:

```powershell
$site = "https://your-pages-domain.example"
$token = Read-Host "Bootstrap token"
$body = @{
  fullName = "SokoSafi Administrator"
  phone = "255700000000"
  password = "use-a-unique-password-of-at-least-12-characters"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$site/api/auth/bootstrap" `
  -Headers @{ Origin = $site; "X-Bootstrap-Token" = $token } `
  -ContentType "application/json" -Body $body
```

Bootstrap is one-time: a database lock prevents subsequent attempts. Remove `BOOTSTRAP_ADMIN_TOKEN` from the Pages environment after the administrator has been created. New driver and aggregator registrations require admin approval; public registration cannot create admin accounts.

## Admin dashboard

Sign in with the initial admin account. The admin portal manages user approvals and roles, marketplace-wide settings, orders and manual payment confirmation, and product catalog entries that are not owned by a vendor. Admins can also remove unused R2 images.

Vendors manage their own product catalog from **Bidhaa Zangu / My Products**. They can add and edit product details, upload product images to R2, choose hub availability, and show or hide their own products. The API checks product ownership on every edit and archive request. Product records from the initial seed remain marketplace-wide records for the admin to manage.

The dashboard intentionally does not provision or modify Cloudflare accounts, Pages projects, namespaces, buckets, or PlanetScale infrastructure. Manage those through their provider dashboards and deployment configuration.

## Blank page after deployment

If the app does not start, the page now shows a diagnostic message rather than an empty root. In Cloudflare Pages, check that the deployment uses build command `npm run build` and output directory `dist`, then redeploy the latest commit. Check the deployment build log and browser developer tools' **Console** and **Network** tabs for failed JavaScript/CSS assets or Pages Function errors. Missing PlanetScale/KV/R2 bindings should show an in-app backend configuration error; they should not prevent the React shell from rendering.

## Payments and operational limits

No mobile-money or card payment gateway is configured. Checkout creates an `UNPAID` / `PENDING_PAYMENT` order and does **not** claim that payment succeeded or make it available to drivers. An administrator can confirm a payment only after verifying it with the payment provider outside the app. For automated production payments, integrate a provider and verify signed server-to-server webhooks before enabling automatic dispatch.

Delivery PINs are hashed at rest and shown only once when an order is placed. Preserve the PIN for handoff; it cannot be recovered from order history.
