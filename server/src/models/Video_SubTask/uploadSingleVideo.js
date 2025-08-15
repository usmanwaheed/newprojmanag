import mongoose from "mongoose";

const VIDEO_TYPE = {
    UPLOAD: "upload",
    RECORD: "record",
};

const uploadVideoSchema = new mongoose.Schema(
    {
        description: {
            type: String,
            required: [true, "The project description is required"],
        },
        type: {
            type: String,
            default: "upload",
            enum: Object.values(VIDEO_TYPE),
            required: [true, "The project type is required"],
        },
        video: {
            type: String,
            required: true,
        },
        // projectId: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "userTask",
        // },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },
    },
    { timestamps: true }
);

// Add indexes for efficient querying
uploadVideoSchema.index({ companyId: 1 });
uploadVideoSchema.index({ uploadedBy: 1 });
// uploadVideoSchema.index({ projectId: 1 });

// Static method to get videos for a specific company
uploadVideoSchema.statics.getVideosForCompany = function (companyId) {
    return this.find({ companyId }).populate("uploadedBy", "name avatar");
};

// Static method to get video by ID and company (for security)
uploadVideoSchema.statics.getVideoByIdAndCompany = function (
    videoId,
    companyId
) {
    return this.findOne({ _id: videoId, companyId }).populate(
        "uploadedBy",
        "name avatar"
    );
};

const uploadSingleVideo = mongoose.model("uploadVideo", uploadVideoSchema);
export { uploadSingleVideo, VIDEO_TYPE };
