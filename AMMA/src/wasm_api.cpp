// WASM/C API implementation — exposes processing endpoints for Emscripten
#include "../include/wasm_api.hpp"
#include "../include/hessian.hpp"
#include "../include/frangi.hpp"
#include <opencv2/opencv.hpp>
#include <cstdlib>
#include <cstring>
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define KEEPALIVE
#endif

extern "C" {

unsigned char* KEEPALIVE process_image(const unsigned char* data, int width, int height, float sigma, float beta, float c) {
    if (!data || width <= 0 || height <= 0) return nullptr;

    // Create a cv::Mat header around the input buffer (no copy)
    cv::Mat img(height, width, CV_8U, const_cast<unsigned char*>(data));

    cv::Mat l1, l2, angle;
    amma::computeHessianEigen(img, l1, l2, &angle, sigma);

    cv::Mat vessel;
    amma::computeFrangi(l1, l2, vessel, beta, c);

    // Convert vesselness to 8-bit and colorize (Viridis-like)
    cv::Mat vis8;
    vessel.convertTo(vis8, CV_8U, 255.0);
    cv::Mat color;
    cv::applyColorMap(vis8, color, cv::COLORMAP_VIRIDIS);

    cv::Mat rgba;
    cv::cvtColor(color, rgba, cv::COLOR_BGR2RGBA);

    size_t bytes = (size_t)rgba.total() * rgba.elemSize();
    unsigned char* out = (unsigned char*)std::malloc(bytes);
    if (!out) return nullptr;
    std::memcpy(out, rgba.data, bytes);
    return out;
}

void KEEPALIVE free_buffer(unsigned char* ptr) {
    if (ptr) std::free(ptr);
}

} // extern C
