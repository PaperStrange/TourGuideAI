import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Container,
  Button,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CardMedia,
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Analytics as AnalyticsIcon,
  Videocam as VideocamIcon
} from '@mui/icons-material';

import UserSegmentManager from './UserSegmentManager';
import UserPersona from './UserPersona';
import TaskManager from './TaskManager';

/**
 * User Testing Dashboard
 * Main component for managing user testing program with demographic profiles
 */
const UserTestingDashboard = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [showInfoAlert, setShowInfoAlert] = useState(true);

  const handleTabChange = (event, newIndex) => {
    setTabIndex(newIndex);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          User Testing Program
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage user testing segments, personas, and testing tasks for comprehensive 
          feedback collection and product improvement.
        </Typography>
        
        {showInfoAlert && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }} 
            onClose={() => setShowInfoAlert(false)}
          >
            The user testing program helps you systematically collect feedback from 
            targeted user segments based on demographic and behavioral profiles.
          </Alert>
        )}

        {tabIndex === 0 && (
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => setTabIndex(1)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <PeopleIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="h2">
                          User Segments
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Create and manage user segments based on demographics and behaviors.
                        Target specific user groups for testing.
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => setTabIndex(2)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <PersonIcon color="secondary" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="h2">
                          User Personas
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Define detailed user personas with goals and pain points to better 
                        understand your target users.
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardActionArea onClick={() => setTabIndex(3)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AssignmentIcon color="error" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="h2">
                          Testing Tasks
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Create and manage testing tasks for user segments. Track completion
                        and collect structured feedback.
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            </Grid>
            
            <Paper sx={{ mt: 4, p: 3 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Testing Program Overview
              </Typography>
              <Typography variant="body1" paragraph>
                The User Testing Program allows you to collect structured feedback from specific
                user segments to improve your product. Define user segments based on demographics
                and behaviors, create detailed personas, and assign testing tasks.
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Key Metrics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">2</Typography>
                    <Typography variant="body2">User Segments</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="secondary">2</Typography>
                    <Typography variant="body2">User Personas</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error">10</Typography>
                    <Typography variant="body2">Testing Tasks</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">24</Typography>
                    <Typography variant="body2">Test Participants</Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Recent Activity
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  New segment "Mobile Power Users" created 2 days ago
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Task "Test Route Planning Feature" assigned to 8 users yesterday
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  New persona "Weekend Explorer" created 3 days ago
                </Typography>
                <Typography component="li" variant="body2">
                  5 new test participants joined the program this week
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={tabIndex} 
            onChange={handleTabChange}
            aria-label="user testing tabs"
          >
            <Tab icon={<AnalyticsIcon />} iconPosition="start" label="Overview" />
            <Tab icon={<PeopleIcon />} iconPosition="start" label="User Segments" />
            <Tab icon={<PersonIcon />} iconPosition="start" label="User Personas" />
            <Tab icon={<AssignmentIcon />} iconPosition="start" label="Testing Tasks" />
            <Tab icon={<VideocamIcon />} iconPosition="start" label="Session Recording" disabled />
          </Tabs>
        </Box>
        
        <Box role="tabpanel" hidden={tabIndex !== 1} id="tab-panel-1">
          {tabIndex === 1 && <UserSegmentManager />}
        </Box>
        
        <Box role="tabpanel" hidden={tabIndex !== 2} id="tab-panel-2">
          {tabIndex === 2 && <UserPersona />}
        </Box>
        
        <Box role="tabpanel" hidden={tabIndex !== 3} id="tab-panel-3">
          {tabIndex === 3 && <TaskManager />}
        </Box>
        
        <Box role="tabpanel" hidden={tabIndex !== 4} id="tab-panel-4">
          {tabIndex === 4 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Session Recording Coming Soon
              </Typography>
              <Typography variant="body1" color="text.secondary">
                This feature is under development and will be available soon.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default UserTestingDashboard; 