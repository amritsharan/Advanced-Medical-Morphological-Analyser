// WASM/C API for DICOM tag extraction (for Emscripten)
#pragma once
#include <cstdint>

#ifdef __cplusplus
extern "C" {
#endif

// Loads a DICOM file from a buffer and returns a JSON string of tags (malloc'd, must free with free_buffer)
// Returns nullptr on failure
char* get_dicom_tags(const unsigned char* data, int length);

// Free a buffer returned by get_dicom_tags
void free_buffer(char* ptr);

#ifdef __cplusplus
}
#endif
