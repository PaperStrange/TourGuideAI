import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector
} from 'recharts';
import analyticsService from '../../services/analytics/AnalyticsService';
import styles from './Analytics.module.css';

/**
 * DeviceDistribution component
 * Displays distribution of user devices in the beta program
 * Helps identify platform-specific usage patterns and issues
 */
const DeviceDistribution = () => {
  const [deviceData, setDeviceData] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('device'); // 'device', 'os', 'browser'

  // Preset colors for consistent category coloring
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A4DE6C', '#8884D8', '#C2B280', '#B03060'];

  useEffect(() => {
    const fetchDeviceData = async () => {
      try {
        setIsLoading(true);
        const data = await analyticsService.getDeviceDistributionData(view);
        setDeviceData(data);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load device distribution data');
        setIsLoading(false);
        console.error('Error fetching device distribution data:', err);
      }
    };

    fetchDeviceData();
  }, [view]);

  const handleViewChange = (event) => {
    setView(event.target.value);
  };

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  // Custom active shape for the pie chart
  const renderActiveShape = (props) => {
    const {
      cx, cy, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value
    } = props;

    return (
      <g>
        <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#333" className={styles.centerLabel}>
          {payload.name}
        </text>
        <text x={cx} y={cy} dy={10} textAnchor="middle" fill="#333" className={styles.centerValue}>
          {`${value} users`}
        </text>
        <text x={cx} y={cy} dy={30} textAnchor="middle" fill="#999" className={styles.centerPercent}>
          {`(${(percent * 100).toFixed(2)}%)`}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 16}
          fill={fill}
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{data.name}</p>
          <div className={styles.tooltipContent}>
            <p><strong>Users:</strong> {data.value} ({(data.value/deviceData.reduce((sum, item) => sum + item.value, 0) * 100).toFixed(2)}%)</p>
            {data.avgSessionDuration && <p><strong>Avg. Session:</strong> {data.avgSessionDuration} min</p>}
            {data.crashRate !== undefined && <p><strong>Crash Rate:</strong> {data.crashRate}%</p>}
            {data.retentionRate !== undefined && <p><strong>Retention:</strong> {data.retentionRate}%</p>}
          </div>
        </div>
      );
    }
    return null;
  };

  const generateInsights = () => {
    if (!deviceData.length) return null;

    // Sort data by value for insights
    const sortedData = [...deviceData].sort((a, b) => b.value - a.value);
    const topDevice = sortedData[0];
    const bottomDevice = sortedData[sortedData.length - 1];

    // Calculate total users
    const totalUsers = deviceData.reduce((sum, item) => sum + item.value, 0);
    
    // Calculate diversity index (higher means more evenly distributed)
    const diversityIndex = 1 - deviceData.reduce(
      (sum, item) => sum + Math.pow(item.value / totalUsers, 2), 
      0
    );
    
    // Find problematic platform if exists (high crash rate or low retention)
    const problematicPlatform = deviceData.find(
      item => (item.crashRate > 5 || (item.retentionRate && item.retentionRate < 60))
    );

    return (
      <div className={styles.insightPanel}>
        <h4>Device Insights</h4>
        <div className={styles.insightGrid}>
          <div className={styles.insightItem}>
            <h5>Main Platform</h5>
            <p>
              <strong>{topDevice.name}</strong> is the most used platform 
              ({(topDevice.value/totalUsers * 100).toFixed(1)}% of users)
            </p>
          </div>
          
          <div className={styles.insightItem}>
            <h5>Platform Diversity</h5>
            <p>
              Your user base is {diversityIndex > 0.7 ? 'very diverse' : 
                diversityIndex > 0.5 ? 'moderately diverse' : 'concentrated'}
              <br />
              <span className={styles.insightSubtext}>
                Diversity score: {(diversityIndex * 100).toFixed(0)}%
              </span>
            </p>
          </div>
          
          {problematicPlatform && (
            <div className={styles.insightItem}>
              <h5>Platform Attention Needed</h5>
              <p>
                <strong>{problematicPlatform.name}</strong> shows
                {problematicPlatform.crashRate > 5 ? 
                  ` high crash rate (${problematicPlatform.crashRate}%)` : 
                  ` low retention (${problematicPlatform.retentionRate}%)`
                }
              </p>
            </div>
          )}
          
          <div className={styles.insightItem}>
            <h5>Least Common</h5>
            <p>
              <strong>{bottomDevice.name}</strong> has only {bottomDevice.value} users
              ({(bottomDevice.value/totalUsers * 100).toFixed(1)}%)
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className={styles.loadingIndicator}>Loading device data...</div>;
  if (error) return <div className={styles.errorMessage}>{error}</div>;

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3>Device Distribution</h3>
        <select
          value={view}
          onChange={handleViewChange}
          className={styles.viewSelector}
        >
          <option value="device">Device Type</option>
          <option value="os">Operating System</option>
          <option value="browser">Browser</option>
          <option value="screen">Screen Size</option>
        </select>
      </div>

      <div className={styles.pieChartWrapper}>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={deviceData}
              cx="50%"
              cy="50%"
              innerRadius={120}
              outerRadius={160}
              dataKey="value"
              onMouseEnter={onPieEnter}
            >
              {deviceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {generateInsights()}
    </div>
  );
};

export default DeviceDistribution; 