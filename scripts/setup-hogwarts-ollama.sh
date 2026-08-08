#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CACHE_DIR="$ROOT_DIR/data/_cache/ollama"
MODEL_DIR="$CACHE_DIR/models"

if [ -n "${HOGWARTS_OLLAMA_BINARY:-}" ]; then
    OLLAMA_BIN="$HOGWARTS_OLLAMA_BINARY"
elif [ -x "$CACHE_DIR/bin/ollama" ]; then
    OLLAMA_BIN="$CACHE_DIR/bin/ollama"
elif [ -x "$CACHE_DIR/ollama" ]; then
    OLLAMA_BIN="$CACHE_DIR/ollama"
elif command -v ollama >/dev/null 2>&1; then
    OLLAMA_BIN=$(command -v ollama)
else
    echo "Ollama binary not found. Install Ollama or set HOGWARTS_OLLAMA_BINARY." >&2
    exit 1
fi

mkdir -p "$MODEL_DIR"
mkdir -p "$CACHE_DIR/home"
export HOME="$CACHE_DIR/home"
export OLLAMA_HOST="${HOGWARTS_OLLAMA_HOST:-127.0.0.1:11434}"
export OLLAMA_MODELS="$MODEL_DIR"

if ! curl -fsS "http://$OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
    "$OLLAMA_BIN" serve >"$CACHE_DIR/server.log" 2>&1 &
    SERVER_PID=$!
    trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM
    attempt=0
    until curl -fsS "http://$OLLAMA_HOST/api/tags" >/dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [ "$attempt" -ge 40 ]; then
            echo "Ollama server did not become ready." >&2
            exit 1
        fi
        sleep 0.25
    done
fi

for model in "${@:-qwen3:1.7b}"; do
    "$OLLAMA_BIN" pull "$model"
done
