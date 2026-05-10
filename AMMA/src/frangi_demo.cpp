// Simple demo: load image, compute Hessian eigenvalues, compute Frangi vesselness, write result
#include <opencv2/opencv.hpp>
#include "../include/hessian.hpp"
#include "../include/frangi.hpp"
#include <iostream>

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "Usage: frangi_demo <grayscale-image> [sigma]\n";
        return 1;
    }

    std::string path = argv[1];
    float sigma = 1.0f;
    if (argc >= 3) sigma = std::stof(argv[2]);

    cv::Mat img = cv::imread(path, cv::IMREAD_GRAYSCALE);
    if (img.empty()) { std::cerr << "Failed to load image\n"; return 1; }

    cv::Mat l1, l2, angle;
    amma::computeHessianEigen(img, l1, l2, &angle, sigma);

    cv::Mat vessel;
    amma::computeFrangi(l1, l2, vessel, 0.5f, 15.0f);

    // Convert to 8-bit visualization
    cv::Mat vis;
    vessel.convertTo(vis, CV_8U, 255.0);
    cv::applyColorMap(vis, vis, cv::COLORMAP_VIRIDIS);
    cv::imwrite("frangi_vesselness.png", vis);

    std::cout << "Wrote frangi_vesselness.png\n";
    return 0;
}
