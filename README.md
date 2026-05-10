
# AMMA — Advanced Medical Morphological Analyzer

AMMA is a high-precision medical image analysis toolkit designed for vessel detection, denoising, and physical mapping in clinical and research imaging. It combines advanced mathematical algorithms (Hessian, Frangi vesselness, anisotropic diffusion, sub-pixel Canny) with a modern, interactive UI and WebAssembly support for browser-based analysis.

---

## Features

- **Hessian & Eigenvalue Analysis**: Accurate second-derivative computation for structure detection.
- **Frangi Vesselness Filter**: Multi-scale vessel enhancement for angiography and microscopy.
- **Anisotropic Diffusion**: Perona–Malik denoising for edge-preserving smoothing.
- **Sub-pixel Canny Edge Detection**: High-precision localization of boundaries.
- **DICOM Physical Mapping**: Parse and map pixel spacing for real-world measurements.
- **WebAssembly (WASM) Build**: Run core algorithms in the browser for instant feedback.
- **Modern UI**: Responsive, measurement-focused interface for clinicians and researchers.

---

## Project Structure

- `src/` — C++ implementations (Hessian, Frangi, etc.)
- `include/` — Public C++ headers
- `ui/` — Web UI (HTML, JS, CSS, WASM loader)
- `docs/` — Development plan and documentation
- `tests/` — Test cases and usage examples

---

## Build Instructions

### Native (C++/OpenCV)

1. **Requirements:** CMake ≥ 3.10, OpenCV, C++17, OpenMP (optional for parallelism)
2. **Build:**
	```sh
	mkdir build && cd build
	cmake ..
	make
	```
3. **Run Demo:**
	```sh
	./frangi_demo <input_image>
	```

### WebAssembly (WASM)

1. **Requirements:** [Emscripten](https://emscripten.org/), minimal OpenCV for WASM (optional)
2. **Build:** See `ui/README_WASM.md` for detailed commands.
3. **Integrate:** Load the generated JS/WASM in `ui/index.html` via `wasm_loader.js`.

---

## UI Overview

- **File Input:** Supports DICOM and standard image formats
- **DICOM Metadata Panel:** Displays pixel spacing, slice thickness
- **Processing Controls:** Sliders/toggles for denoising, vesselness, and localization
- **Interactive Canvas:** Overlay for vesselness/edges, measurement tools
- **Export:** PNG/PDF export of overlays and measurement summaries

See `ui/README.md` for design principles and planned features.

---

## Development Plan

See [`docs/PLAN.md`](docs/PLAN.md) for milestones, module breakdown, and technical notes.

---

## Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, new features, or documentation improvements. For major changes, discuss them in an issue first.

---

## License

This project is licensed under the MIT License.