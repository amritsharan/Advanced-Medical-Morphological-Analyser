// Lightweight dependency-free Hessian + Frangi kernel API for WASM
#pragma once

#include <cstdint>

extern "C" {

// Processes a grayscale image buffer (row-major, 8-bit) of size width x height.
// Returns a malloc()'d pointer to an RGBA uint8_t buffer (width*height*4 bytes).
// Caller must free with `free_buffer`.
unsigned char* process_image_kernel(const unsigned char* data, int width, int height, float sigma, float beta, float c);
void free_buffer(unsigned char* ptr);

}
