WASM build & integration notes

This project can compile the C++ modules (Hessian + Frangi) to WebAssembly using Emscripten.

Recommended Emscripten build command (assumes Emscripten is installed and `emcc` is on PATH):

```bash
# from project root (AMMA)
mkdir -p build-wasm && cd build-wasm
emcmake cmake ..
# Or compile directly with emcc to produce a single JS/WASM bundle:
emcc \
  ../src/hessian_eig.cpp ../src/frangi.cpp ../src/wasm_api.cpp \
  -O3 -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME=Module \
  -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_FUNCTIONS='["_process_image","_free_buffer"]' \
  -I../include -o amma_wasm.js `pkg-config --cflags --libs opencv4`
```

Notes:
- Linking OpenCV into Emscripten builds often requires building OpenCV for WASM or using a prebuilt WASM-enabled OpenCV. An easier path is to minimize heavy OpenCV dependencies in the WASM entry points (e.g., implement small image conversions in plain C/C++). If OpenCV for WASM is not available, prefer compiling a smaller, dependency-free processing kernel for the wasm target.

UI integration:
- Include the generated `amma_wasm.js` in `ui/index.html` or dynamically load it via `ui/wasm_loader.js`.
- Use `Module.cwrap('process_image','number', ['number','number','number','number','number','number'])` to get a callable JS wrapper.
- Pass a grayscale `Uint8Array` buffer and receive an RGBA `Uint8ClampedArray` back (see `ui/wasm_loader.js`).

Caveats:
- Building OpenCV into WASM can produce large artifacts. Consider exposing a thin, dependency-free version of the algorithm for the browser (rewrite core derivatives without OpenCV), and keep the full OpenCV C++ build for native desktop.

