import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "The project title is required"],
            maxlength: [100, "The title should be no longer than 100 characters"],
        },
        description: {
            type: String,
            maxLength: [
                2000,
                "The description should be no longer than 2000 characters",
            ],
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        dueDate: {
            type: Date,
            required: [true, "The due date is required"],
        },
        status: {
            type: String,
            enum: ["progress", "completed", "approved"],
            default: "progress",
        },
        points: {
            type: Number,
            default: 50,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },
        // NEW: Company reference for security
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company", // 👈 better to point to a Company model
            required: true,
        },
        // Users assigned to the project
        users: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "UserInfo",
            },
        ],
    },
    { timestamps: true }
);

// Indexes for efficient querying
projectSchema.index({ companyId: 1 });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ companyId: 1, status: 1 });

// Static method to get projects for a specific company
projectSchema.statics.getProjectsForCompany = function (companyId) {
    return this.find({ companyId })
        .populate("createdBy", "name avatar")
        .exec();
};

// Static method to get project by ID and company
projectSchema.statics.getProjectByIdAndCompany = function (projectId, companyId) {
    return this.findOne({ _id: projectId, companyId }).populate(
        "createdBy",
        "name avatar"
    );
};

// Static method to get completed projects for a company
projectSchema.statics.getCompletedProjectsForCompany = function (companyId) {
    return this.find({ status: "completed", companyId }).populate(
        "createdBy",
        "name avatar"
    );
};

// Static method to get assigned users for a company project
projectSchema.statics.getAssignedUsersForProject = function (projectId, companyId) {
    return this.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(projectId),
                companyId: new mongoose.Types.ObjectId(companyId),
            },
        },
        { $unwind: "$users" },
        {
            $lookup: {
                from: "userinfos",
                localField: "users",
                foreignField: "_id",
                as: "userDetails",
            },
        },
        { $unwind: "$userDetails" },
        {
            $group: {
                _id: "$userDetails._id",
                avatar: { $first: "$userDetails.avatar" },
                role: { $first: "$userDetails.role" },
                name: { $first: "$userDetails.name" },
            },
        },
        {
            $project: {
                _id: 0,
                userId: "$_id",
                name: 1,
                avatar: 1,
                role: 1,
            },
        },
    ]);
};

// Static method to filter projects within a company
projectSchema.statics.filterProjectsForCompany = function (query, companyId) {
    const finalQuery = { ...query, companyId };
    return this.find(finalQuery).populate("createdBy", "name avatar").exec();
};

const Project = mongoose.model("Project", projectSchema);
export { Project };
