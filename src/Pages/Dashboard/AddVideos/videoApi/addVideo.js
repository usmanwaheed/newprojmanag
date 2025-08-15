/* eslint-disable react-hooks/rules-of-hooks */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../../../api/axiosInstance"

// VIDEO API"S 
// Upload The Video Code 
const addVideo = async (data) => {
    try {
        const response = await axiosInstance.post('/user/video-upload', data);
        const result = response.data;
        console.log(result);
        return response.data;
    } catch (error) {
        console.log("Error from addVideo (Dashboard/AddVideos)", error);
    }
}
export const useAddVideo = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addVideo,
        onSuccess: (data) => {
            queryClient.setQueryData(['useUploadVideo'], data)
            console.log("Data is from the useAddVideo (Dashboard/AddVideos)", data);
        }
    })
}

// Get All Videos Data Code
const fetchVideos = async () => {
    try {
        const response = await axiosInstance.get('/user/get-video-upload');
        return response.data;
    } catch (error) {
        console.error("Error fetching videos:", error);
        throw error;
    }
};
export const useFetchVideos = () => {
    return useQuery({
        queryKey: ['useUploadVideo'],
        queryFn: fetchVideos,
    })
}

// Delete Video Code
const deleteVideo = async (videoId) => {
    try {
        const response = await axiosInstance.delete(`/user/delete-video/${videoId}`);
        return response.data;
    } catch (error) {
        console.log("Error from deleteVideo (Dashboard/AddVideos)", error);
        throw error;
    }
}

export const useDeleteVideo = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteVideo,
        onSuccess: () => {
            // Invalidate the videos query to refetch the updated list
            queryClient.invalidateQueries(['useUploadVideo']);
        }
    })
}

// Get Single Video Data Code
const getSingleVideo = async (videoId) => {
    const response = await axiosInstance.get(`/user/get-single-video-upload/${videoId}`)
    return response.data
}
export const usegetSingleVideo = (videoId) => {
    return useQuery({
        queryKey: ['useUploadVideo', videoId],
        queryFn: () => getSingleVideo(videoId),
        enabled: !!videoId,
    })
}

// Search Videos
const searchVideos = async (query) => {
    try {
        const response = await axiosInstance.get(`/user/search-videos?query=${query}`);
        return response.data;
    } catch (error) {
        console.error("Error searching videos:", error);
        throw error;
    }
};

export const useSearchVideos = (query) => {
    return useQuery({
        queryKey: ['searchVideos', query],
        queryFn: () => searchVideos(query),
        enabled: !!query,
    });
};



// PDF API"S 
// Upload PDF
const addPdf = async (data) => {
    try {
        const response = await axiosInstance.post('/user/pdf-upload', data, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return response.data;
    } catch (error) {
        console.error("Error uploading PDF:", error);
        throw error;
    }
};

export const useAddPdf = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addPdf,
        onSuccess: (data) => {
            queryClient.invalidateQueries(['pdfUploads']);
            console.log("PDF uploaded successfully:", data);
        },
    });
};


// Get All PDFs
const fetchPdfs = async () => {
    try {
        const response = await axiosInstance.get('/user/get-all-pdfs');
        return response.data;
    } catch (error) {
        console.error("Error fetching PDFs:", error);
        throw error;
    }
};

export const useFetchPdfs = () => {
    return useQuery({
        queryKey: ['pdfUploads'],
        queryFn: fetchPdfs,
    });
};


// Delete PDF
const deletePdf = async (publicId) => {
    try {
        const response = await axiosInstance.delete(`/user/delete-pdf/${publicId}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting PDF:", error);
        throw error;
    }
};

export const useDeletePdf = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deletePdf,
        onSuccess: () => {
            queryClient.invalidateQueries(["pdfUploads"]);
            console.log("PDF deleted successfully");
        },
    });
};

// Search PDFs
const searchPdfs = async (query) => {
    try {
        const response = await axiosInstance.get(`/user/search-pdfs?query=${query}`);
        return response.data;
    } catch (error) {
        console.error("Error searching PDFs:", error);
        throw error;
    }
};

export const useSearchPdfs = (query) => {
    return useQuery({
        queryKey: ['searchPdfs', query],
        queryFn: () => searchPdfs(query),
        enabled: !!query,
    });
};