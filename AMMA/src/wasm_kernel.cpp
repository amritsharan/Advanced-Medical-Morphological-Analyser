// Dependency-free Hessian + Frangi kernel for WASM (no OpenCV)
#include "../include/wasm_kernel.hpp"
#include <cmath>
#include <cstdlib>
#include <cstring>
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define KEEPALIVE
#endif

static inline float clampf(float v, float a, float b) { return v < a ? a : (v > b ? b : v); }

// Simple HSV->RGB (h in [0,360])
static void hsv_to_rgb(float h, float s, float v, unsigned char &r, unsigned char &g, unsigned char &b) {
    float c = v * s;
    float x = c * (1 - fabs(fmod(h / 60.0f, 2) - 1));
    float m = v - c;
    float rp=0, gp=0, bp=0;
    if (h < 60) { rp = c; gp = x; bp = 0; }
    else if (h < 120) { rp = x; gp = c; bp = 0; }
    else if (h < 180) { rp = 0; gp = c; bp = x; }
    else if (h < 240) { rp = 0; gp = x; bp = c; }
    else if (h < 300) { rp = x; gp = 0; bp = c; }
    else { rp = c; gp = 0; bp = x; }
    r = (unsigned char)roundf((rp + m) * 255.0f);
    g = (unsigned char)roundf((gp + m) * 255.0f);
    b = (unsigned char)roundf((bp + m) * 255.0f);
}

// Gaussian kernel generator
static void make_gaussian_kernel(float sigma, float *&kernel, int &ksize) {
    if (sigma <= 0.0001f) { kernel = nullptr; ksize = 0; return; }
    int radius = (int)ceilf(3.0f * sigma);
    ksize = radius * 2 + 1;
    kernel = (float*)malloc(sizeof(float) * ksize);
    float sum = 0.0f;
    for (int i = -radius; i <= radius; ++i) {
        float v = expf(-(i*i) / (2.0f * sigma * sigma));
        kernel[i + radius] = v;
        sum += v;
    }
    for (int i = 0; i < ksize; ++i) kernel[i] /= sum;
}

static void separable_convolution(const float* src, float* dst, int w, int h, const float* kernel, int ksize) {
    if (!kernel || ksize <= 1) { memcpy(dst, src, sizeof(float)*w*h); return; }
    int radius = ksize/2;
    float* temp = (float*)malloc(sizeof(float)*w*h);
    // horizontal
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            float acc = 0.0f;
            for (int k = -radius; k <= radius; ++k) {
                int sx = x + k;
                if (sx < 0) sx = 0; else if (sx >= w) sx = w-1;
                acc += kernel[k + radius] * src[y*w + sx];
            }
            temp[y*w + x] = acc;
        }
    }
    // vertical
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            float acc = 0.0f;
            for (int k = -radius; k <= radius; ++k) {
                int sy = y + k;
                if (sy < 0) sy = 0; else if (sy >= h) sy = h-1;
                acc += kernel[k + radius] * temp[sy*w + x];
            }
            dst[y*w + x] = acc;
        }
    }
    free(temp);
}

extern "C" {

unsigned char* KEEPALIVE process_image_kernel(const unsigned char* data, int width, int height, float sigma, float beta, float c) {
    if (!data || width <= 0 || height <= 0) return nullptr;
    int N = width * height;
    float* img = (float*)malloc(sizeof(float)*N);
    for (int i = 0; i < N; ++i) img[i] = (float)data[i];

    // Optional Gaussian smoothing
    float* smooth = (float*)malloc(sizeof(float)*N);
    float* kernel = nullptr; int ksize = 0;
    if (sigma > 0.0001f) {
        make_gaussian_kernel(sigma, kernel, ksize);
        separable_convolution(img, smooth, width, height, kernel, ksize);
    } else {
        memcpy(smooth, img, sizeof(float)*N);
    }

    // Allocate derivative arrays
    float* Lxx = (float*)malloc(sizeof(float)*N);
    float* Lyy = (float*)malloc(sizeof(float)*N);
    float* Lxy = (float*)malloc(sizeof(float)*N);

    // Compute finite-difference second derivatives
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            int idx = y*width + x;
            int xm1 = x>0 ? x-1 : 0;
            int xp1 = x<width-1 ? x+1 : width-1;
            int ym1 = y>0 ? y-1 : 0;
            int yp1 = y<height-1 ? y+1 : height-1;

            float I = smooth[idx];
            float Ix1 = smooth[y*width + xp1];
            float Ix_1 = smooth[y*width + xm1];
            float Iy1 = smooth[yp1*width + x];
            float Iy_1 = smooth[ym1*width + x];

            Lxx[idx] = Ix1 - 2.0f*I + Ix_1;
            Lyy[idx] = Iy1 - 2.0f*I + Iy_1;

            // Lxy via corner differences
            float Ipp = smooth[yp1*width + xp1];
            float Ipm = smooth[yp1*width + xm1];
            float Imp = smooth[ym1*width + xp1];
            float Imm = smooth[ym1*width + xm1];
            Lxy[idx] = 0.25f * (Ipp - Ipm - Imp + Imm);
        }
    }

    // Compute eigenvalues and Frangi vesselness
    float* vessel = (float*)malloc(sizeof(float)*N);
    float maxV = 0.0f;
    float twoBetaSq = 2.0f * beta * beta;
    float twoCSq = 2.0f * c * c;

    for (int i = 0; i < N; ++i) {
        float a = Lxx[i];
        float b = Lxy[i];
        float d = Lyy[i];
        float t = 0.5f*(a + d);
        float diff = 0.5f*(a - d);
        float disc = sqrtf(diff*diff + b*b);
        float e1 = t - disc;
        float e2 = t + disc;
        // Ensure |e1| <= |e2|
        float lam1 = e1, lam2 = e2;
        if (fabsf(lam1) > fabsf(lam2)) { float tmp = lam1; lam1 = lam2; lam2 = tmp; }

        float V = 0.0f;
        if (lam2 <= 0.0f) {
            float Rb = (fabsf(lam2) < 1e-12f) ? 0.0f : (fabsf(lam1) / fabsf(lam2));
            float S = sqrtf(lam1*lam1 + lam2*lam2);
            float term1 = expf(-(Rb*Rb) / twoBetaSq);
            float term2 = 1.0f - expf(-(S*S) / twoCSq);
            V = term1 * term2;
        }
        vessel[i] = V;
        if (V > maxV) maxV = V;
    }

    // Allocate RGBA output
    unsigned char* out = (unsigned char*)malloc((size_t)N * 4);
    for (int i = 0; i < N; ++i) {
        float v = vessel[i];
        if (maxV > 1e-12f) v /= maxV;
        v = clampf(v, 0.0f, 1.0f);
        // map v [0..1] to hue 240 (blue) -> 60 (yellow)
        float hue = 240.0f + (60.0f - 240.0f) * v;
        unsigned char r,g,b;
        hsv_to_rgb(hue, 1.0f, v, r, g, b);
        out[i*4 + 0] = r;
        out[i*4 + 1] = g;
        out[i*4 + 2] = b;
        out[i*4 + 3] = 255;
    }

    free(img);
    free(smooth);
    if (kernel) free(kernel);
    free(Lxx); free(Lyy); free(Lxy); free(vessel);

    return out;
}

void KEEPALIVE free_buffer(unsigned char* ptr) {
    if (ptr) free(ptr);
}

} // extern C
