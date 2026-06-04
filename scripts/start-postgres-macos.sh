#!/usr/bin/env sh
set -eu

if command -v brew >/dev/null 2>&1; then
  brew services start postgresql@18 || brew services start postgresql@17 || brew services start postgresql@16 || brew services start postgresql
else
  echo "Homebrew não encontrado. Inicie o PostgreSQL manualmente e rode npm run db:check."
  exit 1
fi

echo "[db:start] PostgreSQL iniciado/verificado."
