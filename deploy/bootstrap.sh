#!/usr/bin/env bash
# Idempotent server setup and deploy, run over SSH by .github/workflows/deploy.yml
# (or by hand: `ssh ubuntu@HOST 'bash -s' < deploy/bootstrap.sh`). Safe to rerun.
set -euo pipefail

REPO=https://github.com/riccardopontalti/dovearrivo.git
DIR=/srv/dovearrivo
DOMAIN=${DOMAIN:-dovearrivo.it}
PREVIEW=${PREVIEW:-true}
REF=${REF:-main}

log() { echo "[bootstrap] $*"; }

# The script reaches the server on standard input (ssh 'bash -s' < bootstrap.sh). Bash must
# read all of it before running anything, otherwise a command that reads stdin (such as
# `docker compose run`) swallows the rest of the script and the deploy stops silently.
main() {
	if ! command -v docker > /dev/null; then
		log "installing Docker"
		sudo apt-get update -q
		sudo apt-get install -y -q ca-certificates curl git ufw
		sudo install -m 0755 -d /etc/apt/keyrings
		sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
		echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
		sudo apt-get update -q
		sudo apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
	fi

	if ! sudo ufw status | grep -q "Status: active"; then
		log "enabling the firewall (SSH, HTTP, HTTPS)"
		sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp
		sudo ufw --force enable
	fi

	if ! sudo swapon --show | grep -q /swapfile; then
		log "adding 2 GB swap"
		sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
		grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
	fi

	if [ ! -d "$DIR/.git" ]; then
		log "cloning the repository"
		sudo git clone "$REPO" "$DIR"
	fi
	sudo git -C "$DIR" fetch -q origin
	sudo git -C "$DIR" checkout -q "$REF"
	sudo git -C "$DIR" reset -q --hard "origin/$REF"

	cd "$DIR/deploy"
	printf 'DOMAIN=%s\nPREVIEW=%s\n' "$DOMAIN" "$PREVIEW" | sudo tee .env > /dev/null
	sudo mkdir -p ../data && sudo chown -R 1000:1000 ../data

	log "building images"
	sudo docker compose build -q

	if [ ! -f ../data/basemap/basemap.json ]; then
		log "building the basemap (first run)"
		sudo docker compose --profile jobs run --rm -T basemap < /dev/null
	fi
	if [ ! -e ../data/pipeline/active/manifest.json ]; then
		log "building the first data snapshot (first run, downloads about 650 MB)"
		sudo docker compose --profile jobs run --rm -T pipeline < /dev/null
		sudo rm -f ../data/pipeline/promoted
	fi

	log "starting the stack"
	sudo docker compose up -d --remove-orphans

	sudo cp systemd/dovearrivo-update.service systemd/dovearrivo-update.timer /etc/systemd/system/
	sudo systemctl daemon-reload
	sudo systemctl enable --now dovearrivo-update.timer > /dev/null

	log "checking that the app answers"
	for _ in $(seq 1 30); do
		if sudo docker compose exec -T app node -e "fetch('http://127.0.0.1:3000/api/v1/data-status').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))" < /dev/null; then
			log "done: https://$DOMAIN"
			exit 0
		fi
		sleep 5
	done
	log "the app does not answer; recent logs:"
	sudo docker compose logs --tail 80 app motis caddy < /dev/null
	exit 1
}

main "$@"
