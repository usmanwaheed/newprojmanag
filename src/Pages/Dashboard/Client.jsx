import { useState } from "react";
import { Box, Stack, Tabs, Tab, TextField } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import style from "./DashboardScss/project.module.scss";
import { useAuth } from "../../context/AuthProvider";
import { RouteNames } from "../../Constants/route";

import Resources from "./AddVideos/Resources";
import UploadTabs from "./AddVideos/UploadTabs";
import NewRecording from "./AddVideos/Record2/NewRecording";

export default function Client() {
  const { theme, mode } = useAuth();
  const themeTab = mode === "light" ? "#36454F" : theme.palette.text.primary;

  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();
  const isSingleVideoPage = location.pathname.includes(RouteNames.SINGLEVIDEO);

  const handleTabChange = (_, val) => setActiveTab(val);
  const handleSearch = (e) => setSearchTerm(e.target.value);

  return (
    <Box>
      {!isSingleVideoPage && (
        <>
          {/* Search only for Resources */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              TabIndicatorProps={{ sx: { display: "none" } }}
              sx={{ backgroundColor: theme.palette.background.default }}
              className={style.Tabs}
            >
              <Tab
                label="Resources"
                sx={(t) => ({
                  backgroundColor:
                    activeTab === 0
                      ? t.palette.background.paper
                      : "transparent",
                  color:
                    activeTab === 0
                      ? `${themeTab} !important`
                      : "grey",
                  fontWeight: activeTab === 0 ? 600 : 500,
                })}
              />
              <Tab
                label="Upload"
                sx={(t) => ({
                  backgroundColor:
                    activeTab === 1
                      ? t.palette.background.paper
                      : "transparent",
                  color:
                    activeTab === 1
                      ? `${themeTab} !important`
                      : "grey",
                  fontWeight: activeTab === 1 ? 600 : 500,
                })}
              />
              <Tab
                label="Record"
                sx={(t) => ({
                  backgroundColor:
                    activeTab === 2
                      ? t.palette.background.paper
                      : "transparent",
                  color:
                    activeTab === 2
                      ? `${themeTab} !important`
                      : "grey",
                  fontWeight: activeTab === 2 ? 600 : 500,
                })}
              />
            </Tabs>

            {activeTab === 0 && (
              <TextField
                size="small"
                placeholder="Search videos & PDFs"
                value={searchTerm}
                onChange={handleSearch}
                sx={{ width: 300 }}
              />
            )}
          </Stack>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && (
              <Resources searchTerm={searchTerm} />
            )}

            {activeTab === 1 && <UploadTabs />}
            {activeTab === 2 && <NewRecording />}
            {/* {activeTab === 3 && <RecordSmallPopup />} */}
          </Box>
        </>
      )}

      <Outlet />
    </Box>
  );
}