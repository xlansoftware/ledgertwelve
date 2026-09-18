```bash
nvm install --lts
npm install

# install pi
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

```bash
docker exec -it -u vscode magical_leavitt bash
docker exec -it -u vscode festive_pare bash

```

```bash
docker run --rm -v ledger12data:/data -v $(pwd):/backup alpine sh -c "cp /data/ledger12.db /backup/ledger12_$(date +%Y%m%d_%H%M%S).db"

scp jll:/home/john/ledger12/ledger12_20260916_183533.db .

docker run --rm -v ./ledger12data:/source -v ledger12data:/data busybox cp /source/ledger12_20260916_183533.db /data/ledger12.db
```

```bash
sudo apt install sqlite3
```