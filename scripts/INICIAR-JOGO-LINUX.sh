#!/bin/sh
# No installation or elevated privileges. Use LF line endings.
set -eu
GAME_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$GAME_DIR"
if [ "$(uname -s)" != Linux ] || [ "$(uname -m)" != x86_64 ]; then
  echo 'Este iniciador requer Linux x64 (Intel/AMD de 64 bits).'
  exit 1
fi
NODE="$GAME_DIR/runtime/linux-x64/node"
if [ ! -f "$NODE" ]; then
  echo 'Node Linux ausente. Gere o pacote com npm.cmd run build:portable:linux no computador do desenvolvedor.'
  exit 1
fi
if [ ! -w "$GAME_DIR/server" ]; then
  echo 'Copie a pasta inteira para sua pasta pessoal: o jogo precisa salvar as contas.'
  exit 1
fi
chmod u+x "$NODE" 2>/dev/null || true
if ! "$NODE" --version; then
  echo 'Nao foi possivel executar o Node portatil.'
  echo 'Se o pendrive bloqueia execucao, copie a pasta inteira para sua pasta pessoal e tente novamente.'
  echo 'Requer Linux x64 com glibc compativel com Node 22 (ex.: Linux Mint 21/22 ou Ubuntu 22.04/24.04).'
  exit 1
fi
exec "$NODE" "$GAME_DIR/server/lan.cjs"
