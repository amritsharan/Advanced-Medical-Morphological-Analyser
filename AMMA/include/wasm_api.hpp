// Emscripten-friendly C API for AMMA processing
#pragma once

#include <cstdint>

extern "C" {

// Processes a grayscale image buffer (row-major, 8-bit) of size width x height.
// Returns a malloc()'d pointer to an RGBA uint8_t buffer (width*height*4 bytes).
// Caller must free with `free_buffer`.
// Parameters:
// - data: pointer to uint8_t input image pixels
// - width, height: image dimensions
// - sigma: Gaussian/scale parameter for Hessian
// - beta, c: Frangi parameters
unsigned char* process_image(const unsigned char* data, int width, int height, float sigma, float beta, float c);

// Free a buffer returned by `process_image`.
void free_buffer(unsigned char* ptr);

}
