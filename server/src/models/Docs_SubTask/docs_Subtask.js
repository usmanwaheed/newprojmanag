import mongoose from "mongoose";

const docsSubTaskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            maxlength: [100, "Title should be no longer than 100 characters"],
        },
        link: {
            type: String,
            required: [true, "Link is required"],
        },
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userTask",
            required: true,
        },
        // NEW: Company reference for security
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },
    },
    { timestamps: true }
);

docsSubTaskSchema.index({ companyId: 1 });
docsSubTaskSchema.index({ projectId: 1 });
docsSubTaskSchema.index({ companyId: 1, projectId: 1 });

const doscSubTask = mongoose.model("docsSubTask", docsSubTaskSchema);
export { doscSubTask };
