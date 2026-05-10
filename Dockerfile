# Dockerfile for AMMA: C++/OpenCV build
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && \
    apt-get install -y cmake g++ libopencv-dev && \
    rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy source
COPY AMMA ./AMMA

# Build
RUN cd AMMA && mkdir -p build && cd build && cmake .. && make

# Default command (show help or run demo)
CMD ["/app/AMMA/build/frangi_demo", "--help"]
