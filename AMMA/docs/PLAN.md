# Development Plan — AMMA (placeholder)

Overview:
- Math Layer: manual second-derivative kernels, Hessian, eigenvalues.
- Noise Suppression: Perona–Malik anisotropic diffusion.
- Feature Detection: Frangi vesselness across scales.
- Localization: Sub-pixel Canny (Taylor expansion of gradient magnitude).
- DICOM: parse PixelSpacing/SpacingBetweenSlices for physical mapping.

Milestones:
1. Mathematical engine (Hessian, eigenvalues) — interface and tests.
2. Frangi vesselness module with OpenMP parallelism.
3. Perona–Malik denoising module.
4. Sub-pixel Canny edge detector.
5. DICOM metadata parser and physical unit mapping.
6. Integration tests with sample images and performance benchmarks.

Notes:
- Use 32-bit float (`float`) for all derivative maps.
- Prefer `cv::Mat` or `std::vector<float>` for storage — evaluate during implementation.
- Concurrency: target C++17 with OpenMP or `std::execution::par`.

(No code in this document; it is a planning placeholder.)