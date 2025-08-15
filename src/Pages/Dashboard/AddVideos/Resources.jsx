import Videos from "./Videos";
import Pdf from "./Pdf";
import Recordings from "./Recordings";
import { Stack, Typography, useTheme } from "@mui/material";

const Resources = ({ searchTerm }) => {
  const theme = useTheme();

  return (
    <Stack spacing={4}>
      {/* Videos Section */}
      <div>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 2,
            color: theme.palette.mode === 'dark'
              ? theme.palette.text.primary
              : theme.palette.text.primary,
            pb: 1,
            display: 'inline-block'
          }}
        >
          Uploaded Videos
        </Typography>
        <Videos searchTerm={searchTerm} />
      </div>

      {/* PDFs Section */}
      <div>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 2,
            color: theme.palette.mode === 'dark'
              ? theme.palette.text.primary
              : theme.palette.text.primary,
            pb: 1,
            display: 'inline-block'
          }}
        >
          Project Documents
        </Typography>
        <Pdf
          searchTerm={searchTerm}
          showForm={false}
          showList={true}
        />
      </div>

      {/* Recordings Section */}
      <div>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 2,
            color: theme.palette.mode === 'dark'
              ? theme.palette.text.primary
              : theme.palette.text.primary,
            pb: 1,
            display: 'inline-block'
          }}
        >
          Meeting Recordings
        </Typography>
        <Recordings />
      </div>
    </Stack>
  );
};

export default Resources;