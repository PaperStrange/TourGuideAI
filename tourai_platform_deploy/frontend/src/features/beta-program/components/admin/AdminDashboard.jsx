import React from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Paper, 
  Box, 
  Button,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AccessControl, Permission, Role } from '../auth';
import { PERMISSIONS } from '../../services/PermissionsService';

/**
 * Admin Dashboard Component
 * Central administrative interface with role-based content visibility
 */
const AdminDashboard = () => {
  const navigate = useNavigate();

  const mockUsers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'BETA_TESTER', lastActive: '2023-10-15' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'BETA_TESTER', lastActive: '2023-10-12' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'MODERATOR', lastActive: '2023-10-16' },
  ];

  const mockStats = {
    totalUsers: 254,
    activeBetaTesters: 178,
    pendingInvites: 25,
    activeInviteCodes: 42,
    totalFeedback: 156,
    bugReports: 23
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage your beta program, users, and application settings
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {/* Stats Overview */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>System Overview</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4">{mockStats.totalUsers}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Users</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4">{mockStats.activeBetaTesters}</Typography>
                  <Typography variant="body2" color="text.secondary">Active Testers</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4">{mockStats.pendingInvites}</Typography>
                  <Typography variant="body2" color="text.secondary">Pending Invites</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4">{mockStats.activeInviteCodes}</Typography>
                  <Typography variant="body2" color="text.secondary">Active Codes</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4">{mockStats.totalFeedback}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Feedback</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4">{mockStats.bugReports}</Typography>
                  <Typography variant="body2" color="text.secondary">Bug Reports</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Quick Actions" />
            <Divider />
            <CardContent>
              <List>
                <Permission permission={PERMISSIONS.CREATE_INVITE}>
                  <ListItem button onClick={() => navigate('/admin/invite-codes')}>
                    <ListItemText 
                      primary="Manage Invite Codes" 
                      secondary="Create and manage beta invitation codes"
                    />
                  </ListItem>
                </Permission>
                
                <Role role="ADMIN">
                  <ListItem button>
                    <ListItemText 
                      primary="User Management" 
                      secondary="Manage user accounts and roles"
                    />
                  </ListItem>
                </Role>
                
                <AccessControl permission={PERMISSIONS.MANAGE_FEEDBACK}>
                  <ListItem button>
                    <ListItemText 
                      primary="Review Feedback" 
                      secondary="View and respond to user feedback"
                    />
                  </ListItem>
                </AccessControl>
                
                <AccessControl permission={PERMISSIONS.MANAGE_ISSUES}>
                  <ListItem button onClick={() => navigate('/admin/issue-prioritization')}>
                    <ListItemText 
                      primary="Issue Prioritization" 
                      secondary="Classify and prioritize reported issues"
                    />
                  </ListItem>
                </AccessControl>
                
                <AccessControl permission={PERMISSIONS.MANAGE_ISSUES}>
                  <ListItem button onClick={() => navigate('/admin/sla-tracking')}>
                    <ListItemText 
                      primary="SLA Tracking" 
                      secondary="Monitor and manage issue resolution SLAs"
                    />
                  </ListItem>
                </AccessControl>
                
                <Role role="ADMIN">
                  <ListItem button>
                    <ListItemText 
                      primary="System Settings" 
                      secondary="Configure application settings"
                    />
                  </ListItem>
                </Role>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Recent Activity" />
            <Divider />
            <CardContent sx={{ maxHeight: 350, overflow: 'auto' }}>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="New beta tester registered" 
                    secondary="John Smith joined the beta program • 2 hours ago"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Feedback submitted" 
                    secondary="New feature suggestion received • 5 hours ago"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Issue prioritized" 
                    secondary="Critical issue escalated for immediate attention • 1 day ago"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Invite code generated" 
                    secondary="Admin created 5 new invitation codes • Yesterday"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Bug report" 
                    secondary="Issue reported in chat feature • Yesterday"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="User role updated" 
                    secondary="Jane Smith promoted to Moderator • 3 days ago"
                  />
                </ListItem>
              </List>
            </CardContent>
            <Divider />
            <CardActions>
              <Button size="small" color="primary">View All Activity</Button>
            </CardActions>
          </Card>
        </Grid>
        
        {/* Recent Users - Admin Only */}
        <Role role="ADMIN">
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Recent Users" />
              <Divider />
              <CardContent>
                <Grid container spacing={2}>
                  {mockUsers.map(user => (
                    <Grid item xs={12} sm={6} md={4} key={user.id}>
                      <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography variant="subtitle1">{user.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption">Role: {user.role}</Typography>
                          <Typography variant="caption">Last active: {user.lastActive}</Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
              <Divider />
              <CardActions>
                <Button size="small" color="primary">Manage Users</Button>
              </CardActions>
            </Card>
          </Grid>
        </Role>
      </Grid>
    </Container>
  );
};

export default AdminDashboard; 