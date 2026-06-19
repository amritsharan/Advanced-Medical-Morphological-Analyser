// Pure JS fallback implementation of the AMMA Hessian + Frangi processing kernel
// mimicking the Emscripten WASM module interface.

(function() {
  const heapSize = 1024 * 1024 * 64; // 64 MB Heap
  const heapBuffer = new ArrayBuffer(heapSize);
  const HEAPU8 = new Uint8Array(heapBuffer);
  let mallocPtr = 1024; // reserve some space at the beginning

  function _malloc(size) {
    const ptr = mallocPtr;
    mallocPtr += size;
    // Align to 8 bytes
    mallocPtr = (mallocPtr + 7) & ~7;
    // Simple wrap around if we run out of memory
    if (mallocPtr > heapSize - 1024 * 1024 * 8) {
      mallocPtr = 1024;
    }
    return ptr;
  }

  function _free(ptr) {
    // No-op for mock simple allocator
  }

  function clampf(v, minVal, maxVal) {
    return v < minVal ? minVal : (v > maxVal ? maxVal : v);
  }

  function hsv_to_rgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60.0) % 2) - 1));
    const m = v - c;
    let rp = 0, gp = 0, bp = 0;
    if (h < 60) { rp = c; gp = x; bp = 0; }
    else if (h < 120) { rp = x; gp = c; bp = 0; }
    else if (h < 180) { rp = 0; gp = c; bp = x; }
    else if (h < 240) { rp = 0; gp = x; bp = c; }
    else if (h < 300) { rp = x; gp = 0; bp = c; }
    else { rp = c; gp = 0; bp = x; }
    
    return [
      Math.round((rp + m) * 255.0),
      Math.round((gp + m) * 255.0),
      Math.round((bp + m) * 255.0)
    ];
  }

  function make_gaussian_kernel(sigma) {
    if (sigma <= 0.0001) return null;
    const radius = Math.ceil(3.0 * sigma);
    const ksize = radius * 2 + 1;
    const kernel = new Float32Array(ksize);
    let sum = 0.0;
    for (let i = -radius; i <= radius; ++i) {
      const val = Math.exp(-(i * i) / (2.0 * sigma * sigma));
      kernel[i + radius] = val;
      sum += val;
    }
    for (let i = 0; i < ksize; ++i) {
      kernel[i] /= sum;
    }
    return kernel;
  }

  function separable_convolution(src, w, h, kernel) {
    const dst = new Float32Array(w * h);
    if (!kernel || kernel.length <= 1) {
      dst.set(src);
      return dst;
    }
    const radius = Math.floor(kernel.length / 2);
    const temp = new Float32Array(w * h);

    // Horizontal pass
    for (let y = 0; y < h; ++y) {
      const yw = y * w;
      for (let x = 0; x < w; ++x) {
        let acc = 0.0;
        for (let k = -radius; k <= radius; ++k) {
          let sx = x + k;
          if (sx < 0) sx = 0;
          else if (sx >= w) sx = w - 1;
          acc += kernel[k + radius] * src[yw + sx];
        }
        temp[yw + x] = acc;
      }
    }

    // Vertical pass
    for (let y = 0; y < h; ++y) {
      for (let x = 0; x < w; ++x) {
        let acc = 0.0;
        for (let k = -radius; k <= radius; ++k) {
          let sy = y + k;
          if (sy < 0) sy = 0;
          else if (sy >= h) sy = h - 1;
          acc += kernel[k + radius] * temp[sy * w + x];
        }
        dst[y * w + x] = acc;
      }
    }
    return dst;
  }

  function process_image_kernel(dataPtr, width, height, sigma, beta, c, filterName) {
    const N = width * height;
    const data = new Uint8Array(HEAPU8.buffer, dataPtr, N);
    const img = new Float32Array(N);
    for (let i = 0; i < N; ++i) {
      img[i] = data[i];
    }

    // Optional Gaussian smoothing
    let smooth;
    if (sigma > 0.0001) {
      const kernel = make_gaussian_kernel(sigma);
      smooth = separable_convolution(img, width, height, kernel);
    } else {
      smooth = img;
    }

    // Allocate derivative arrays
    const Lxx = new Float32Array(N);
    const Lyy = new Float32Array(N);
    const Lxy = new Float32Array(N);

    // Compute finite-difference second derivatives
    for (let y = 0; y < height; ++y) {
      const yw = y * width;
      const ym1w = (y > 0 ? y - 1 : 0) * width;
      const yp1w = (y < height - 1 ? y + 1 : height - 1) * width;

      for (let x = 0; x < width; ++x) {
        const idx = yw + x;
        const xm1 = x > 0 ? x - 1 : 0;
        const xp1 = x < width - 1 ? x + 1 : width - 1;

        const I = smooth[idx];
        const Ix1 = smooth[yw + xp1];
        const Ix_1 = smooth[yw + xm1];
        const Iy1 = smooth[yp1w + x];
        const Iy_1 = smooth[ym1w + x];

        Lxx[idx] = Ix1 - 2.0 * I + Ix_1;
        Lyy[idx] = Iy1 - 2.0 * I + Iy_1;

        // Lxy via corner differences
        const Ipp = smooth[yp1w + xp1];
        const Ipm = smooth[yp1w + xm1];
        const Imp = smooth[ym1w + xp1];
        const Imm = smooth[ym1w + xm1];
        Lxy[idx] = 0.25 * (Ipp - Ipm - Imp + Imm);
      }
    }

    // Compute eigenvalues and Frangi vesselness
    const vessel = new Float32Array(N);
    let maxV = 0.0;
    const twoBetaSq = 2.0 * beta * beta;
    const twoCSq = 2.0 * c * c;

    for (let i = 0; i < N; ++i) {
      const a = Lxx[i];
      const b = Lxy[i];
      const d = Lyy[i];
      const t = 0.5 * (a + d);
      const diff = 0.5 * (a - d);
      const disc = Math.sqrt(diff * diff + b * b);
      const e1 = t - disc;
      const e2 = t + disc;

      // Ensure |e1| <= |e2|
      let lam1 = e1, lam2 = e2;
      if (Math.abs(lam1) > Math.abs(lam2)) {
        const tmp = lam1;
        lam1 = lam2;
        lam2 = tmp;
      }

      let V = 0.0;
      if (lam2 <= 0.0) {
        const Rb = (Math.abs(lam2) < 1e-12) ? 0.0 : (Math.abs(lam1) / Math.abs(lam2));
        const S = Math.sqrt(lam1 * lam1 + lam2 * lam2);
        const term1 = Math.exp(-(Rb * Rb) / twoBetaSq);
        const term2 = 1.0 - Math.exp(-(S * S) / twoCSq);
        V = term1 * term2;
      }
      vessel[i] = V;
      if (V > maxV) maxV = V;
    }

    // Allocate RGBA output in our HEAPU8
    const outPtr = _malloc(N * 4);
    const out = new Uint8Array(HEAPU8.buffer, outPtr, N * 4);

    for (let i = 0; i < N; ++i) {
      let v = vessel[i];
      if (maxV > 1e-12) v /= maxV;
      v = clampf(v, 0.0, 1.0);
      
      // map v [0..1] to hue 240 (blue) -> 60 (yellow)
      const hue = 240.0 + (60.0 - 240.0) * v;
      const [r, g, b] = hsv_to_rgb(hue, 1.0, v);
      
      out[i * 4 + 0] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = 255;
    }

    return outPtr;
  }

  // Define Emscripten-style Module interface
  window.Module = {
    HEAPU8: HEAPU8,
    _malloc: _malloc,
    _free: _free,
    cwrap: function(name, returnType, argTypes) {
      if (name === 'process_image_kernel') {
        return process_image_kernel;
      }
      if (name === 'free_buffer') {
        return _free;
      }
      throw new Error(`Function ${name} not implemented in mock WASM module`);
    }
  };
})();
