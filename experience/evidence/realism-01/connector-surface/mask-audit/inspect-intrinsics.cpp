#include <algorithm>
#include <cstdint>
#include <cstring>
#include <iostream>
#include <stdexcept>
#include <vector>

#define _USE_OPENCV
#include <opencv2/core/types.hpp>
#include "upstream/Interface.h"
#include "upstream/json.hpp"

int main(int argc, char** argv) {
    if (argc != 2) throw std::invalid_argument("Expected one interface archive path");
    MVS::Interface scene;
    std::uint32_t version = 0;
    if (!MVS::ARCHIVE::SerializeLoad(scene, argv[1], &version)) {
        throw std::runtime_error("Official interface reader failed");
    }
    nlohmann::json result = {{"archiveVersion", version}, {"images", nlohmann::json::array()}};
    for (std::size_t index = 0; index < scene.images.size(); ++index) {
        const auto& image = scene.images[index];
        const auto& camera = scene.GetCamera(index);
        const auto pose = scene.GetPose(index);
        if (!camera.HasResolution()) throw std::runtime_error("Expected recorded camera dimensions");
        const auto intrinsics = scene.GetFullK(index, camera.width, camera.height);
        nlohmann::json matrix = nlohmann::json::array();
        nlohmann::json rotation = nlohmann::json::array();
        for (int row = 0; row < 3; ++row) {
            matrix.push_back({intrinsics(row, 0), intrinsics(row, 1), intrinsics(row, 2)});
            rotation.push_back({pose.R(row, 0), pose.R(row, 1), pose.R(row, 2)});
        }
        result["images"].push_back({
            {"internalId", index}, {"imageId", image.ID}, {"name", image.name},
            {"maskName", image.maskName}, {"width", camera.width}, {"height", camera.height},
            {"K", matrix}, {"R", rotation}, {"C", {pose.C.x, pose.C.y, pose.C.z}}
        });
    }
    std::cout << result.dump(2) << '\n';
}
