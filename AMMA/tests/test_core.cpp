// Unit tests for AMMA core modules: Hessian and Frangi
// Uses OpenCV's testing framework (or minimal asserts if unavailable)

#include "../include/hessian.hpp"
#include "../include/frangi.hpp"
#include <opencv2/opencv.hpp>
#include <cassert>
#include <iostream>

void test_hessian_eigen() {
    cv::Mat img = cv::Mat::zeros(32, 32, CV_8U);
    cv::rectangle(img, cv::Point(8,8), cv::Point(24,24), 255, -1);
    cv::Mat lambda1, lambda2;
    amma::computeHessianEigen(img, lambda1, lambda2, nullptr, 1.0f);
    assert(lambda1.size() == img.size());
    assert(lambda2.size() == img.size());
    std::cout << "Hessian eigen test passed\n";
}

void test_frangi() {
    cv::Mat img = cv::Mat::zeros(32, 32, CV_8U);
    cv::line(img, cv::Point(4,16), cv::Point(28,16), 255, 2);
    cv::Mat lambda1, lambda2, vesselness;
    amma::computeHessianEigen(img, lambda1, lambda2, nullptr, 1.0f);
    amma::computeFrangi(lambda1, lambda2, vesselness);
    assert(vesselness.size() == img.size());
    double minVal, maxVal;
    cv::minMaxLoc(vesselness, &minVal, &maxVal);
    assert(maxVal > 0.5); // Should detect the line as vessel
    std::cout << "Frangi vesselness test passed\n";
}

int main() {
    test_hessian_eigen();
    test_frangi();
    std::cout << "All AMMA core tests passed.\n";
    return 0;
}
