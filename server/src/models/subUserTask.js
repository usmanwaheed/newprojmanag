import mongoose from "mongoose";

const subUsertaskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "The project title is required"],
            maxlength: [40, "The title should be no longer than 40 characters"],
        },
        assign: {
            type: [String],
            required: [true, "Please type the name of the admin"],
        },
        description: {
            type: String,
            maxLength: [
                700,
                "The Description should be no longer than 700 characters",
            ],
        },
        dueDate: {
            type: Date,
            required: [true, "The Due Date is required"],
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        taskList: {
            type: String,
            enum: ["progress", "completed", "approved"],
            default: "progress",
        },
        points: {
            type: Number,
            default: 10,
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userTask",
            required: true,
        },
        // NEW: Company reference for security - inherited from parent project
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },
        users: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "UserInfo",
            },
        ],
    },
    { timestamps: true }
);

// Add indexes for efficient querying
subUsertaskSchema.index({ companyId: 1 });
subUsertaskSchema.index({ projectId: 1 });
subUsertaskSchema.index({ companyId: 1, projectId: 1 });
subUsertaskSchema.index({ assignedBy: 1 });

// Static method to get subtasks for a specific project and company
subUsertaskSchema.statics.getSubTasksForProjectAndCompany = function (
    projectId,
    companyId
) {
    return this.find({ projectId, companyId })
        .populate("assignedBy", "name avatar")
        .exec();
};

// Static method to get subtask by ID and company (for security)
subUsertaskSchema.statics.getSubTaskByIdAndCompany = function (
    taskId,
    companyId
) {
    return this.findOne({ _id: taskId, companyId }).populate(
        "assignedBy",
        "name avatar"
    );
};

// Static method to get completed subtasks for a company
subUsertaskSchema.statics.getCompletedSubTasksForCompany = function (
    companyId
) {
    return this.find({ taskList: "completed", companyId }).populate(
        "assignedBy",
        "name avatar"
    );
};

// Static method to get assigned users for a project within a company
subUsertaskSchema.statics.getAssignedUsersForProjectAndCompany = function (
    projectId,
    companyId
) {
    const objectId = new mongoose.Types.ObjectId(projectId);

    return this.aggregate([
        {
            $match: {
                projectId: objectId,
                companyId: new mongoose.Types.ObjectId(companyId),
            },
        },
        { $unwind: "$assign" },
        {
            $lookup: {
                from: "userinfos",
                localField: "assign",
                foreignField: "name",
                as: "userDetails",
            },
        },
        { $unwind: "$userDetails" },
        // Filter users to only include those from the same company
        {
            $match: {
                $or: [
                    {
                        "userDetails._id": new mongoose.Types.ObjectId(
                            companyId
                        ),
                    },
                    {
                        "userDetails.companyId": new mongoose.Types.ObjectId(
                            companyId
                        ),
                    },
                ],
            },
        },
        {
            $group: {
                _id: "$assign",
                avatar: { $first: "$userDetails.avatar" },
                id: { $first: "$userDetails._id" },
                role: { $first: "$userDetails.role" },
            },
        },
        {
            $project: {
                _id: 0,
                userId: "$_id",
                avatar: 1,
                id: 1,
                role: 1,
            },
        },
    ]);
};

// Static method to filter subtasks within a company
subUsertaskSchema.statics.filterSubTasksForCompany = function (
    query,
    companyId
) {
    const finalQuery = { ...query, companyId };
    return this.find(finalQuery).populate("assignedBy", "name avatar").exec();
};

const subUserTask = mongoose.model("subUserTask", subUsertaskSchema);
export { subUserTask };
