import mongoose from "mongoose";

const videoSubtaskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            maxlength: [100, "Title should be no longer than 100 characters"],
        },
        video: {
            type: String,
            required: [true, "video link is required"],
        },
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userTask",
            required: true,
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },
    },
    { timestamps: true }
);

videoSubtaskSchema.index({ companyId: 1 });
videoSubtaskSchema.index({ projectId: 1 });
videoSubtaskSchema.index({ companyId: 1, projectId: 1 });

const videoSubTask = mongoose.model("video_Subtask", videoSubtaskSchema);
export { videoSubTask };
