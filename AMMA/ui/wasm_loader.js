// WASM loader helper (Emscripten-style Module assumed)
// This file demonstrates how the UI can call the compiled wasm module's C API.

async function loadWasm(moduleUrl) {
  // The build should provide an Emscripten-generated JS glue that defines `Module`.
  // Example usage after Module is loaded:
  // const process_image = Module.cwrap('process_image', 'number', ['number','number','number','number','number','number']);
  // const free_buffer = Module.cwrap('free_buffer', 'void', ['number']);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = moduleUrl; // e.g. 'amma_kernel_wasm.js'
    script.onload = () => resolve(window.Module);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function runWasmProcess(Module, imageData, width, height, sigma, beta, c) {
  // imageData: Uint8Array grayscale
  const process_image = Module.cwrap('process_image_kernel', 'number', ['number','number','number','number','number','number']);
  const free_buffer = Module.cwrap('free_buffer', 'void', ['number']);

  const nBytes = imageData.length;
  const ptr = Module._malloc(nBytes);
  Module.HEAPU8.set(imageData, ptr);

  const outPtr = process_image(ptr, width, height, sigma, beta, c);
  Module._free(ptr);
  if (!outPtr) throw new Error('WASM processing failed');

  const outSize = width * height * 4;
  const outHeap = new Uint8ClampedArray(Module.HEAPU8.buffer, outPtr, outSize);
  const result = new Uint8ClampedArray(outHeap); // copy
  free_buffer(outPtr);
  return result; // RGBA buffer
}

export { loadWasm, runWasmProcess };
