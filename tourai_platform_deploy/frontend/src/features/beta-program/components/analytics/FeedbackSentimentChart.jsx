import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import analyticsService from '../../services/analytics/AnalyticsService';
import styles from './Analytics.module.css';

/**
 * FeedbackSentimentChart component
 * Displays sentiment trends over time from user feedback
 * Helps identify how user satisfaction has evolved during the beta program
 */
const FeedbackSentimentChart = () => {
  const [sentimentData, setSentimentData] = useState([]);
  const [timeRange, setTimeRange] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSentimentData = async () => {
      try {
        setIsLoading(true);
        const data = await analyticsService.getFeedbackSentimentTrend(timeRange);
        setSentimentData(data);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load sentiment data');
        setIsLoading(false);
        console.error('Error fetching sentiment data:', err);
      }
    };

    fetchSentimentData();
  }, [timeRange]);

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  // Custom tooltip to show detailed sentiment information
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          <div className={styles.tooltipContent}>
            <p style={{ color: '#8884d8' }}>
              Positive: {payload[0].payload.positive.toFixed(1)}%
            </p>
            <p style={{ color: '#82ca9d' }}>
              Neutral: {payload[0].payload.neutral.toFixed(1)}%
            </p>
            <p style={{ color: '#ffc658' }}>
              Negative: {payload[0].payload.negative.toFixed(1)}%
            </p>
            <p>
              Total Feedback: {payload[0].payload.total}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) return <div className={styles.loadingIndicator}>Loading sentiment data...</div>;
  if (error) return <div className={styles.errorMessage}>{error}</div>;

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3>Feedback Sentiment Trends</h3>
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
      
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={sentimentData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis 
            label={{ 
              value: 'Percentage', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="positive" 
            stackId="1"
            stroke="#8884d8" 
            fill="#8884d8" 
            name="Positive" 
          />
          <Area 
            type="monotone" 
            dataKey="neutral" 
            stackId="1"
            stroke="#82ca9d" 
            fill="#82ca9d" 
            name="Neutral" 
          />
          <Area 
            type="monotone" 
            dataKey="negative" 
            stackId="1"
            stroke="#ffc658" 
            fill="#ffc658" 
            name="Negative" 
          />
        </AreaChart>
      </ResponsiveContainer>
      
      <div className={styles.insightPanel}>
        <h4>Key Insights</h4>
        {sentimentData.length > 0 && (
          <>
            <p>
              <strong>Trend:</strong> {' '}
              {sentimentData[sentimentData.length - 1].positive > sentimentData[0].positive 
                ? 'Improving sentiment over time' 
                : 'Declining sentiment requires attention'}
            </p>
            <p>
              <strong>Latest:</strong> {' '}
              {sentimentData[sentimentData.length - 1].positive.toFixed(1)}% positive, {' '}
              {sentimentData[sentimentData.length - 1].negative.toFixed(1)}% negative
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackSentimentChart; 