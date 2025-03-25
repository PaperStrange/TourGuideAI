import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GppBadIcon from '@mui/icons-material/GppBad';
import permissionsService from '../../services/PermissionsService';
import { useCurrentPermissions } from '../../hooks';

/**
 * UserPermissionsCard Component
 * 
 * Displays the current user's roles and permissions
 */
const UserPermissionsCard = () => {
  const { 
    permissions, 
    roles, 
    isAdmin, 
    isModerator, 
    isBetaTester,
    isLoading 
  } = useCurrentPermissions();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  // Group permissions by category
  const groupedPermissions = {};
  permissions.forEach(permission => {
    const category = permission.split(':')[0];
    if (!groupedPermissions[category]) {
      groupedPermissions[category] = [];
    }
    groupedPermissions[category].push(permission);
  });

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        <SecurityIcon sx={{ mr: 1, verticalAlign: 'text-bottom' }} />
        Security Roles & Permissions
      </Typography>
      
      <Box mt={2}>
        <Typography variant="subtitle1">
          Your Roles
        </Typography>
        <Box display="flex" gap={1} mt={1} mb={2}>
          {isAdmin && (
            <Chip 
              icon={<VerifiedUserIcon />} 
              label="Admin" 
              color="error" 
              variant="outlined" 
            />
          )}
          {isModerator && (
            <Chip 
              icon={<VerifiedUserIcon />} 
              label="Moderator" 
              color="warning" 
              variant="outlined" 
            />
          )}
          {isBetaTester && (
            <Chip 
              icon={<VerifiedUserIcon />} 
              label="Beta Tester" 
              color="primary" 
              variant="outlined" 
            />
          )}
          {!isAdmin && !isModerator && !isBetaTester && (
            <Chip 
              icon={<GppBadIcon />} 
              label="No Roles" 
              color="default" 
              variant="outlined" 
            />
          )}
        </Box>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="subtitle1" gutterBottom>
        Your Permissions
      </Typography>

      {Object.keys(groupedPermissions).length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          You don't have any specific permissions assigned.
        </Typography>
      ) : (
        <List dense sx={{ mb: 1 }}>
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <Box key={category} mb={2}>
              <Typography 
                variant="subtitle2" 
                color="primary" 
                sx={{ textTransform: 'capitalize' }}
              >
                {category}
              </Typography>
              {perms.map(permission => (
                <ListItem key={permission} dense>
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    <LockIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={permission.split(':')[1]} 
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      sx: { textTransform: 'capitalize' }
                    }}
                  />
                </ListItem>
              ))}
            </Box>
          ))}
        </List>
      )}
      
      <Typography variant="caption" color="text.secondary">
        These permissions determine what actions you can perform within the beta program.
      </Typography>
    </Paper>
  );
};

export default UserPermissionsCard; 