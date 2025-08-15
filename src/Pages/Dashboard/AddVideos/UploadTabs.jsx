import { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import Uploads from "./Uploads";
import Pdf from "./Pdf";

export default function UploadTabs() {
    const [activeUploadTab, setActiveUploadTab] = useState(0);

    const handleTabChange = (_, newVal) => setActiveUploadTab(newVal);

    return (
        <Box>
            {/* Tabs */}
            <Tabs
                value={activeUploadTab}
                onChange={handleTabChange}
                aria-label="upload tabs"
                sx={{ mb: 3 }}
            >
                <Tab label="Upload Video" />
                <Tab label="Upload PDF" />
            </Tabs>

            {/* Panels */}
            <Box>
                {activeUploadTab === 0 && <Uploads />}
                {activeUploadTab === 1 && <Pdf showForm={true} showList={false} />}
            </Box>
        </Box>
    );
}