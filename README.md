AMMA UI — Design notes and interaction model

Goal:
Build a polished, Gemini-style UI that is modern, responsive, and immediately informative for clinicians and researchers.

Design principles:
- Calm, high-contrast visual theme with clear accent color for detected structures.
- Fast feedback loops: immediate preview of loaded images, incremental updates while processing.
- Contextual controls: sliders and toggles grouped by task (denoise, vesselness, localization).
- Measurement-first: display pixel spacing and allow click/drag measurements mapped to mm/µm.
- Export-focused: quick PNG and PDF export of overlays and measurement summaries.

UI Components (in prototype):
- File input (supports DICOM and image formats)
- DICOM metadata panel (PixelSpacing, SliceThickness)
- Processing controls (σ scale, toggles for Frangi/Diffusion)
- Canvas with overlay for vesselness/edges and interactive measurement tool
- Status/progress indicator and export buttons

Integration notes:
- Backend: expose C++ processing (Hessian/Frangi) via a native executable, REST API, or WebAssembly bridge.
- For native desktop: consider Electron or Tauri to embed the UI and call the C++ library.
- For web prototype: compile core algorithms to WebAssembly (Emscripten) for near-native performance.

Next steps to polish UI:
- Add SVG icons and micro-interactions (hover, focus, transitions).
- Implement overlay rendering of float vesselness map with perceptually-uniform colormap.
- Wire measurement tool to DICOM pixel spacing for real-world units.
- Add accessibility (keyboard navigation, ARIA labels) and theming.

Mockups and assets should be added when designers approve the visual direction.
