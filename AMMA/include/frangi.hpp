// Frangi vesselness filter interface for AMMA
#pragma once

#include <opencv2/opencv.hpp>

namespace amma {

// Compute the single-scale Frangi vesselness from precomputed Hessian eigenvalues.
// Inputs:
// - lambda1, lambda2: CV_32F eigenvalue maps (|lambda1| <= |lambda2|) from computeHessianEigen
// Outputs:
// - vesselness: CV_32F map with values in [0,1]
// Parameters:
// - beta: controls sensitivity to blobness ratio Rb (default 0.5)
// - c: controls sensitivity to structureness S (default 15.0)
void computeFrangi(const cv::Mat& lambda1,
                   const cv::Mat& lambda2,
                   cv::Mat& vesselness,
                   float beta = 0.5f,
                   float c = 15.0f);

} // namespace amma
