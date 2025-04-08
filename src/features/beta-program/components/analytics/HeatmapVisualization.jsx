import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Button,
  Alert,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { 
  MouseOutlined,
  TouchApp,
  Visibility,
  DevicesOther,
  FilterList,
  Download,
  Refresh
} from '@mui/icons-material';

// Mock service - would be replaced with actual API calls
const fetchHeatmapData = (page, type = 'clicks') => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock data for different heatmap types
      const mockData = {
        clicks: [
          { x: 150, y: 200, value: 45 },
          { x: 300, y: 200, value: 32 },
          { x: 450, y: 350, value: 28 },
          { x: 600, y: 400, value: 20 },
          { x: 750, y: 150, value: 15 },
          { x: 200, y: 300, value: 12 },
          { x: 350, y: 450, value: 10 },
          { x: 500, y: 250, value: 8 },
          { x: 650, y: 350, value: 6 },
          { x: 400, y: 100, value: 5 }
        ],
        moves: [
          { x: 200, y: 250, value: 200 },
          { x: 350, y: 220, value: 180 },
          { x: 500, y: 300, value: 150 },
          { x: 650, y: 420, value: 120 },
          { x: 300, y: 400, value: 100 },
          { x: 450, y: 150, value: 90 },
          { x: 550, y: 350, value: 80 },
          { x: 400, y: 280, value: 70 },
          { x: 250, y: 150, value: 60 },
          { x: 700, y: 300, value: 50 }
        ],
        views: [
          { x: 400, y: 300, value: 500 },
          { x: 500, y: 350, value: 450 },
          { x: 300, y: 250, value: 400 },
          { x: 600, y: 200, value: 350 },
          { x: 200, y: 350, value: 300 },
          { x: 700, y: 400, value: 250 },
          { x: 450, y: 450, value: 200 },
          { x: 550, y: 250, value: 150 },
          { x: 350, y: 150, value: 100 },
          { x: 650, y: 300, value: 50 }
        ]
      };
      
      resolve({
        data: mockData[type],
        page,
        type,
        viewport: { width: 1280, height: 720 },
        pageUrl: `/example/${page}`,
        screenshot: `https://via.placeholder.com/1280x720?text=Screenshot+of+${page}+page`
      });
    }, 1000);
  });
};

const fetchPagesList = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'dashboard', name: 'Dashboard', path: '/dashboard' },
        { id: 'features', name: 'Feature Requests', path: '/feature-requests' },
        { id: 'survey', name: 'Surveys', path: '/surveys' },
        { id: 'settings', name: 'Settings', path: '/settings' },
        { id: 'profile', name: 'User Profile', path: '/profile' }
      ]);
    }, 500);
  });
};

