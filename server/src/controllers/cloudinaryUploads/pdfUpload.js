import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiError } from "../../utils/apiError.js";
import {
    deleteFromCloudinary,
    uploadOnCloudinary,
} from "../../utils/cloudinary.js";
import { uploadSinglePdf } from "../../models/Video_SubTask/pdfUpload.js";
import { apiResponse } from "../../utils/apiResponse.js";
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

const uploadPdfController = asyncHandler(async (req, res) => {
    const file = req.file;
    const { description } = req.body;
    const companyId = getUserCompanyId(req.user);
    // console.log("Uploading")
    if (!companyId) {
        throw new apiError(400, "Company ID is required to upload PDFs.");
    }

    if (!description) {
        throw new apiError(400, "PDF description not provided");
    }
    if (!file) {
        throw new apiError(400, "No PDF file uploaded");
    }

    if (file.size > 10 * 1024 * 1024) {
        throw new apiError(400, "PDF size is greater than 10MB");
    }

    // Upload the file to Cloudinary
    const localFilePath = file.path;
    const uploadResult = await uploadOnCloudinary(localFilePath);

    if (!uploadResult) {
        throw new apiError(400, "Failed to upload PDF to Cloudinary");
    }

    const pdfUrl = uploadResult.secure_url;

    const newPdfSubTask = await uploadSinglePdf.create({
        description,
        pdf: pdfUrl,
        companyId: companyId,
        uploadedBy: req.user._id,
    });

    res.status(200).json(
        new apiResponse(200, newPdfSubTask, "PDF uploaded successfully")
    );
});

const getAllPdfController = asyncHandler(async (req, res) => {
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to fetch PDFs.");
    }

    // Only fetch PDFs that belong to the user's company
    const pdfData = await uploadSinglePdf.getPdfsForCompany(companyId);

    if (!pdfData.length) {
        return res.status(200).json(new apiResponse(200, [], "No PDFs found"));
    }

    res.status(200).json(
        new apiResponse(200, pdfData, "Uploaded PDFs fetched successfully")
    );
});

const deletePdfController = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to delete PDFs.");
    }

    // Find the PDF record with company verification
    const pdfRecord = await uploadSinglePdf.getPdfByIdAndCompany(id, companyId);
    if (!pdfRecord) {
        throw new apiError(404, "PDF not found or access denied");
    }

    // Improved public ID extraction
    const pdfUrl = pdfRecord.pdf;
    let publicId;

    try {
        // Extract public ID from URL (works for most Cloudinary URL formats)
        const urlParts = pdfUrl.split("/");
        const uploadIndex = urlParts.findIndex((part) => part === "upload") + 1;
        publicId = urlParts.slice(uploadIndex).join("/").split(".")[0];

        // Delete from Cloudinary (specify resource_type as 'raw' for PDFs)
        const cloudinaryResponse = await deleteFromCloudinary(publicId, "raw");

        // Graceful handling if Cloudinary deletion fails
        if (!cloudinaryResponse || cloudinaryResponse.result !== "ok") {
            console.warn(
                `Cloudinary PDF deletion warning for ${publicId}:`,
                cloudinaryResponse
            );
            // Continue with database deletion anyway
        }
    } catch (error) {
        console.error("Error during Cloudinary PDF deletion:", error);
        // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    try {
        await uploadSinglePdf.findByIdAndDelete(id);
        res.status(200).json(
            new apiResponse(200, {}, "PDF deleted successfully")
        );
    } catch (dbError) {
        console.error("Database deletion error:", dbError);
        throw new apiError(500, "Failed to delete PDF record from database");
    }
});

const searchPdfsController = asyncHandler(async (req, res) => {
    const { query } = req.query;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to search PDFs.");
    }

    if (!query) {
        throw new apiError(400, "Search query is required");
    }

    // Search only within the company's PDFs
    const searchResults = await uploadSinglePdf.find({
        companyId: companyId,
        $or: [
            { description: { $regex: query, $options: "i" } },
            // Add other searchable fields here if needed
        ],
    });

    if (!searchResults.length) {
        return res
            .status(200)
            .json(
                new apiResponse(200, [], "No PDFs found matching your search")
            );
    }

    res.status(200).json(
        new apiResponse(
            200,
            searchResults,
            "PDF search results fetched successfully"
        )
    );
});

export {
    uploadPdfController,
    getAllPdfController,
    deletePdfController,
    searchPdfsController,
};
