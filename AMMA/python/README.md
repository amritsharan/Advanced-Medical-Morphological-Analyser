# Python Wrapper for AMMA (pybind11)

This folder contains a minimal Python extension for the AMMA C++ core using [pybind11](https://github.com/pybind/pybind11).

## Requirements
- Python 3.7+
- pybind11 (`pip install pybind11`)
- OpenCV (Python and C++ bindings)
- CMake

## Build Instructions

```sh
cd python
python setup.py build
python setup.py install
```

## Example Usage

```python
import amma
import cv2
img = cv2.imread('vessels.png', 0)
lambda1, lambda2 = amma.compute_hessian_eigen(img, sigma=1.0)
vesselness = amma.compute_frangi(lambda1, lambda2)
cv2.imshow('Vesselness', vesselness)
cv2.waitKey(0)
```

---

See `amma_py.cpp` for the binding implementation.
