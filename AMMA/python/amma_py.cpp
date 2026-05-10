// Minimal pybind11 wrapper for AMMA core
#include <pybind11/pybind11.h>
#include <pybind11/numpy.h>
#include <opencv2/opencv.hpp>
#include "../include/hessian.hpp"
#include "../include/frangi.hpp"

namespace py = pybind11;

py::tuple compute_hessian_eigen(py::array_t<uint8_t> img, float sigma=1.0f) {
    py::buffer_info buf = img.request();
    cv::Mat input(buf.shape[0], buf.shape[1], CV_8U, buf.ptr);
    cv::Mat lambda1, lambda2;
    amma::computeHessianEigen(input, lambda1, lambda2, nullptr, sigma);
    return py::make_tuple(
        py::array_t<float>({lambda1.rows, lambda1.cols}, lambda1.ptr<float>()),
        py::array_t<float>({lambda2.rows, lambda2.cols}, lambda2.ptr<float>())
    );
}

py::array_t<float> compute_frangi(py::array_t<float> lambda1, py::array_t<float> lambda2, float beta=0.5f, float c=15.0f) {
    py::buffer_info buf1 = lambda1.request();
    py::buffer_info buf2 = lambda2.request();
    cv::Mat l1(buf1.shape[0], buf1.shape[1], CV_32F, buf1.ptr);
    cv::Mat l2(buf2.shape[0], buf2.shape[1], CV_32F, buf2.ptr);
    cv::Mat vesselness;
    amma::computeFrangi(l1, l2, vesselness, beta, c);
    return py::array_t<float>({vesselness.rows, vesselness.cols}, vesselness.ptr<float>());
}

PYBIND11_MODULE(amma, m) {
    m.def("compute_hessian_eigen", &compute_hessian_eigen, "Compute Hessian eigenvalues");
    m.def("compute_frangi", &compute_frangi, "Compute Frangi vesselness");
}
