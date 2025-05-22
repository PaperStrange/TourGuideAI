import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import analyticsService from '../../services/analytics/AnalyticsService';
import styles from './Analytics.module.css';

/**
 * FeatureUsageChart component
 * Displays feature usage statistics across the application
 * Helps identify most and least used features during beta testing
 */
const FeatureUsageChart = () => {
  const [featureData, setFeatureData] = useState([]);
  const [timeRange, setTimeRange] = useState('month');
  const [sortBy, setSortBy] = useState('usage');
  const [viewType, setViewType] = useState('count'); // 'count', 'duration', 'engagement'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fixed color palette for consistent feature coloring
  const COLORS = [
    '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c',
    '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090'
  ];

  useEffect(() => {
    const fetchFeatureUsage = async () => {
      try {
        setIsLoading(true);
        const data = await analyticsService.getFeatureUsageData(timeRange, viewType);
        
        // Sort data based on user preference
        let sortedData = [...data];
        if (sortBy === 'usage') {
          sortedData.sort((a, b) => b.value - a.value);
        } else if (sortBy === 'alphabetical') {
          sortedData.sort((a, b) => a.feature.localeCompare(b.feature));
        } else if (sortBy === 'category') {
          sortedData.sort((a, b) => a.category.localeCompare(b.category));
        }
        
        setFeatureData(sortedData);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load feature usage data');
        setIsLoading(false);
        console.error('Error fetching feature usage data:', err);
      }
    };

    fetchFeatureUsage();
  }, [timeRange, viewType, sortBy]);

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  const handleViewTypeChange = (event) => {
    setViewType(event.target.value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{data.feature}</p>
          <div className={styles.tooltipContent}>
            <p><strong>Category:</strong> {data.category}</p>
            <p><strong>{viewType === 'count' ? 'Total Uses' : 
                viewType === 'duration' ? 'Avg. Time Spent' : 
                'Engagement Score'}:</strong> {data.value}
              {viewType === 'duration' ? ' min' : viewType === 'engagement' ? '%' : ''}
            </p>
            <p><strong>Unique Users:</strong> {data.uniqueUsers}</p>
            {data.trend && (
              <p><strong>Trend:</strong> {data.trend > 0 ? '+' : ''}{data.trend}% vs previous {timeRange}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) return <div className={styles.loadingIndicator}>Loading feature usage data...</div>;
  if (error) return <div className={styles.errorMessage}>{error}</div>;

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3>Feature Usage Analytics</h3>
        <div className={styles.controlsRow}>
          <select
            value={timeRange}
            onChange={handleTimeRangeChange}
            className={styles.viewSelector}
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
          
          <select
            value={viewType}
            onChange={handleViewTypeChange}
            className={styles.viewSelector}
          >
            <option value="count">Usage Count</option>
            <option value="duration">Time Spent</option>
            <option value="engagement">Engagement Rate</option>
          </select>
          
          <select
            value={sortBy}
            onChange={handleSortChange}
            className={styles.viewSelector}
          >
            <option value="usage">Sort by Usage</option>
            <option value="alphabetical">Sort Alphabetically</option>
            <option value="category">Sort by Category</option>
          </select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <BarChart
          data={featureData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 150, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis 
            type="number" 
            label={{ 
              value: viewType === 'count' ? 'Number of Uses' : 
                viewType === 'duration' ? 'Average Minutes' : 
                'Engagement Rate (%)', 
              position: 'insideBottom', 
              offset: -5 
            }} 
          />
          <YAxis 
            type="category" 
            dataKey="feature" 
            width={140}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="value" name={
            viewType === 'count' ? 'Usage Count' : 
            viewType === 'duration' ? 'Avg. Time Spent (min)' : 
            'Engagement Rate (%)'
          }>
            {featureData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {featureData.length > 0 && (
        <div className={styles.insightPanel}>
          <h4>Feature Insights</h4>
          <div className={styles.insightColumns}>
            <div>
              <h5>Top Features</h5>
              <ol className={styles.insightList}>
                {featureData.slice(0, 3).map(item => (
                  <li key={item.feature}>
                    <strong>{item.feature}</strong>: {item.value}
                    {viewType === 'duration' ? ' min' : viewType === 'engagement' ? '%' : ''}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h5>Least Used Features</h5>
              <ol className={styles.insightList}>
                {[...featureData].reverse().slice(0, 3).map(item => (
                  <li key={item.feature}>
                    <strong>{item.feature}</strong>: {item.value}
                    {viewType === 'duration' ? ' min' : viewType === 'engagement' ? '%' : ''}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureUsageChart; 