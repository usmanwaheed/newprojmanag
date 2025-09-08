/* eslint-disable no-unused-vars */
import style from "./style.module.scss";
import MoreVertIcon from '@mui/icons-material/MoreVert';


import {
  Table, Box, Stack,
  Typography, Avatar,
  Grid, MenuItem,
  Menu, IconButton,
  TableRow, TableHead,
  TableCell, TableBody,
  Button, TableContainer,
  FormControl, Select,
} from "@mui/material";


import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-toastify";

import { getProjectMembers, assignProjectRole } from "../../../../api/projectRoles";
import { getCompanyUsers } from "../../../../api/authApi";
import { useAuth } from "../../../../context/AuthProvider";
import { usersTimeProject } from "../../../../api/userTracker";
import { RouteNames } from "../../../../Constants/route";



export default function Teams() {
  const { user, theme, mode } = useAuth();
  const tableGap = mode === 'light' ? style.tableBodyLight : style.tableBodyDark;
  const tableClassText = mode === 'light' ? 'lightTableText' : 'darkTableText';

  const { id: projectId } = useParams();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const queryClient = useQueryClient();

  const handleMenuClick = (event, memberId) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(memberId);
  };

  const { data: membersRes } = useQuery({
    queryKey: ['projectMembers', projectId],
    queryFn: () => getProjectMembers(projectId),
    enabled: !!projectId,
  });
  const members = membersRes?.data || [];
  const QcAdmins = members
    .filter((m) => m.role === 'qcadmin')
    .map((m) => ({ ...m.userId, id: m.userId._id, userId: m.userId.name, role: 'qcadmin' }));
  const Users = members
    .filter((m) => m.role === 'user')
    .map((m) => ({ ...m.userId, id: m.userId._id, userId: m.userId.name, role: 'user' }));

  const { data: companyUsersRes } = useQuery({
    queryKey: ['companyUsers'],
    queryFn: getCompanyUsers,
    enabled: user?.role === 'company',
  });
  const companyUsers = companyUsersRes?.data || [];
  const existingIds = new Set(members.map((m) => m.userId._id));
  const availableUsers = companyUsers.filter((u) => !existingIds.has(u._id));
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('user');

  const mutation = useMutation({
    mutationFn: assignProjectRole,
    onSuccess: () => {
      queryClient.invalidateQueries(['projectMembers', projectId]);
      toast.success('Member updated', { position: 'top-center', autoClose: 2000, hideProgressBar: false, pauseOnHover: false });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Action failed', { position: 'top-center', autoClose: 2000, hideProgressBar: false, pauseOnHover: false });
    }
  });

  const handleAddMember = () => {
    if (!selectedUser) return;
    mutation.mutate({ projectId, userId: selectedUser, role: selectedRole });
    setSelectedUser('');
    setSelectedRole('user');
  };

  const handleChangeRole = (role) => {
    if (!selectedMember) return;
    mutation.mutate({ projectId, userId: selectedMember, role });
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };


  const { id: ProjectId } = useParams();

  const { data: usersData } = useQuery({
    queryKey: ['elapsedTime', ProjectId],
    queryFn: () => usersTimeProject(ProjectId),
    enabled: !!ProjectId,
  })

  // console.log("Thsi one is userData", projectId)
  const location = useLocation();
  const isTeamPage = location.pathname.includes(`${RouteNames.TEAMPAGE}`)

  return (
    <Stack variant="div" gap={8} my={4}>
      {!isTeamPage && (
        <>
          {user.role === 'company' && (
            <Stack direction="row" spacing={2} mb={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select value={selectedUser} displayEmpty onChange={(e) => setSelectedUser(e.target.value)}>
                  <MenuItem value="">Select User</MenuItem>
                  {availableUsers.map((u) => (
                    <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="qcadmin">QC Admin</MenuItem>
                </Select>
              </FormControl>
              <Button variant="outlined" onClick={handleAddMember}>Add</Button>
            </Stack>
          )}
          <Box>
            <Typography variant="h6" mb={1} className={tableClassText}>
              Team: (QcAdmin)
            </Typography>

            {QcAdmins.length > 0 ? (
              <Grid container spacing={3} ml="1px">
                {QcAdmins?.map((person, index) => (
                  <Stack key={index} className={`${style.boxDropDown}`} sx={{ alignItems: 'center' }}>
                    <Grid item className={style.gridBox}>
                      <Avatar alt={person.name} src={person.avatar} sx={{ width: 55, height: 55 }} />
                      <Typography variant="body2" align="center" sx={{ marginTop: 1, fontSize: '0.8rem', textAlign: 'center' }}>
                        {person.userId}
                      </Typography>

                      {person.role === "qcadmin" ? (
                        <Typography className={style.QC}>QC</Typography>
                      ) : (
                        <IconButton onClick={(event) => handleMenuClick(event, person.id)}
                          className={style.iconButton}>
                          <MoreVertIcon />
                        </IconButton>
                      )}
                    </Grid>
                  </Stack>
                ))}
              </Grid>
            ) : (
              <Typography variant="p" mb={3} className={style.noTaskAssignText}>
                No tasks assigned QcAdmin
              </Typography>
            )}
          </Box>



          {/* TEAM USERS */}
          <Box>
            <Typography variant="h6" mb={1} className={tableClassText}>
              Team: (users)
            </Typography>

            {Users.length > 0 ? (
              <Grid container spacing={3} ml="1px">

                {Users?.map((person, index) => (
                  <Stack key={index} className={`${style.boxDropDown}`} sx={{ alignItems: 'center' }}>
                    <Grid item className={style.gridBox}>
                      <Link to={`/${RouteNames.TEAMPAGE}/${RouteNames.GETUSERPAGE}/${person.id}`} style={{ textDecoration: "none" }}>
                        <Avatar alt={person.name} src={person.avatar} sx={{ width: 55, height: 55 }} />
                        <Typography variant="body2" align="center" sx={{ marginTop: 1, fontSize: '0.8rem', textAlign: 'center', color: "grey" }}>{person.userId}</Typography>
                      </Link>

                      {person.role === "user" ? (
                        <Typography className={style.QC}>U</Typography>
                      ) : null}

                      <IconButton
                        onClick={(event) => handleMenuClick(event, person.id)}
                        className={style.iconButton}>
                        <MoreVertIcon />
                      </IconButton>
                    </Grid>

                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }} classes={{ paper: style.dropdown }}>

                      <MenuItem onClick={() => handleChangeRole('qcadmin')} className={style.boxMenuItem}>Promote to QC</MenuItem>
                    </Menu>
                  </Stack>

                ))}
              </Grid>
            ) : (
              <Typography variant="p" mb={3} className={style.noTaskAssignText}>
                No tasks assigned users
              </Typography>
            )}
          </Box>

          <TableContainer>
            <Typography variant="h6" mb={1} className={tableClassText}>
              Employee&apos;s Time-Track
            </Typography>
            <Table
              sx={{
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                overflow: 'visible',
                borderRadius: '0.6rem'
              }}>

              <TableHead>
                <TableRow className={style.tableRowHead}>
                  <TableCell className={tableClassText}>Employee</TableCell>
                  <TableCell align="center" className={tableClassText}>TimeIn</TableCell>
                  <TableCell align="center" className={tableClassText}>TimeOut</TableCell>
                  <TableCell align="center" className={tableClassText}>Tracked Time</TableCell>
                  <TableCell align="center" className={tableClassText}>Date</TableCell>
                  <TableCell align="center" className={tableClassText}>Weekly Time</TableCell>
                  <TableCell align="center" className={tableClassText}>Monthly Time</TableCell>
                </TableRow>
              </TableHead>

              <TableBody className={tableGap}>
                <TableRow className={style.tableRowBody}>
                  <TableCell component="th" scope="row">1</TableCell>
                  <TableCell align="center">21:04</TableCell>
                  <TableCell align="center">3</TableCell>
                  <TableCell align="center">4</TableCell>
                  <TableCell align="center">5</TableCell>
                  <TableCell align="center">6</TableCell>
                  <TableCell align="center">$7</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      <Outlet />
    </Stack>
  )
}