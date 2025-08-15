import mongoose from "mongoose";
import {
    uploadSingleVideo,
    VIDEO_TYPE,
} from "../../models/Video_SubTask/uploadSingleVideo.js";
import { apiError } from "../../utils/apiError.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import { ROLES } from "../../config/roles.js";

const getUserCompanyId = (user) => {
    if (user.role === ROLES.COMPANY) {
        return user._id;
    } else if (user.role === ROLES.USER && user.companyId) {
        return user.companyId;
    } else if (user.role === ROLES.QCADMIN && user.companyId) {
        return user.companyId;
    }
    return null;
};

const uploadVideo = async (file) => {
    if (!file) {
        throw new apiError(400, "No video file uploaded");
    }

    if (file.size > 100 * 1024 * 1024) {
        throw new apiError(400, "Video size is greater than 100MB");
    }

    const localFilePath = file.path;
    const uploadResult = await uploadOnCloudinary(localFilePath);

    if (!uploadResult) {
        throw new apiError(400, "Failed to upload video to Cloudinary");
    }

    return uploadResult.url;
};

const uploadVideoController = asyncHandler(async (req, res) => {
    const file = req.file;
    const { description, type } = req.body;
    const companyId = getUserCompanyId(req.user);
    // console.log("working")
    if (!companyId) {
        throw new apiError(400, "Company ID is required to upload videos.");
    }

    if (!description) {
        throw new apiError(400, "Video description not provided");
    }

    // if (!Object.values(VIDEO_TYPE).includes(type)) {
    //     throw new apiError(400, "Invalid video type");
    // }

    const videoUrl = await uploadVideo(file);

    const newVideoSubTask = await uploadSingleVideo.create({
        description,
        video: videoUrl,
        type: type || "upload",
        companyId,
        uploadedBy: req.user._id,
        // projectId: projectId || null,
    });

    res.status(200).json(
        new apiResponse(200, newVideoSubTask, "Video uploaded successfully")
    );
});

const getAllVideoController = asyncHandler(async (req, res) => {
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to fetch videos.");
    }

    const videosData = await uploadSingleVideo.getVideosForCompany(companyId);

    if (!videosData.length) {
        return res
            .status(200)
            .json(new apiResponse(200, [], "No videos found"));
    }

    res.status(200).json(
        new apiResponse(200, videosData, "Uploaded data successfully fetched")
    );
});

const getSingleVideoController = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to fetch video.");
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid Task ID format");
    }

    const getVideo = await uploadSingleVideo.getVideoByIdAndCompany(
        videoId,
        companyId
    );
    if (!getVideo) {
        throw new apiError(404, "No video found or access denied");
    }

    res.status(200).json(
        new apiResponse(200, getVideo, "Video Get Successfully!")
    );
});

const searchVideosController = asyncHandler(async (req, res) => {
    const { query } = req.query;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to search videos.");
    }

    if (!query) {
        throw new apiError(400, "Search query is required");
    }

    const searchResults = await uploadSingleVideo.find({
        companyId,
        $or: [
            { description: { $regex: query, $options: "i" } },
            { type: { $regex: query, $options: "i" } },
            // { projectId: mongoose.isValidObjectId(query) ? new mongoose.Types.ObjectId(query) : null }
        ].filter((condition) => {
            // return condition.projectId !== null ||
            "description" in condition || "type" in condition;
        }),
    });

    if (!searchResults.length) {
        return res
            .status(200)
            .json(
                new apiResponse(200, [], "No videos found matching your search")
            );
    }

    res.status(200).json(
        new apiResponse(
            200,
            searchResults,
            "Search results fetched successfully"
        )
    );
});

const deleteVideoController = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to delete videos.");
    }

    const videoRecord = await uploadSingleVideo.getVideoByIdAndCompany(
        videoId,
        companyId
    );
    if (!videoRecord) {
        throw new apiError(404, "Video not found or access denied");
    }

    // Improved public ID extraction
    const videoUrl = videoRecord.video;
    let publicId;

    try {
        // Extract public ID from URL (works for most Cloudinary URL formats)
        const urlParts = videoUrl.split("/");
        const uploadIndex = urlParts.findIndex((part) => part === "upload") + 1;
        publicId = urlParts.slice(uploadIndex).join("/").split(".")[0];

        // Delete from Cloudinary
        const cloudinaryResponse = await deleteFromCloudinary(
            publicId,
            "video"
        );

        // Optional: You might choose to proceed even if Cloudinary deletion fails
        if (cloudinaryResponse.result !== "ok") {
            console.warn(
                `Cloudinary deletion warning for ${publicId}:`,
                cloudinaryResponse
            );
            // Continue with database deletion anyway
        }
    } catch (error) {
        console.error("Error during Cloudinary deletion:", error);
    }

    // Delete from database
    await uploadSingleVideo.findByIdAndDelete(videoId);

    res.status(200).json(
        new apiResponse(200, {}, "Video deleted successfully")
    );
});

export {
    uploadVideoController,
    getAllVideoController,
    getSingleVideoController,
    searchVideosController,
    deleteVideoController,
};
