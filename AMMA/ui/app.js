// Minimal UI wiring: file input, canvas rendering skeleton, and control bindings.
// This file is a lightweight prototype bridge — heavy processing (Hessian/Frangi) will be
// handled by native modules or WebAssembly in later steps.

import { loadWasm, runWasmProcess } from './wasm_loader.js';

document.addEventListener('DOMContentLoaded', async () => {
  // --- Authentication Section ---
  const loginOverlay = document.getElementById('login-overlay');
  const appShell = document.getElementById('app');
  const userProfile = document.getElementById('user-profile');
  const userHintPlaceholder = document.getElementById('user-hint-placeholder');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const logoutButton = document.getElementById('logout-button');
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');

  function updateAuthUI(user) {
    if (user) {
      userAvatar.src = user.picture || '';
      userName.textContent = user.name;
      userProfile.style.display = 'flex';
      if (userHintPlaceholder) userHintPlaceholder.style.display = 'none';
      loginOverlay.classList.add('hidden');
      appShell.classList.remove('blurred');
    } else {
      userProfile.style.display = 'none';
      if (userHintPlaceholder) userHintPlaceholder.style.display = 'block';
      loginOverlay.classList.remove('hidden');
      appShell.classList.add('blurred');
    }
  }

  function handleSignOut() {
    localStorage.removeItem('amma_user');
    updateAuthUI(null);
  }

  logoutButton.addEventListener('click', handleSignOut);

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    loginError.style.display = 'none';
    loginError.textContent = '';

    if (username === 'admin' && password === 'password123') {
      const user = {
        name: 'Admin User',
        email: 'admin@amma-labs.org',
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        source: 'credentials'
      };
      localStorage.setItem('amma_user', JSON.stringify(user));
      updateAuthUI(user);

      usernameInput.value = '';
      passwordInput.value = '';
    } else {
      loginError.textContent = 'Invalid username or password.';
      loginError.style.display = 'block';
    }
  });

  const sessionUser = localStorage.getItem('amma_user');
  if (sessionUser) {
    try {
      updateAuthUI(JSON.parse(sessionUser));
    } catch (e) {
      localStorage.removeItem('amma_user');
      updateAuthUI(null);
    }
  } else {
    updateAuthUI(null);
  }
  // --- End of Authentication Section ---

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

  // --- Export Functionality Section ---
  document.getElementById('export-png').addEventListener('click', () => {
    const w = canvas.width; const h = canvas.height;
    if (w === 0 || h === 0) { setProgress('No canvas image to export'); return; }
    
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'amma_analysis.png';
      link.href = dataUrl;
      link.click();
      setProgress('PNG Exported');
    } catch (e) {
      console.error(e);
      setProgress('Export failed (canvas tainted?)');
    }
  });

  document.getElementById('export-report').addEventListener('click', () => {
    const w = canvas.width; const h = canvas.height;
    if (w === 0 || h === 0) { setProgress('No canvas image to export'); return; }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank');
      
      const filterName = filterSelect.value;
      const sigmaVal = scaleSlider.value;
      const enableFrangi = document.getElementById('toggle-frangi').checked;
      const enableDiffusion = document.getElementById('toggle-diffusion').checked;
      
      const sessionUser = JSON.parse(localStorage.getItem('amma_user')) || { name: 'Anonymous Clinician' };

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>AMMA Analysis Report</title>
          <style>
            body {
              font-family: 'Segoe UI', Inter, sans-serif;
              padding: 40px;
              color: #1e293b;
              max-width: 900px;
              margin: 0 auto;
              background-color: #f8fafc;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #0f172a;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              color: #0f172a;
              letter-spacing: -0.5px;
            }
            .header .brand-subtitle {
              color: #64748b;
              font-size: 14px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .card {
              background: white;
              padding: 20px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .card h3 {
              margin-top: 0;
              margin-bottom: 12px;
              font-size: 15px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta-item {
              margin-bottom: 8px;
              font-size: 14px;
            }
            .meta-item strong {
              color: #334155;
            }
            .image-container {
              background: #0f172a;
              padding: 10px;
              border-radius: 12px;
              display: flex;
              justify-content: center;
              margin-bottom: 30px;
            }
            .image-container img {
              max-width: 100%;
              max-height: 500px;
              object-fit: contain;
              border-radius: 6px;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
              margin-top: 40px;
            }
            @media print {
              body { background-color: white; padding: 20px; }
              .card { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>AMMA Analysis Report</h1>
              <div class="brand-subtitle">Advanced Medical Morphological Analyzer</div>
            </div>
            <div style="text-align: right; font-size: 13px; color: #64748b;">
              Report generated via AMMA Platform
            </div>
          </div>

          <div class="meta-grid">
            <div class="card">
              <h3>Session Information</h3>
              <div class="meta-item"><strong>Clinician:</strong> ${sessionUser.name}</div>
              <div class="meta-item"><strong>Email:</strong> ${sessionUser.email || 'N/A'}</div>
              <div class="meta-item"><strong>Date:</strong> ${new Date().toLocaleString()}</div>
            </div>
            <div class="card">
              <h3>Processing Parameters</h3>
              <div class="meta-item"><strong>Selected Filter:</strong> ${filterName}</div>
              <div class="meta-item"><strong>Scale (sigma):</strong> ${sigmaVal}</div>
              <div class="meta-item"><strong>Frangi Filter:</strong> ${enableFrangi ? 'Enabled' : 'Disabled'}</div>
              <div class="meta-item"><strong>Anisotropic Diffusion:</strong> ${enableDiffusion ? 'Enabled' : 'Disabled'}</div>
            </div>
          </div>

          <div class="card" style="margin-bottom: 30px;">
            <h3>Analysis Output Visualization</h3>
            <div class="image-container">
              <img src="${dataUrl}" alt="Vessel Analysis Visual Output" />
            </div>
          </div>

          <div class="footer">
            AMMA Image Processing Kernel Suite • Confidential Medical Report
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      setProgress('Report PDF Opened');
    } catch (e) {
      console.error(e);
      setProgress('PDF Export failed');
    }
  });

});
