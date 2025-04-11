import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

// Simplified approach without relying on Material-UI components
import styles from './Analytics.module.css';
import analyticsService from '../../services/analytics/AnalyticsService';

/**
 * HeatmapVisualization component
 * Displays user interaction heatmaps on app pages/screens
 * Helps identify which UI elements receive most attention from users
 */
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
    // Fetch available pages for heatmap visualization
    const fetchPages = async () => {
      try {
        const data = await analyticsService.getHeatmapPagesList();
        setPages(data);
        if (data.length > 0) {
          setSelectedPage(data[0].id);
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load pages list');
        setLoading(false);
        console.error('Error fetching pages list:', err);
      }
    };
    
    fetchPages();
  }, []);
  
  useEffect(() => {
    if (selectedPage) {
      setLoading(true);
      setHeatmapData(null);
      
      const fetchData = async () => {
        try {
          const data = await analyticsService.getHeatmapData(selectedPage, heatmapType);
          setHeatmapData(data);
          setLoading(false);
        } catch (err) {
          setError('Failed to load heatmap data');
          setLoading(false);
          console.error('Error fetching heatmap data:', err);
        }
      };
      
      fetchData();
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
  
  const handleTypeChange = (event) => {
    setHeatmapType(event.target.value);
  };
  
  const handleIntensityChange = (event) => {
    setIntensity(parseFloat(event.target.value));
  };
  
  const handleRadiusChange = (event) => {
    setRadius(parseInt(event.target.value, 10));
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
    return <div className={styles.loadingIndicator}>Loading heatmap data...</div>;
  }
  
  if (error) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.errorMessage}>{error}</div>
        <button onClick={onBack} className={styles.viewSelector}>Back to Analytics</button>
      </div>
    );
  }
  
  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3>User Interaction Heatmap</h3>
        <div className={styles.controlsRow}>
          <select 
            value={selectedPage} 
            onChange={handlePageChange}
            className={styles.viewSelector}
          >
            {pages.map(page => (
              <option key={page.id} value={page.id}>{page.name}</option>
            ))}
          </select>
          
          <select 
            value={heatmapType} 
            onChange={handleTypeChange}
            className={styles.viewSelector}
          >
            <option value="clicks">Clicks</option>
            <option value="moves">Mouse Movements</option>
            <option value="views">View Time</option>
          </select>
          
          <button 
            onClick={handleExport} 
            className={styles.viewSelector}
          >
            Export
          </button>
        </div>
      </div>
      
      <div className={styles.heatmapControls}>
        <div className={styles.controlGroup}>
          <label>Intensity:</label>
          <input 
            type="range" 
            min="0.1" 
            max="1" 
            step="0.1" 
            value={intensity}
            onChange={handleIntensityChange} 
          />
          <span>{intensity}</span>
        </div>
        
        <div className={styles.controlGroup}>
          <label>Radius:</label>
          <input 
            type="range" 
            min="10" 
            max="50" 
            step="5" 
            value={radius}
            onChange={handleRadiusChange} 
          />
          <span>{radius}px</span>
        </div>
      </div>
      
      <div className={styles.heatmapContainer}>
        {/* Hidden image for screenshot */}
        <img 
          ref={imageRef} 
          src={heatmapData?.screenshot || "https://via.placeholder.com/1280x720?text=Loading+Screenshot"} 
          alt="Page screenshot" 
          style={{ display: 'none' }} 
          crossOrigin="anonymous"
        />
        
        {/* Canvas for drawing heatmap */}
        <canvas 
          ref={canvasRef} 
          className={styles.heatmapCanvas}
        />
      </div>
      
      {heatmapData && (
        <div className={styles.insightPanel}>
          <h4>Interaction Insights</h4>
          <div className={styles.insightGrid}>
            <div className={styles.insightItem}>
              <h5>Most Active Area</h5>
              <p>
                The area with highest activity is around 
                coordinates ({heatmapData.data[0]?.x || 0}, {heatmapData.data[0]?.y || 0})
              </p>
            </div>
            
            <div className={styles.insightItem}>
              <h5>Activity Summary</h5>
              <p>
                {heatmapData.data.length} {heatmapType} tracked on this page
              </p>
            </div>
            
            <div className={styles.insightItem}>
              <h5>Page URL</h5>
              <p>{heatmapData.pageUrl}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className={styles.backButton}>
        <button onClick={onBack} className={styles.viewSelector}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

HeatmapVisualization.propTypes = {
  onBack: PropTypes.func.isRequired
};

export default HeatmapVisualization; 