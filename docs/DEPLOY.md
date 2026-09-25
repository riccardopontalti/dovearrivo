# Deploying DoveArrivo (D06b)

**Automatic path (recommended).** Add two repository secrets on GitHub (Settings → Secrets and variables → Actions): `DEPLOY_HOST` = server IPv4 and `DEPLOY_SSH_KEY` = the private key whose public part was installed on the server at order time. Every push to `main` with green CI then runs [deploy.yml](../.github/workflows/deploy.yml), which executes [bootstrap.sh](../deploy/bootstrap.sh) over SSH: first run installs Docker, firewall, swap, basemap and data; later runs only update and restart. It deploys in **preview** mode (drafts visible, banner, `noindex`) until the repository variable `PREVIEW` is set to `false`. DNS (step 1 below) is still manual.

The manual steps below do the same by hand.

One VPS (OVHcloud VPS-1: 2 vCore, 4 GB, Ubuntu 24.04, x86_64) runs Caddy, the app, MOTIS and the scheduled data pipeline with Docker Compose. Everything below is run on the server as a sudo user, except the DNS step.

## 1. DNS (OVHcloud panel)

Web Cloud → Domain names → `dovearrivo.it` → DNS zone → Add an entry:
- `A` record, sub-domain empty, target = the server IPv4;
- `A` record, sub-domain `www`, same target (redirected to the apex by Caddy);
- `AAAA` records for IPv6 if the VPS has one.

## 2. Base system

```bash
sudo apt-get update && sudo apt-get -y upgrade
sudo apt-get install -y ca-certificates curl git ufw
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp && sudo ufw --force enable
# 2 GB swap: headroom for the nightly import on a 4 GB machine.
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Docker publishes ports directly and bypasses `ufw`; only Caddy publishes ports in `compose.yml`, MOTIS and the app stay on the internal network.

## 3. Code and data

```bash
sudo git clone https://github.com/riccardopontalti/dovearrivo.git /srv/dovearrivo
cd /srv/dovearrivo/deploy
sudo cp .env.example .env            # set DOMAIN if different
sudo mkdir -p ../data && sudo chown -R 1000:1000 ../data   # containers run as uid 1000
sudo docker compose build
sudo docker compose --profile jobs run --rm basemap      # ~150 MB regional basemap
sudo docker compose --profile jobs run --rm pipeline     # first snapshot (~650 MB OSM download)
sudo docker compose up -d
```

Check: `https://dovearrivo.it/data-status` shows `Aggiornati` and today's coverage; a search from "Trento. Autostaz. Dante" returns proposals once destinations are published (D11).

## 4. Scheduled updates

```bash
sudo cp /srv/dovearrivo/deploy/systemd/dovearrivo-update.* /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now dovearrivo-update.timer
systemctl list-timers dovearrivo-update.timer
```

`deploy/update.sh` runs the pipeline and restarts MOTIS only when a snapshot was promoted (a few seconds of 503 with `Retry-After`). Exit code 2 means a large change awaits review: inspect `data/pipeline/snapshots/<id>/report.json`, then run `docker compose --profile jobs run --rm pipeline node pipeline/run.ts --data /data/pipeline --accept-change`.

## 5. Rollback and updates of the app

```bash
cd /srv/dovearrivo/deploy
sudo docker compose --profile jobs run --rm pipeline node pipeline/rollback.ts --data /data/pipeline
sudo docker compose restart motis
# New app version
sudo git -C /srv/dovearrivo pull && sudo docker compose build app && sudo docker compose up -d app
```

## 6. What to measure after the first deploy

Import duration and peak memory (`docker stats` during the pipeline), MOTIS and app memory at rest, p95 search latency with 5 concurrent searches, and that the basemap is served by Caddy with byte ranges (`curl -I -H 'Range: bytes=0-10' https://dovearrivo.it/basemap/basemap.pmtiles` → 206).
