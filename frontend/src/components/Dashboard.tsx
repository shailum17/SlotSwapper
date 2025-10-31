import React, { useState } from 'react';
import { useAuth } from '../contexts';
import CalendarDashboard from './CalendarDashboard';
import MarketplaceView from './MarketplaceView';
import NotificationsView from './NotificationsView';
import './Dashboard.css';

type TabType = 'calendar' | 'marketplace' | 'notifications';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('calendar');

  const handleLogout = () => {
    logout();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'calendar':
        return <CalendarDashboard />;
      case 'marketplace':
        return <MarketplaceView />;
      case 'notifications':
        return <NotificationsView />;
      default:
        return <CalendarDashboard />;
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>SlotSwapper Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.name}!</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <nav className="dashboard-nav">
        <div className="nav-content">
          <button
            className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            My Calendar
          </button>
          <button
            className={`nav-tab ${activeTab === 'marketplace' ? 'active' : ''}`}
            onClick={() => setActiveTab('marketplace')}
          >
            Marketplace
          </button>
          <button
            className={`nav-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </button>
        </div>
      </nav>
      
      <main className="dashboard-main">
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;