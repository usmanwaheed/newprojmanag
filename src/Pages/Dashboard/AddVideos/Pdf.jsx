import React, { useState } from "react";
import {
  Box, Button, TextField, Typography,
  Snackbar, Alert, Skeleton, IconButton,
  Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions,
  useTheme, useMediaQuery, Stack
} from "@mui/material";
import { styled } from "@mui/system";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import style from "./styles.module.scss";
import {
  useAddPdf, useDeletePdf, useFetchPdfs
} from "./videoApi/addVideo";
import { useAuth } from "../../../context/AuthProvider";

const StyledInput = styled("input")({ display: "none" });

export default function Pdf({
  searchTerm = "",
  showForm = true,
  showList = true
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfURL, setPdfURL] = useState("");
  const [description, setDescription] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info"
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState(null);

  const { mutate: uploadPdf, isLoading: uploading } = useAddPdf();
  const { mutate: deletePdf } = useDeletePdf();
  const { data: pdfs, isLoading: loadingPdfs } = useFetchPdfs();
  const { user } = useAuth();

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf" || file.size > 10e6) {
      return setSnackbar({
        open: true,
        message: "Must be a PDF ≤ 10 MB",
        severity: "error"
      });
    }
    setPdfFile(file);
    setPdfURL(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pdfFile || !description) {
      return setSnackbar({
        open: true,
        message: "Provide file & description",
        severity: "error"
      });
    }

    const companyId = user?.companyId || user?.companyId?._id || user?._id;
    if (!companyId) {
      return setSnackbar({
        open: true,
        message: "Company ID not found",
        severity: "error"
      });
    }

    const form = new FormData();
    form.append("pdf", pdfFile);
    form.append("description", description);
    form.append("companyId", companyId);

    uploadPdf(form, {
      onSuccess: () => {
        setSnackbar({
          open: true,
          message: "PDF uploaded successfully!",
          severity: "success"
        });
        setPdfFile(null);
        setPdfURL("");
        setDescription("");
      },
      onError: (error) => {
        const errorMsg = error.response?.data?.message || "Upload failed. Try again.";
        setSnackbar({
          open: true,
          message: errorMsg,
          severity: "error"
        });
      }
    });
  };

  const handleDeleteClick = (pdfId, event) => {
    event.preventDefault();
    event.stopPropagation();
    setPdfToDelete(pdfId);
    setOpenDialog(true);
  };

  const handleConfirmDelete = () => {
    deletePdf(pdfToDelete, {
      onSuccess: () => {
        setSnackbar({
          open: true,
          message: "PDF deleted successfully!",
          severity: "success"
        });
      },
      onError: () => {
        setSnackbar({
          open: true,
          message: "Failed to delete PDF",
          severity: "error"
        });
      }
    });
    setOpenDialog(false);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleDownload = (pdfUrl, event) => {
    event.preventDefault();
    event.stopPropagation();
    window.open(pdfUrl, '_blank');
  };

  // Filtered list
  const allPdfs = Array.isArray(pdfs?.data) ? pdfs.data : [];
  const filteredList = showList
    ? allPdfs.filter(p =>
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : [];

  // Skeleton Loading (2 rows)
  if (loadingPdfs) {
    return (
      <Box sx={{ overflow: "hidden", width: "100%" }}>
        <Box sx={{ display: "flex", overflowX: "auto", gap: 2, pb: 2 }}>
          {[...Array(8)].map((_, index) => (
            <Box key={index} sx={{ minWidth: 240, flexShrink: 0 }}>
              <Skeleton variant="rectangular" width={240} height={140} />
              <Box sx={{ pt: 1 }}>
                <Skeleton width="60%" />
                <Skeleton width="40%" />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Stack spacing={4}>
      {/* Upload Form */}
      {showForm && (
        <Box component="form" onSubmit={handleSubmit} className={style.mainContainer}>

          <Stack spacing={3}>
            <label htmlFor="pdf-upload" style={{ width: 'fit-content' }}>
              <StyledInput
                accept="application/pdf"
                id="pdf-upload"
                type="file"
                onChange={handlePdfChange}
              />
              <Button variant="contained" component="span" fullWidth className={style.dialogBtnSecondary}>
                {pdfFile ? pdfFile.name : "Choose PDF"}
              </Button>
            </label>

            {pdfURL && (
              <Box className={style.previewPdf}>
                <Typography variant="subtitle1">Preview</Typography>
                <iframe
                  src={pdfURL}
                  width="100%"
                  height="300px"
                  style={{ borderRadius: 8, border: "1px solid #ddd" }}
                />
              </Box>
            )}

            <TextField
              label="Description"
              multiline
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              fullWidth
            />

            <Button
              type="submit"
              variant="outlined"
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Submit"}
            </Button>
          </Stack>
        </Box>
      )}

      {/* PDF List with Horizontal Scroll */}
      {showList && (
        <Box>


          {filteredList.length ? (
            <Box
              sx={{
                display: "flex",
                overflowX: "auto",
                gap: 2,
                pb: 2,
                scrollbarWidth: "thin",
                "&::-webkit-scrollbar": {
                  height: "8px",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: theme.palette.grey[400],
                  borderRadius: "4px",
                },
              }}
            >
              {filteredList.map((pdf) => (
                <Box
                  key={pdf._id}
                  sx={{
                    minWidth: isMobile ? 180 : 240,
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      height: 260,
                      overflow: "hidden",
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      mb: 1,
                      position: "relative"
                    }}
                  >
                    <iframe
                      src={`${pdf.pdf}#page=1&view=fitH`}
                      width="100%"
                      height="100%"
                      style={{
                        border: "none",
                        overflow: "hidden",
                      }}
                      title={pdf.description}
                    />
                    {/* Action Buttons */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        display: "flex",
                        gap: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        borderRadius: 1,
                        p: 0.5
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => handleDeleteClick(pdf._id, e)}
                        sx={{ color: 'white' }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    className={style.textClamp}
                  >
                    {pdf.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ p: 2, textAlign: "center" }}>
              {searchTerm ? "No matching PDFs found" : "No PDFs uploaded yet"}
            </Typography>
          )}
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Delete PDF</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this PDF? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}