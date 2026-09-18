#!/usr/bin/env bash
#
# Start the nested Docker daemon inside this dev container.
#
# The docker-in-docker feature normally starts dockerd automatically at
# container boot, but on this kernel it crashes with:
#
#   iptables ... can't initialize iptables table `nat': Table does not exist
#
# because the default iptables backend (legacy) has no NAT table here. Pointing
# dockerd at the nftables firewall backend fixes it.
#
# Run manually when needed, e.g. after a container rebuild:
#
#   .devcontainer/start-docker.sh
#
set -euo pipefail

DAEMON_JSON=/etc/docker/daemon.json
DAEMON_JSON_CONTENT='{ "firewall-backend": "nftables" }'
LOG_FILE=/tmp/dockerd.log

log() { printf '%s\n' "$*"; }

# 1. Ensure the daemon config selects the nftables firewall backend.
if sudo grep -q '"firewall-backend"[[:space:]]*:[[:space:]]*"nftables"' "$DAEMON_JSON" 2>/dev/null; then
    log "$DAEMON_JSON already sets firewall-backend=nftables"
else
    if [ -s "$DAEMON_JSON" ]; then
        log "Backing up existing $DAEMON_JSON to $DAEMON_JSON.bak"
        sudo cp "$DAEMON_JSON" "$DAEMON_JSON.bak"
    fi
    log "Writing $DAEMON_JSON"
    sudo mkdir -p "$(dirname "$DAEMON_JSON")"
    printf '%s\n' "$DAEMON_JSON_CONTENT" | sudo tee "$DAEMON_JSON" >/dev/null
fi

# 2. Start dockerd if it is not already running. The log file may exist and be
#    owned by root from a previous boot, so let root open it.
if pgrep -x dockerd >/dev/null 2>&1; then
    log "dockerd is already running"
else
    log "Starting dockerd (log: $LOG_FILE)"
    sudo sh -c "nohup dockerd >> '$LOG_FILE' 2>&1 &"
fi

# 3. Wait for the daemon to accept connections.
log "Waiting for the Docker daemon..."
for _ in $(seq 1 30); do
    if docker info >/dev/null 2>&1; then
        log "Docker is ready:"
        docker version --format '  client {{.Client.Version}} / server {{.Server.Version}}'
        exit 0
    fi
    sleep 1
done

log "ERROR: Docker did not come up. Recent daemon log:" >&2
sudo tail -n 20 "$LOG_FILE" >&2
exit 1
