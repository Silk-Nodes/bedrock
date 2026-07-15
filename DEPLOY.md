# Deploying Bedrock web to the VM

The frontend is a Next.js 16 app served by `next start` (Node) behind Caddy,
which terminates TLS for `bedrock.silknodes.io`. Most pages are static; the
live-data pages (Today, ICF treasury, Community) use 5-minute ISR, so a Node
server is required (not a static export).

## Prerequisites on the VM (already provisioned in Phase 0)
- Node.js + pnpm (corepack or global)
- Caddy (reverse proxy + auto-TLS)
- A service user, e.g. `bedrock`

## 1. Get the code onto the VM
```bash
sudo mkdir -p /opt/bedrock/web
sudo chown -R bedrock:bedrock /opt/bedrock/web
# as the bedrock user:
git clone <repo-url> /opt/bedrock/web      # or: git -C /opt/bedrock/web pull
cd /opt/bedrock/web
```

## 2. Install + build (on the VM)
```bash
pnpm install --frozen-lockfile
pnpm build
```
Build needs ~1.5 GB RAM; the Phase-0 swap covers small VMs.

## 3. Run as a service
```bash
sudo cp deploy/bedrock-web.service /etc/systemd/system/
# edit WorkingDirectory / User in the unit if they differ
sudo systemctl daemon-reload
sudo systemctl enable --now bedrock-web
sudo systemctl status bedrock-web      # should be active, listening on 127.0.0.1:3000
curl -sI http://127.0.0.1:3000 | head   # 200 OK
```

## 4. Reverse proxy + TLS (Caddy)
Point DNS first: an A record for `bedrock.silknodes.io` -> the VM's public IP.
Then:
```bash
# append the block from deploy/Caddyfile.bedrock to /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```
Caddy fetches the Let's Encrypt cert automatically once DNS resolves.

## 5. Redeploys
```bash
cd /opt/bedrock/web && git pull && pnpm install --frozen-lockfile && pnpm build \
  && sudo systemctl restart bedrock-web
```

## Notes
- The live on-chain fetches (burn, ICF, community pool) call public Cosmos REST
  endpoints with a snapshot fallback, so the site renders even if those are down.
- No secrets/.env are required for the frontend today. When the indexer-backed
  API is wired, add its base URL via an env var and reference it in the service unit.
