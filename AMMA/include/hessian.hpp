// Hessian / eigenvalue interfaces for AMMA
// Implements second-derivative kernels and per-pixel eigenvalue computation.
#pragma once

#include <opencv2/opencv.hpp>

namespace amma {

// Compute the Hessian (second derivatives) and per-pixel eigenvalues for a
// single-channel grayscale image.
// Parameters:
// - srcIn: input image (CV_8U or CV_32F)
// - lambda1: output CV_32F image where |lambda1| <= |lambda2|
// - lambda2: output CV_32F image where |lambda1| <= |lambda2|
// - angle: optional output CV_32F image with principal orientation in radians
// - sigma: optional scale parameter; image is Gaussian-smoothed by sigma before derivatives
// Notes: outputs use 32-bit float precision. The function is thread-parallel where available.
void computeHessianEigen(const cv::Mat& srcIn,
						 cv::Mat& lambda1,
						 cv::Mat& lambda2,
						 cv::Mat* angle = nullptr,
						 float sigma = 1.0f);

} // namespace amma
