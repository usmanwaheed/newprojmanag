import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
    {
        projectTitle: {
            type: String,
            // required: [true, "The project title is required"],
            maxlength: [40, "The title should be no longer than 40 characters"],
        },
        teamLeadName: {
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
        projectStatus: {
            type: String,
            default: "pending",
            enum: ["pending", "approved", "not approved"],
        },
        members: {
            type: Number,
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        dueDate: {
            type: Date,
            required: [true, "The Due Date is required"],
        },
        budget: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            default: "In Progress",
            enum: ["In Progress", "Completed"],
        },
        points: {
            type: String,
            default: 100,
        },
        profileImage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },
        // NEW: Company reference to link tasks to specific companies
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },
        link: {
            type: String,
        },
    },
    { timestamps: true }
);

// Add indexes for efficient querying
taskSchema.index({ companyId: 1 });
taskSchema.index({ assignedBy: 1 });
taskSchema.index({ companyId: 1, assignedBy: 1 });

// Static method to get tasks for a specific company
taskSchema.statics.getTasksForCompany = function (companyId) {
    return this.find({ companyId }).populate("assignedBy", "name avatar");
};

// Static method to get task by ID and company (for security)
taskSchema.statics.getTaskByIdAndCompany = function (taskId, companyId) {
    return this.findOne({ _id: taskId, companyId }).populate(
        "assignedBy",
        "name avatar"
    );
};

const adminTask = mongoose.model("userTask", taskSchema);
export { adminTask };
