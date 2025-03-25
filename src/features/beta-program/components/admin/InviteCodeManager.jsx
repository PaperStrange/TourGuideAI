import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Add as AddIcon, 
  ContentCopy as CopyIcon, 
  Block as BlockIcon, 
  Check as CheckIcon 
} from '@mui/icons-material';
import inviteCodeService from '../../services/InviteCodeService';
import { Permission } from '../auth';
import { PERMISSIONS } from '../../services/PermissionsService';

/**
 * Invite Code Manager Component
 * Admin interface for managing beta invitation codes
 */
const InviteCodeManager = () => {
  // State
  const [inviteCodes, setInviteCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCode, setNewCode] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [codeToInvalidate, setCodeToInvalidate] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [generateLoading, setGenerateLoading] = useState(false);

  // Load invite codes
  useEffect(() => {
    fetchInviteCodes();
  }, []);

  // Fetch all invite codes
  const fetchInviteCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const codes = await inviteCodeService.getAllCodes();
      setInviteCodes(codes);
    } catch (error) {
      console.error('Error fetching invite codes:', error);
      setError('Failed to load invitation codes');
    } finally {
      setLoading(false);
    }
  };

  // Generate a new invitation code
  const handleGenerateCode = async () => {
    try {
      setGenerateLoading(true);
      setError(null);
      const code = await inviteCodeService.generateCode();
      setNewCode(code);
      setOpenDialog(true);
      // Refresh the list
      fetchInviteCodes();
    } catch (error) {
      console.error('Error generating invite code:', error);
      setError('Failed to generate invitation code');
    } finally {
      setGenerateLoading(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  // Invalidate a code
  const handleInvalidateCode = async (code) => {
    try {
      setError(null);
      await inviteCodeService.invalidateCode(code);
      // Refresh the list
      fetchInviteCodes();
    } catch (error) {
      console.error('Error invalidating invite code:', error);
      setError('Failed to invalidate invitation code');
    }
  };

  // Confirm invalidation
  const confirmInvalidation = (code) => {
    setCodeToInvalidate(code);
  };

  // Handle dialog close
  const handleClose = () => {
    setOpenDialog(false);
    setNewCode(null);
    setCodeToInvalidate(null);
  };

  // Handle confirm invalidation
  const handleConfirmInvalidation = async () => {
    if (codeToInvalidate) {
      await handleInvalidateCode(codeToInvalidate);
      setCodeToInvalidate(null);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Invitation Code Management</Typography>
        <Permission permission={PERMISSIONS.CREATE_INVITE}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleGenerateCode}
            disabled={generateLoading}
          >
            {generateLoading ? <CircularProgress size={24} /> : 'Generate New Code'}
          </Button>
        </Permission>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Used By</TableCell>
                <Permission permission={PERMISSIONS.UPDATE_INVITE}>
                  <TableCell>Actions</TableCell>
                </Permission>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : inviteCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No invitation codes found. Generate a new one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                inviteCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {code.code}
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopyCode(code.code)}
                          color={copiedCode === code.code ? "success" : "default"}
                        >
                          {copiedCode === code.code ? <CheckIcon /> : <CopyIcon />}
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {code.isValid && !code.usedBy ? (
                        <Chip label="Valid" color="success" size="small" />
                      ) : code.usedBy ? (
                        <Chip label="Used" color="primary" size="small" />
                      ) : (
                        <Chip label="Invalid" color="error" size="small" />
                      )}
                    </TableCell>
                    <TableCell>{formatDate(code.createdAt)}</TableCell>
                    <TableCell>{formatDate(code.expiresAt)}</TableCell>
                    <TableCell>{code.usedBy || '-'}</TableCell>
                    <Permission permission={PERMISSIONS.UPDATE_INVITE}>
                      <TableCell>
                        {code.isValid && !code.usedBy && (
                          <IconButton 
                            color="error" 
                            size="small"
                            onClick={() => confirmInvalidation(code.code)}
                          >
                            <BlockIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </Permission>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* New Code Dialog */}
      <Dialog open={openDialog && newCode} onClose={handleClose}>
        <DialogTitle>New Invitation Code Generated</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Share this code with beta testers to grant them access. The code will expire after 14 days.
          </DialogContentText>
          <Box mt={2} mb={2}>
            <TextField
              fullWidth
              variant="outlined"
              value={newCode?.code || ''}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <IconButton 
                    onClick={() => handleCopyCode(newCode?.code)}
                    color={copiedCode === newCode?.code ? "success" : "default"}
                  >
                    {copiedCode === newCode?.code ? <CheckIcon /> : <CopyIcon />}
                  </IconButton>
                )
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Invalidation Confirmation Dialog */}
      <Dialog open={!!codeToInvalidate} onClose={handleClose}>
        <DialogTitle>Invalidate Invitation Code</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to invalidate this invitation code? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Permission permission={PERMISSIONS.UPDATE_INVITE}>
            <Button onClick={handleConfirmInvalidation} color="error">
              Invalidate
            </Button>
          </Permission>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InviteCodeManager; 