import React, { useState } from 'react';
import UserActivityChart from './UserActivityChart';
import FeatureUsageChart from './FeatureUsageChart';
import DeviceDistribution from './DeviceDistribution';
import styles from './Analytics.module.css';

/**
 * BetaProgramDashboard
 * 
 * Dashboard component that displays analytics for the beta program
 * Combines multiple chart components to provide a comprehensive view
 * of user activity, feature usage, and device distribution
 */
const BetaProgramDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Custom dashboard styles
  const dashboardStyles = {
    container: {
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
    },
    title: {
      margin: '0',
      fontSize: '24px',
      fontWeight: '600',
      color: '#333',
    },
    subtitle: {
      margin: '5px 0 0',
      fontSize: '14px',
      color: '#666',
      fontWeight: 'normal',
    },
    tabs: {
      display: 'flex',
      gap: '12px',
      marginBottom: '24px',
      borderBottom: '1px solid #eee',
      paddingBottom: '12px',
    },
    tab: {
      padding: '8px 16px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
    },
    activeTab: {
      backgroundColor: '#6c5ce7',
      color: 'white',
    },
    inactiveTab: {
      backgroundColor: '#f5f5f5',
      color: '#555',
      '&:hover': {
        backgroundColor: '#eee',
      },
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px',
      marginBottom: '24px',
    },
    fullWidth: {
      gridColumn: '1 / span 2',
    },
    summaryCards: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
    },
    summaryCard: {
      flex: '1',
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
    },
    cardValue: {
      fontSize: '28px',
      fontWeight: '600',
      color: '#333',
      margin: '0',
    },
    cardLabel: {
      fontSize: '14px',
      color: '#666',
      margin: '5px 0 0',
    },
    cardTrend: {
      fontSize: '12px',
      marginTop: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    trendUp: {
      color: '#2ecc71',
    },
    trendDown: {
      color: '#e74c3c',
    },
  };

  // Mock summary data for the dashboard
  const summaryData = {
    activeUsers: {
      value: '328',
      trend: '+18.3%',
      isPositive: true,
    },
    totalSessions: {
      value: '2,451',
      trend: '+23.7%',
      isPositive: true,
    },
    avgSessionTime: {
      value: '13.4 min',
      trend: '+2.1%',
      isPositive: true,
    },
    crashRate: {
      value: '2.8%',
      trend: '-0.7%',
      isPositive: true,
    },
  };

  // Conditional rendering based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <div style={dashboardStyles.summaryCards}>
              <div style={dashboardStyles.summaryCard}>
                <p style={dashboardStyles.cardValue}>{summaryData.activeUsers.value}</p>
                <p style={dashboardStyles.cardLabel}>Active Beta Users</p>
                <p style={{
                  ...dashboardStyles.cardTrend,
                  ...(summaryData.activeUsers.isPositive ? dashboardStyles.trendUp : dashboardStyles.trendDown),
                }}>
                  {summaryData.activeUsers.trend} vs prev. month
                </p>
              </div>
              <div style={dashboardStyles.summaryCard}>
                <p style={dashboardStyles.cardValue}>{summaryData.totalSessions.value}</p>
                <p style={dashboardStyles.cardLabel}>Total Sessions</p>
                <p style={{
                  ...dashboardStyles.cardTrend,
                  ...(summaryData.totalSessions.isPositive ? dashboardStyles.trendUp : dashboardStyles.trendDown),
                }}>
                  {summaryData.totalSessions.trend} vs prev. month
                </p>
              </div>
              <div style={dashboardStyles.summaryCard}>
                <p style={dashboardStyles.cardValue}>{summaryData.avgSessionTime.value}</p>
                <p style={dashboardStyles.cardLabel}>Avg. Session Duration</p>
                <p style={{
                  ...dashboardStyles.cardTrend,
                  ...(summaryData.avgSessionTime.isPositive ? dashboardStyles.trendUp : dashboardStyles.trendDown),
                }}>
                  {summaryData.avgSessionTime.trend} vs prev. month
                </p>
              </div>
              <div style={dashboardStyles.summaryCard}>
                <p style={dashboardStyles.cardValue}>{summaryData.crashRate.value}</p>
                <p style={dashboardStyles.cardLabel}>Crash Rate</p>
                <p style={{
                  ...dashboardStyles.cardTrend,
                  ...(summaryData.crashRate.isPositive ? dashboardStyles.trendUp : dashboardStyles.trendDown),
                }}>
                  {summaryData.crashRate.trend} vs prev. month
                </p>
              </div>
            </div>
            <div style={{ ...dashboardStyles.fullWidth, marginBottom: '24px' }}>
              <UserActivityChart />
            </div>
            <div style={dashboardStyles.grid}>
              <FeatureUsageChart />
              <DeviceDistribution />
            </div>
          </>
        );
        
      case 'activity':
        return <UserActivityChart />;
        
      case 'features':
        return <FeatureUsageChart />;
        
      case 'devices':
        return <DeviceDistribution />;
        
      default:
        return <UserActivityChart />;
    }
  };

  return (
    <div style={dashboardStyles.container}>
      <div style={dashboardStyles.header}>
        <div>
          <h1 style={dashboardStyles.title}>Beta Program Analytics</h1>
          <p style={dashboardStyles.subtitle}>Insights from user activity in the beta testing program</p>
        </div>
        <div>
          {/* Placeholder for date range or export controls */}
        </div>
      </div>

      <div style={dashboardStyles.tabs}>
        <div 
          style={{
            ...dashboardStyles.tab,
            ...(activeTab === 'overview' ? dashboardStyles.activeTab : dashboardStyles.inactiveTab),
          }}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </div>
        <div 
          style={{
            ...dashboardStyles.tab,
            ...(activeTab === 'activity' ? dashboardStyles.activeTab : dashboardStyles.inactiveTab),
          }}
          onClick={() => setActiveTab('activity')}
        >
          User Activity
        </div>
        <div 
          style={{
            ...dashboardStyles.tab,
            ...(activeTab === 'features' ? dashboardStyles.activeTab : dashboardStyles.inactiveTab),
          }}
          onClick={() => setActiveTab('features')}
        >
          Feature Usage
        </div>
        <div 
          style={{
            ...dashboardStyles.tab,
            ...(activeTab === 'devices' ? dashboardStyles.activeTab : dashboardStyles.inactiveTab),
          }}
          onClick={() => setActiveTab('devices')}
        >
          Device Stats
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default BetaProgramDashboard; 