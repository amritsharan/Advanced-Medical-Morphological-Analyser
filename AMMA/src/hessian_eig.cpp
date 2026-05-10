// Hessian and eigenvalue computation implementation.
// Computes second derivatives with manual [1 -2 1] kernels (separable),
// computes Lxy via Sobel derivatives, and returns per-pixel eigenvalues
// (ordered by increasing absolute value). Uses 32-bit float precision.

#include "../include/hessian.hpp"
#include <opencv2/imgproc.hpp>
#include <cmath>

namespace amma {

void computeHessianEigen(const cv::Mat& srcIn, cv::Mat& lambda1, cv::Mat& lambda2, cv::Mat* angle, float sigma) {
	CV_Assert(!srcIn.empty());

	cv::Mat src;
	if (srcIn.type() != CV_32F) srcIn.convertTo(src, CV_32F, 1.0);
	else src = srcIn;

	// Apply Gaussian smoothing at the requested scale
	if (sigma > 0.0f && std::fabs(sigma - 1.0f) > 1e-6f) {
		int ksize = std::max(3, (int)(std::ceil(sigma * 3) * 2 + 1));
		cv::GaussianBlur(src, src, cv::Size(ksize, ksize), sigma, sigma, cv::BORDER_REPLICATE);
	}

	// Separable second-derivative kernels [1 -2 1]
	cv::Mat kxx = (cv::Mat_<float>(1,3) << 1.f, -2.f, 1.f);
	cv::Mat kyy = kxx.t();

	cv::Mat Lxx, Lyy, Lx, Ly, Lxy;

	cv::filter2D(src, Lxx, CV_32F, kxx, cv::Point(-1,-1), 0.0, cv::BORDER_REPLICATE);
	cv::filter2D(src, Lyy, CV_32F, kyy, cv::Point(-1,-1), 0.0, cv::BORDER_REPLICATE);

	// First derivatives via Sobel
	cv::Sobel(src, Lx, CV_32F, 1, 0, 3, 1.0, 0.0, cv::BORDER_REPLICATE);
	cv::Sobel(src, Ly, CV_32F, 0, 1, 3, 1.0, 0.0, cv::BORDER_REPLICATE);

	// Cross derivative Lxy: average of d/dy(Lx) and d/dx(Ly)
	cv::Mat Lx_y, Ly_x;
	cv::Sobel(Lx, Lx_y, CV_32F, 0, 1, 3, 1.0, 0.0, cv::BORDER_REPLICATE);
	cv::Sobel(Ly, Ly_x, CV_32F, 1, 0, 3, 1.0, 0.0, cv::BORDER_REPLICATE);
	Lxy = 0.5f * (Lx_y + Ly_x);

	// Scale normalization (common in scale-space): second derivatives scale with sigma^2
	float scaleNorm = sigma * sigma;
	if (std::fabs(scaleNorm - 1.0f) > 1e-8f) {
		Lxx *= scaleNorm;
		Lyy *= scaleNorm;
		Lxy *= scaleNorm;
	}

	// Prepare outputs
	lambda1.create(src.size(), CV_32F);
	lambda2.create(src.size(), CV_32F);
	if (angle) angle->create(src.size(), CV_32F);

	const int rows = src.rows;
	const int cols = src.cols;

	   // OpenMP parallel for outer, SIMD inner for large images
	   #pragma omp parallel for schedule(static)
	   for (int y = 0; y < rows; ++y) {
		   const float* pLxx = Lxx.ptr<float>(y);
		   const float* pLyy = Lyy.ptr<float>(y);
		   const float* pLxy = Lxy.ptr<float>(y);
		   float* pE1 = lambda1.ptr<float>(y);
		   float* pE2 = lambda2.ptr<float>(y);
		   float* pAng = angle ? angle->ptr<float>(y) : nullptr;

		   #pragma omp simd
		   for (int x = 0; x < cols; ++x) {
			   float a = pLxx[x];
			   float b = pLxy[x];
			   float c = pLyy[x];

			   float t = 0.5f * (a + c);
			   float diff = 0.5f * (a - c);
			   float d = std::sqrt(diff*diff + b*b);

			   float e1 = t - d;
			   float e2 = t + d;

			// Order by absolute value (|e1| <= |e2|)
			if (std::fabs(e1) <= std::fabs(e2)) {
				pE1[x] = e1;
				pE2[x] = e2;
			} else {
				pE1[x] = e2;
				pE2[x] = e1;
			}

			if (pAng) {
				// Principal eigenvector for the larger eigenvalue e2
				float vx, vy;
				// For symmetric matrix, eigenvector components can be derived; handle near-zero cases
				if (std::fabs(b) > 1e-12f) {
					vx = e2 - c;
					vy = b;
				} else {
					vx = 1.0f;
					vy = 0.0f;
				}
				pAng[x] = std::atan2(vy, vx);
			}
		}
	}
}

} // namespace amma
