/* eslint-disable no-undef */
import dotenv from "dotenv";
dotenv.config();
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    let response = null;
    try {
        if (!localFilePath) return null;

        // Ensure if the file exists
        if (!fs.existsSync(localFilePath)) {
            throw new Error(`File not found ${localFilePath}`);
        }

        // Upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "raw", // Changed from "auto" to "raw" for PDFs
            type: "upload",
            access_mode: "public",
            invalidate: true, // Ensures CDN cache is cleared
            use_filename: true, // Better for tracking
            unique_filename: false,
        });
        return response;
    } catch (error) {
        console.log("Cloudinary utils error", error);
        return null;
    } finally {
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
            // console.log(`File ${localFilePath} removed successfully.`);
        } else {
            console.log(`File ${localFilePath} not found, nothing to remove.`);
        }
    }
};

// In cloudinary.js
export const deleteFromCloudinary = async (
    publicId,
    resourceType = "video"
) => {
    try {
        // Remove file extension if present
        const cleanPublicId = publicId.replace(/\.[^/.]+$/, "");

        const response = await cloudinary.uploader.destroy(cleanPublicId, {
            resource_type: resourceType,
            invalidate: true, // Optional: clears CDN cache
        });
        console.log("reponse from cloudinary delete", response);
        if (response.result !== "ok") {
            console.warn("Cloudinary deletion warning:", response);
        }
        return response;
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        throw error; // Re-throw to handle in controller
    }
};

export { uploadOnCloudinary };