const HeatmapVisualization = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [heatmapType, setHeatmapType] = useState('clicks');
  const [heatmapData, setHeatmapData] = useState(null);
  const [error, setError] = useState(null);
  const [intensity, setIntensity] = useState(0.7);
  const [radius, setRadius] = useState(30);
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  
  useEffect(() => {
    fetchPagesList()
      .then(data => {
        setPages(data);
        if (data.length > 0) {
          setSelectedPage(data[0].id);
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load pages list');
        setLoading(false);
      });
  }, []);
  
  useEffect(() => {
    if (selectedPage) {
      setLoading(true);
      setHeatmapData(null);
      
      fetchHeatmapData(selectedPage, heatmapType)
        .then(data => {
          setHeatmapData(data);
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to load heatmap data');
          setLoading(false);
        });
    }
  }, [selectedPage, heatmapType]);
  
  useEffect(() => {
    if (heatmapData && canvasRef.current && imageRef.current) {
      const img = imageRef.current;
      
      if (img.complete) {
        drawHeatmap();
      } else {
        img.onload = drawHeatmap;
      }
    }
  }, [heatmapData, intensity, radius]);
  
  const drawHeatmap = () => {
    if (!canvasRef.current || !heatmapData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = heatmapData.viewport;
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw screenshot as background
    if (imageRef.current && imageRef.current.complete) {
      ctx.drawImage(imageRef.current, 0, 0, width, height);
      // Add slight overlay to make heatmap more visible
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(0, 0, width, height);
    } else {
      // Fallback if image fails to load
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#ccc';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Screenshot of ${heatmapData.pageUrl}`, width / 2, height / 2);
    }
    
    // Find maximum value for normalization
    const maxValue = Math.max(...heatmapData.data.map(point => point.value));
    
    // Draw heatmap points
    heatmapData.data.forEach(point => {
      const { x, y, value } = point;
      const normalizedValue = value / maxValue;
      
      // Create gradient for heatmap point
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      
      if (heatmapType === 'clicks') {
        gradient.addColorStop(0, `rgba(255, 0, 0, ${normalizedValue * intensity})`);
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      } else if (heatmapType === 'moves') {
        gradient.addColorStop(0, `rgba(0, 0, 255, ${normalizedValue * intensity})`);
        gradient.addColorStop(1, 'rgba(0, 0, 255, 0)');
      } else { // views
        gradient.addColorStop(0, `rgba(0, 255, 0, ${normalizedValue * intensity})`);
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
      }
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Add overlay to show combined heatmap more clearly
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalCompositeOperation = 'source-over';
  };
  
  const handlePageChange = (event) => {
    setSelectedPage(event.target.value);
  };
  
  const handleTypeChange = (_, newType) => {
    if (newType !== null) {
      setHeatmapType(newType);
    }
  };
  
  const handleExport = () => {
    if (!canvasRef.current) return;
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.download = `heatmap-${selectedPage}-${heatmapType}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (loading && !heatmapData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box m={2}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={onBack} sx={{ mt: 2 }}>
          Back to Analytics
        </Button>
      </Box>
    );
  }
  
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Heatmap Visualization
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Page</InputLabel>
            <Select
              value={selectedPage}
              onChange={handlePageChange}
              label="Select Page"
            >
              {pages.map(page => (
                <MenuItem key={page.id} value={page.id}>
                  {page.name} ({page.path})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box display="flex" justifyContent="flex-end" alignItems="center" height="100%">
            <Button 
              variant="outlined" 
              startIcon={<Refresh />}
              onClick={() => {
                setLoading(true);
                Promise.all([
                  fetchPagesList(),
                  selectedPage ? fetchHeatmapData(selectedPage, heatmapType) : Promise.resolve(null)
                ])
                  .then(([pagesData, heatmapData]) => {
                    setPages(pagesData);
                    if (heatmapData) setHeatmapData(heatmapData);
                    setLoading(false);
                  })
                  .catch(err => {
                    setError('Failed to refresh data');
                    setLoading(false);
                  });
              }}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button 
              variant="outlined" 
              onClick={onBack}
            >
              Back
            </Button>
          </Box>
        </Grid>
      </Grid>
      
      <Box mt={2} display="flex" alignItems="center" justifyContent="space-between">
        <ToggleButtonGroup
          value={heatmapType}
          exclusive
          onChange={handleTypeChange}
          aria-label="heatmap type"
        >
          <ToggleButton value="clicks" aria-label="clicks">
            <TouchApp sx={{ mr: 1 }} />
            Clicks
          </ToggleButton>
          <ToggleButton value="moves" aria-label="mouse movement">
            <MouseOutlined sx={{ mr: 1 }} />
            Movement
          </ToggleButton>
          <ToggleButton value="views" aria-label="views">
            <Visibility sx={{ mr: 1 }} />
            Views
          </ToggleButton>
        </ToggleButtonGroup>
        
        <Box>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={!heatmapData}
          >
            Export
          </Button>
        </Box>
      </Box>
      
      {heatmapData && (
        <>
          <Box 
            mt={2} 
            sx={{ 
              position: 'relative',
              border: '1px solid #ccc',
              maxWidth: '100%',
              overflow: 'auto'
            }}
          >
            <img 
              ref={imageRef} 
              src={heatmapData.screenshot} 
              alt={`Screenshot of ${heatmapData.pageUrl}`}
              style={{ display: 'none' }}
            />
            <canvas 
              ref={canvasRef} 
              style={{
                display: 'block',
                maxWidth: '100%'
              }}
            />
          </Box>
          
          <Grid container spacing={3} mt={1}>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Intensity: {intensity * 100}%</Typography>
              <Box px={1}>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={intensity}
                  onChange={(e) => setIntensity(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Radius: {radius}px</Typography>
              <Box px={1}>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="2"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </Box>
            </Grid>
          </Grid>
          
          <Box mt={3}>
            <Typography variant="subtitle1">
              Data Points ({heatmapData.data.length})
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
              {heatmapData.data.map((point, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    p: 1,
                    borderBottom: index < heatmapData.data.length - 1 ? '1px solid #eee' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <Typography variant="body2">
                    Point {index + 1}: ({point.x}, {point.y})
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    Value: {point.value}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Box>
          
          {/* Legend */}
          <Box mt={3} display="flex" alignItems="center" justifyContent="center">
            <Box 
              sx={{ 
                width: 20, 
                height: 20, 
                background: heatmapType === 'clicks' ? 'red' : 
                             heatmapType === 'moves' ? 'blue' : 'green',
                borderRadius: '50%',
                mr: 1 
              }} 
            />
            <Typography variant="body2" sx={{ mr: 3 }}>
              High intensity
            </Typography>
            
            <Box 
              sx={{ 
                width: 20, 
                height: 20, 
                background: heatmapType === 'clicks' ? 'rgba(255,0,0,0.3)' : 
                             heatmapType === 'moves' ? 'rgba(0,0,255,0.3)' : 'rgba(0,255,0,0.3)',
                borderRadius: '50%',
                mr: 1 
              }} 
            />
            <Typography variant="body2">
              Low intensity
            </Typography>
          </Box>
        </>
      )}
    </Paper>
  );
};

HeatmapVisualization.propTypes = {
  onBack: PropTypes.func
};

export default HeatmapVisualization; 