import os
import sys
from setuptools import setup, Extension
import pybind11

amma_module = Extension(
    'amma',
    sources=['amma_py.cpp'],
    include_dirs=[pybind11.get_include(), '../include'],
    libraries=['opencv_core', 'opencv_imgproc'],
    language='c++',
    extra_compile_args=['-std=c++17'],
)

setup(
    name='amma',
    version='0.1',
    description='Python bindings for AMMA medical image analysis',
    ext_modules=[amma_module],
)
