#!/usr/bin/env sh
set -eu

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl start postgresql
  sudo systemctl enable postgresql
else
  service postgresql start
fi

echo "[db:start] PostgreSQL iniciado/verificado."
