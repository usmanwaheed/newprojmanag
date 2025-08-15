import mongoose from "mongoose";

const pdfSchema = new mongoose.Schema(
    {
        description: {
            type: String,
            required: true,
            trim: true,
        },
        pdf: {
            type: String,
            required: true,
        },
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
pdfSchema.index({ companyId: 1 });
pdfSchema.index({ uploadedBy: 1 });

// Static method to get PDFs for a specific company
pdfSchema.statics.getPdfsForCompany = function (companyId) {
    return this.find({ companyId }).populate("uploadedBy", "name avatar");
};

// Static method to get PDF by ID and company (for security)
pdfSchema.statics.getPdfByIdAndCompany = function (pdfId, companyId) {
    return this.findOne({ _id: pdfId, companyId }).populate(
        "uploadedBy",
        "name avatar"
    );
};

export const uploadSinglePdf = mongoose.model("UploadSinglePdf", pdfSchema);
