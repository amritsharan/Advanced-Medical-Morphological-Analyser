// Minimal UI wiring: file input, canvas rendering skeleton, and control bindings.
// This file is a lightweight prototype bridge — heavy processing (Hessian/Frangi) will be
// handled by native modules or WebAssembly in later steps.

import { loadWasm, runWasmProcess } from './wasm_loader.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Filter dropdown population (placeholder, to be replaced with dynamic fetch from backend/wasm)
    const filterSelect = document.getElementById('filter-select');
    // Example: populate with available filters (in real app, fetch from backend or WASM API)
    const availableFilters = ['Frangi']; // TODO: fetch dynamically
    filterSelect.innerHTML = '';
    availableFilters.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      filterSelect.appendChild(opt);
    });
  const fileInput = document.getElementById('file-input');
  const canvas = document.getElementById('image-canvas');
  const ctx = canvas.getContext('2d');
  const scaleSlider = document.getElementById('scale');
  const scaleVal = document.getElementById('scale-val');
  const progress = document.getElementById('progress');
  let Module = null;

  const ariaProgress = document.getElementById('aria-progress');
  function setProgress(msg, busy=false) {
    progress.textContent = msg;
    progress.setAttribute('aria-busy', busy ? 'true' : 'false');
    ariaProgress.textContent = msg;
  }
  try {
    setProgress('Loading WASM...', true);
    Module = await loadWasm('amma_kernel_wasm.js');
    setProgress('WASM loaded');
  } catch (e) {
    console.error('Failed to load WASM', e);
    setProgress('WASM load failed');
  }

  scaleSlider.addEventListener('input', () => {
    scaleVal.textContent = scaleSlider.value;
  });

  fileInput.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    setProgress('Loading image...', true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // fit to canvas
        canvas.width = Math.min(img.width, 2048);
        canvas.height = Math.min(img.height, 2048 * (img.height/img.width));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setProgress('Image loaded');
      };
      img.onerror = () => setProgress('Image load failed');
      img.src = e.target.result;
    };
    reader.onerror = () => setProgress('File read error');
    reader.readAsDataURL(f);
  });

  document.getElementById('run-processing').addEventListener('click', () => {
    if (!Module) { setProgress('WASM not available'); return; }
    setProgress('Processing...', true);

    // extract grayscale from canvas
    const w = canvas.width; const h = canvas.height;
    if (w === 0 || h === 0) { setProgress('No image loaded'); return; }
    let imgData;
    try {
      imgData = ctx.getImageData(0,0,w,h);
    } catch (e) {
      setProgress('Failed to read canvas');
      return;
    }
    const gray = new Uint8Array(w*h);
    for (let i=0, j=0; i<imgData.data.length; i+=4, j++) {
      // luma
      const r = imgData.data[i], g = imgData.data[i+1], b = imgData.data[i+2];
      gray[j] = (0.2126*r + 0.7152*g + 0.0722*b)|0;
    }

    const sigma = parseFloat(scaleSlider.value);
    const beta = 0.5;
    const c = 15.0;
    const filterName = filterSelect.value;

    // Pass filterName to WASM backend (update runWasmProcess to accept it)
    runWasmProcess(Module, gray, w, h, sigma, beta, c, filterName).then(rgba => {
      // draw returned RGBA buffer onto canvas
      const out = new ImageData(new Uint8ClampedArray(rgba), w, h);
      ctx.putImageData(out, 0, 0);
      setProgress('Done');
    }).catch(err => {
      console.error(err);
      setProgress('Processing failed');
    });
  });

});
