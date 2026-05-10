# CMake placeholder for AMMA
# No build rules added — this is a placeholder file per user request.
# Add project(), find_package(OpenCV REQUIRED), and targets when implementation begins.

cmake_minimum_required(VERSION 3.10)
project(AMMA LANGUAGES CXX)

find_package(OpenCV REQUIRED)
find_package(OpenMP)

add_library(amma_hessian STATIC src/hessian_eig.cpp)
target_include_directories(amma_hessian PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_link_libraries(amma_hessian PUBLIC ${OpenCV_LIBS})

set_target_properties(amma_hessian PROPERTIES CXX_STANDARD 17 CXX_STANDARD_REQUIRED YES)

if(OpenMP_CXX_FOUND)
	target_link_libraries(amma_hessian PUBLIC OpenMP::OpenMP_CXX)
endif()

add_library(amma_frangi STATIC src/frangi.cpp)
target_include_directories(amma_frangi PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_link_libraries(amma_frangi PUBLIC ${OpenCV_LIBS})
if(OpenMP_CXX_FOUND)
	target_link_libraries(amma_frangi PUBLIC OpenMP::OpenMP_CXX)
endif()

# Demo executable that links Hessian + Frangi
add_executable(frangi_demo src/frangi_demo.cpp)
target_link_libraries(frangi_demo PRIVATE amma_hessian amma_frangi ${OpenCV_LIBS})

# Note: This CMakeLists provides a minimal build targets for Hessian and Frangi modules.
# Extend with examples/tests and install rules when implementation expands.