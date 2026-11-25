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
    nlohmann::json result = {
        {"archiveVersion", version},
        {"platformCount", scene.platforms.size()},
        {"pointCount", scene.vertices.size()},
        {"images", nlohmann::json::array()}
    };
    for (std::size_t index = 0; index < scene.images.size(); ++index) {
        const auto& image = scene.images[index];
        const auto& camera = scene.GetCamera(index);
        const auto pose = scene.GetPose(index);
        result["images"].push_back({
            {"internalId", index}, {"imageId", image.ID},
            {"name", image.name}, {"maskName", image.maskName},
            {"platformId", image.platformID}, {"cameraId", image.cameraID},
            {"poseId", image.poseID}, {"width", camera.width}, {"height", camera.height},
            {"center", {pose.C.x, pose.C.y, pose.C.z}}
        });
    }
    std::cout << result.dump(2) << '\n';
}
