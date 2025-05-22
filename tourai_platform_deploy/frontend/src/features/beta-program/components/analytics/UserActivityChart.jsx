import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush
} from 'recharts';
import analyticsService from '../../services/analytics/AnalyticsService';
import styles from './Analytics.module.css';

/**
 * UserActivityChart component
 * Displays user activity metrics over time
 * Helps track engagement trends during the beta program
 */
const UserActivityChart = () => {
  const [activityData, setActivityData] = useState([]);
  const [timeRange, setTimeRange] = useState('month');
  const [metrics, setMetrics] = useState(['activeUsers', 'sessionLength', 'actionsPerSession']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const metricOptions = [
    { id: 'activeUsers', name: 'Active Users', color: '#8884d8' },
    { id: 'newUsers', name: 'New Users', color: '#82ca9d' },
    { id: 'sessionCount', name: 'Sessions', color: '#ffc658' },
    { id: 'sessionLength', name: 'Avg. Session Length', color: '#ff8042' },
    { id: 'actionsPerSession', name: 'Actions per Session', color: '#0088fe' },
    { id: 'returnRate', name: 'Return Rate (%)', color: '#00C49F' }
  ];

  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        setIsLoading(true);
        const data = await analyticsService.getUserActivityData(timeRange);
        setActivityData(data);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load user activity data');
        setIsLoading(false);
        console.error('Error fetching user activity data:', err);
      }
    };

    fetchActivityData();
  }, [timeRange]);

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleMetricChange = (metricId) => {
    if (metrics.includes(metricId)) {
      // Remove the metric if it's already selected
      if (metrics.length > 1) { // Keep at least one metric selected
        setMetrics(metrics.filter(id => id !== metricId));
      }
    } else {
      // Add the metric
      setMetrics([...metrics, metricId]);
    }
  };

  // Custom tooltip to display normalized and actual values
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          <div className={styles.tooltipContent}>
            {payload.map((entry, index) => {
              const metric = metricOptions.find(m => m.id === entry.dataKey);
              return (
                <p key={index} style={{ color: entry.color }}>
                  {metric.name}: {entry.payload[entry.dataKey + 'Raw'] || entry.value}
                  {entry.dataKey === 'sessionLength' ? ' min' : 
                    entry.dataKey === 'returnRate' ? '%' : ''}
                </p>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) return <div className={styles.loadingIndicator}>Loading activity data...</div>;
  if (error) return <div className={styles.errorMessage}>{error}</div>;

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3>User Activity Trends</h3>
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
      </div>

      <div className={styles.metricSelectors}>
        {metricOptions.map((metric) => (
          <div key={metric.id} className={styles.metricOption}>
            <input
              type="checkbox"
              id={metric.id}
              checked={metrics.includes(metric.id)}
              onChange={() => handleMetricChange(metric.id)}
            />
            <label htmlFor={metric.id} style={{ color: metric.color }}>
              {metric.name}
            </label>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={activityData}
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis 
            domain={[0, 'dataMax + 10']}
            label={{ 
              value: 'Normalized Values', 
              angle: -90, 
              position: 'insideLeft', 
              style: { textAnchor: 'middle' } 
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {metricOptions
            .filter(metric => metrics.includes(metric.id))
            .map(metric => (
              <Line
                key={metric.id}
                type="monotone"
                dataKey={metric.id}
                name={metric.name}
                stroke={metric.color}
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            ))}
          <Brush dataKey="date" height={30} stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>

      {activityData.length > 0 && (
        <div className={styles.insightPanel}>
          <h4>Activity Insights</h4>
          <p>
            <strong>Trend:</strong> {' '}
            {activityData[activityData.length - 1].activeUsers > activityData[0].activeUsers 
              ? 'Increasing user engagement' 
              : 'Declining user activity requires attention'}
          </p>
          <p>
            <strong>Peak Activity:</strong> {' '}
            {activityData.reduce((max, item) => 
              (max.activeUsers > item.activeUsers) ? max : item, 
              { date: 'None', activeUsers: 0 }
            ).date}
          </p>
        </div>
      )}
    </div>
  );
};

export default UserActivityChart; 