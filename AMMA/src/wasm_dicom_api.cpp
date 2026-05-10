// WASM/C API implementation for DICOM tag extraction (Emscripten + GDCM)
#include "../include/wasm_dicom_api.hpp"
#include <gdcmImageReader.h>
#include <gdcmStringFilter.h>
#include <string>
#include <sstream>
#include <map>
#include <cstdlib>
#include <cstring>
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define KEEPALIVE
#endif

extern "C" {

char* KEEPALIVE get_dicom_tags(const unsigned char* data, int length) {
    if (!data || length <= 0) return nullptr;
    // Write buffer to temp file (WASM limitation: no direct DICOM parse from memory)
    std::string tmpPath = "/tmp/dicom_tmp.dcm";
    FILE* f = fopen(tmpPath.c_str(), "wb");
    if (!f) return nullptr;
    fwrite(data, 1, length, f);
    fclose(f);
    gdcm::ImageReader reader;
    reader.SetFileName(tmpPath.c_str());
    if (!reader.Read()) return nullptr;
    gdcm::StringFilter sf;
    sf.SetFile(reader.GetFile());
    std::map<std::string, std::string> tags;
    const char* wanted[] = {"PatientName","PatientID","StudyDate","Modality","PixelSpacing","SliceThickness","Rows","Columns"};
    for (auto tag : wanted) {
        std::string val = sf.ToString(tag);
        tags[tag] = val;
    }
    // Serialize to JSON
    std::ostringstream oss;
    oss << "{";
    bool first = true;
    for (const auto& kv : tags) {
        if (!first) oss << ","; first = false;
        oss << '\"' << kv.first << "\":\"" << kv.second << "\"";
    }
    oss << "}";
    std::string json = oss.str();
    char* out = (char*)malloc(json.size()+1);
    strcpy(out, json.c_str());
    return out;
}

void KEEPALIVE free_buffer(char* ptr) {
    if (ptr) free(ptr);
}

} // extern C
