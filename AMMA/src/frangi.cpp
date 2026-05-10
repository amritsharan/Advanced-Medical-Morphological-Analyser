// Frangi vesselness implementation (single-scale)
#include "../include/frangi.hpp"
#include <opencv2/imgproc.hpp>
#include <cmath>

namespace amma {

void computeFrangi(const cv::Mat& lambda1, const cv::Mat& lambda2, cv::Mat& vesselness, float beta, float c) {
    CV_Assert(!lambda1.empty() && !lambda2.empty());
    CV_Assert(lambda1.size() == lambda2.size());
    CV_Assert(lambda1.type() == CV_32F && lambda2.type() == CV_32F);

    const int rows = lambda1.rows;
    const int cols = lambda1.cols;

    vesselness.create(lambda1.size(), CV_32F);

    const float twoBetaSq = 2.0f * beta * beta;
    const float twoCSq = 2.0f * c * c;

    // Parallelize pixel-wise computation (OpenMP outer, SIMD inner)
    #pragma omp parallel for schedule(static)
    for (int y = 0; y < rows; ++y) {
        const float* pL1 = lambda1.ptr<float>(y);
        const float* pL2 = lambda2.ptr<float>(y);
        float* pV = vesselness.ptr<float>(y);

        #pragma omp simd
        for (int x = 0; x < cols; ++x) {
            float l1 = pL1[x];
            float l2 = pL2[x];

            // Frangi assumes bright structures on dark background => vessel eigenvalues negative
            // If l2 is positive (not vessel-like), vesselness = 0
            if (l2 > 0.0f) {
                pV[x] = 0.0f;
                continue;
            }

            float absL1 = std::fabs(l1);
            float absL2 = std::fabs(l2);

            // Blobness ratio Rb = |lambda1| / |lambda2|
            float Rb = (absL2 < 1e-12f) ? 0.0f : (absL1 / absL2);

            // Structureness S = sqrt(lambda1^2 + lambda2^2)
            float S = std::sqrt(l1*l1 + l2*l2);

            float term1 = std::exp(-(Rb * Rb) / twoBetaSq);
            float term2 = 1.0f - std::exp(-(S * S) / twoCSq);

            float V = term1 * term2;
            // clamp
            if (!(V >= 0.0f)) V = 0.0f;
            if (V > 1.0f) V = 1.0f;

            pV[x] = V;
        }
    }
    // For further speedup, consider explicit SIMD (e.g., with xsimd or compiler intrinsics) for large images.

    // Normalize to [0,1] robustly (optional but helpful for visualization)
    double minv, maxv;
    cv::minMaxLoc(vesselness, &minv, &maxv);
    if (maxv - minv > 1e-12) {
        vesselness.convertTo(vesselness, CV_32F, 1.0f / static_cast<float>(maxv - minv), static_cast<float>(-minv / (maxv - minv)));
    }
}

} // namespace amma
