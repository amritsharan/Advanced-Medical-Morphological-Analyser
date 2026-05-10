// Minimal UI wiring: file input, canvas rendering skeleton, and control bindings.
// This file is a lightweight prototype bridge — heavy processing (Hessian/Frangi) will be
// handled by native modules or WebAssembly in later steps.

import { loadWasm, runWasmProcess } from './wasm_loader.js';

document.addEventListener('DOMContentLoaded', async () => {
  const fileInput = document.getElementById('file-input');
  const canvas = document.getElementById('image-canvas');
  const ctx = canvas.getContext('2d');
  const scaleSlider = document.getElementById('scale');
  const scaleVal = document.getElementById('scale-val');
  const progress = document.getElementById('progress');
  let Module = null;

  try {
    progress.textContent = 'Loading WASM...';
    Module = await loadWasm('amma_kernel_wasm.js');
    progress.textContent = 'WASM loaded';
  } catch (e) {
    console.error('Failed to load WASM', e);
    progress.textContent = 'WASM load failed';
  }

  scaleSlider.addEventListener('input', () => {
    scaleVal.textContent = scaleSlider.value;
  });

  fileInput.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // fit to canvas
        canvas.width = Math.min(img.width, 2048);
        canvas.height = Math.min(img.height, 2048 * (img.height/img.width));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        progress.textContent = 'Image loaded';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(f);
  });

  document.getElementById('run-processing').addEventListener('click', () => {
    if (!Module) { progress.textContent = 'WASM not available'; return; }
    progress.textContent = 'Processing...';

    // extract grayscale from canvas
    const w = canvas.width; const h = canvas.height;
    const imgData = ctx.getImageData(0,0,w,h);
    const gray = new Uint8Array(w*h);
    for (let i=0, j=0; i<imgData.data.length; i+=4, j++) {
      // luma
      const r = imgData.data[i], g = imgData.data[i+1], b = imgData.data[i+2];
      gray[j] = (0.2126*r + 0.7152*g + 0.0722*b)|0;
    }

    const sigma = parseFloat(scaleSlider.value);
    const beta = 0.5;
    const c = 15.0;

    runWasmProcess(Module, gray, w, h, sigma, beta, c).then(rgba => {
      // draw returned RGBA buffer onto canvas
      const out = new ImageData(new Uint8ClampedArray(rgba), w, h);
      ctx.putImageData(out, 0, 0);
      progress.textContent = 'Done';
    }).catch(err => { console.error(err); progress.textContent = 'Processing failed'; });
  });

});
