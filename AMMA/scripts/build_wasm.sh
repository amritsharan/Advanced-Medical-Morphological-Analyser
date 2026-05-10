#!/usr/bin/env bash
# Helper script to build AMMA to WASM using emcc (requires Emscripten SDK environment)
set -e
mkdir -p build-wasm
cd build-wasm
emcc ../src/wasm_kernel.cpp \
  -O3 -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME=Module \
  -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_FUNCTIONS='["_process_image_kernel","_free_buffer"]' \
  -I../include -o amma_kernel_wasm.js

echo "Built amma_wasm.js and amma_wasm.wasm in build-wasm/"
