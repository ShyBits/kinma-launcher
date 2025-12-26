import React, { useState, useEffect } from 'react';
import { FileText, DollarSign, BarChart3, Download, Calendar, TrendingUp, Users } from 'lucide-react';
import { getCurrentUserId, getUserData } from '../utils/UserDataManager';
import './GameStudio.css';

const StudioReports = ({ navigate }) => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          navigate('/auth');
          return;
        }
        // Allow access - if user can navigate here, they should be able to see it
        // The main GameStudio page handles access control
      } catch (error) {
        console.error('Error checking access:', error);
      }
    };
    
    checkAccess();
    
    const handleUserChange = () => {
      checkAccess();
    };
    
    window.addEventListener('user-changed', handleUserChange);
    return () => {
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, [navigate]);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const userId = await getCurrentUserId();
        const customGames = await getUserData('customGames', []);
        
        const totalRevenue = customGames.reduce((sum, game) => sum + ((game.downloads || 0) * 2.5), 0);
        const totalDownloads = customGames.reduce((sum, game) => sum + (game.downloads || 0), 0);
        
        setReports([
          {
            id: 1,
            type: 'sales',
            title: 'Sales Report',
            description: 'Complete sales and revenue breakdown',
            icon: DollarSign,
            date: new Date().toLocaleDateString(),
            data: { revenue: totalRevenue, transactions: totalDownloads }
          },
          {
            id: 2,
            type: 'performance',
            title: 'Performance Report',
            description: 'Game performance metrics and analytics',
            icon: BarChart3,
            date: new Date().toLocaleDateString(),
            data: { games: customGames.length, avgDownloads: Math.round(totalDownloads / Math.max(customGames.length, 1)) }
          },
          {
            id: 3,
            type: 'users',
            title: 'User Engagement Report',
            description: 'User activity and engagement statistics',
            icon: Users,
            date: new Date().toLocaleDateString(),
            data: { activeUsers: totalDownloads * 0.3 }
          }
        ]);
      } catch (error) {
        console.error('Error loading reports:', error);
      }
    };
    
    loadReports();
    
    // Listen for game updates
    const handleCustomGameUpdate = () => {
      loadReports();
    };
    
    const handleUserChange = () => {
      loadReports();
    };
    
    window.addEventListener('customGameUpdate', handleCustomGameUpdate);
    window.addEventListener('user-changed', handleUserChange);
    
    return () => {
      window.removeEventListener('customGameUpdate', handleCustomGameUpdate);
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, []);

  const generateReportData = (report) => {
    const data = {
      title: report.title,
      description: report.description,
      date: report.date,
      data: report.data
    };
    return JSON.stringify(data, null, 2);
  };

  const handleExportReport = (report) => {
    try {
      const reportData = generateReportData(report);
      const blob = new Blob([reportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  const handleExportAll = () => {
    try {
      const allReportsData = {
        exportedAt: new Date().toISOString(),
        reports: reports.map(report => ({
          title: report.title,
          description: report.description,
          date: report.date,
          data: report.data
        }))
      };
      const blob = new Blob([JSON.stringify(allReportsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `All_Reports_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting all reports:', error);
      alert('Failed to export reports. Please try again.');
    }
  };

  return (
    <div className="studio-page">
      <div className="studio-header">
        <div className="studio-header-content">
          <h1 className="studio-title">
            <FileText size={24} />
            Reports
          </h1>
          <p className="studio-subtitle">View detailed reports and analytics</p>
        </div>
        <button 
          className="studio-header-action"
          onClick={handleExportAll}
        >
          <Download size={18} />
          <span>Export All</span>
        </button>
      </div>
      
      <div className="studio-content">
        <div className="reports-list">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <div 
                key={report.id} 
                className={`report-item ${selectedReport?.id === report.id ? 'selected' : ''}`}
                onClick={() => setSelectedReport(report)}
              >
                <div className="report-item-icon">
                  <Icon size={20} />
                </div>
                <div className="report-item-content">
                  <div className="report-item-title">{report.title}</div>
                  <div className="report-item-description">{report.description}</div>
                  <div className="report-item-meta">
                    <Calendar size={12} />
                    <span>{report.date}</span>
                  </div>
                </div>
                <button 
                  className="report-item-download"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportReport(report);
                  }}
                >
                  <Download size={16} />
                </button>
              </div>
            );
          })}
        </div>
        
        {selectedReport && (
          <div className="report-details-section">
            <div className="report-details-header">
              <div>
                <h2>{selectedReport.title}</h2>
                <p className="report-details-subtitle">{selectedReport.description}</p>
              </div>
              <button 
                className="report-export-btn"
                onClick={() => handleExportReport(selectedReport)}
              >
                <Download size={16} />
                <span>Export Report</span>
              </button>
            </div>
            <div className="report-details-content">
              <div className="report-details-placeholder-minimal">
                <BarChart3 size={40} />
                <p>Report visualization will be displayed here</p>
                <div className="report-details-stats">
                  {Object.entries(selectedReport.data).map(([key, value]) => (
                    <div key={key} className="report-stat-item">
                      <span className="report-stat-label">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="report-stat-value">
                        {typeof value === 'number' && key.includes('revenue') ? `$${value.toFixed(2)}` : 
                         typeof value === 'number' ? value.toLocaleString() : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioReports;


import { getCurrentUserId, getUserData } from '../utils/UserDataManager';
import './GameStudio.css';

const StudioReports = ({ navigate }) => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          navigate('/auth');
          return;
        }
        // Allow access - if user can navigate here, they should be able to see it
        // The main GameStudio page handles access control
      } catch (error) {
        console.error('Error checking access:', error);
      }
    };
    
    checkAccess();
    
    const handleUserChange = () => {
      checkAccess();
    };
    
    window.addEventListener('user-changed', handleUserChange);
    return () => {
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, [navigate]);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const userId = await getCurrentUserId();
        const customGames = await getUserData('customGames', []);
        
        const totalRevenue = customGames.reduce((sum, game) => sum + ((game.downloads || 0) * 2.5), 0);
        const totalDownloads = customGames.reduce((sum, game) => sum + (game.downloads || 0), 0);
        
        setReports([
          {
            id: 1,
            type: 'sales',
            title: 'Sales Report',
            description: 'Complete sales and revenue breakdown',
            icon: DollarSign,
            date: new Date().toLocaleDateString(),
            data: { revenue: totalRevenue, transactions: totalDownloads }
          },
          {
            id: 2,
            type: 'performance',
            title: 'Performance Report',
            description: 'Game performance metrics and analytics',
            icon: BarChart3,
            date: new Date().toLocaleDateString(),
            data: { games: customGames.length, avgDownloads: Math.round(totalDownloads / Math.max(customGames.length, 1)) }
          },
          {
            id: 3,
            type: 'users',
            title: 'User Engagement Report',
            description: 'User activity and engagement statistics',
            icon: Users,
            date: new Date().toLocaleDateString(),
            data: { activeUsers: totalDownloads * 0.3 }
          }
        ]);
      } catch (error) {
        console.error('Error loading reports:', error);
      }
    };
    
    loadReports();
    
    // Listen for game updates
    const handleCustomGameUpdate = () => {
      loadReports();
    };
    
    const handleUserChange = () => {
      loadReports();
    };
    
    window.addEventListener('customGameUpdate', handleCustomGameUpdate);
    window.addEventListener('user-changed', handleUserChange);
    
    return () => {
      window.removeEventListener('customGameUpdate', handleCustomGameUpdate);
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, []);

  const generateReportData = (report) => {
    const data = {
      title: report.title,
      description: report.description,
      date: report.date,
      data: report.data
    };
    return JSON.stringify(data, null, 2);
  };

  const handleExportReport = (report) => {
    try {
      const reportData = generateReportData(report);
      const blob = new Blob([reportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  const handleExportAll = () => {
    try {
      const allReportsData = {
        exportedAt: new Date().toISOString(),
        reports: reports.map(report => ({
          title: report.title,
          description: report.description,
          date: report.date,
          data: report.data
        }))
      };
      const blob = new Blob([JSON.stringify(allReportsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `All_Reports_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting all reports:', error);
      alert('Failed to export reports. Please try again.');
    }
  };

  return (
    <div className="studio-page">
      <div className="studio-header">
        <div className="studio-header-content">
          <h1 className="studio-title">
            <FileText size={24} />
            Reports
          </h1>
          <p className="studio-subtitle">View detailed reports and analytics</p>
        </div>
        <button 
          className="studio-header-action"
          onClick={handleExportAll}
        >
          <Download size={18} />
          <span>Export All</span>
        </button>
      </div>
      
      <div className="studio-content">
        <div className="reports-list">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <div 
                key={report.id} 
                className={`report-item ${selectedReport?.id === report.id ? 'selected' : ''}`}
                onClick={() => setSelectedReport(report)}
              >
                <div className="report-item-icon">
                  <Icon size={20} />
                </div>
                <div className="report-item-content">
                  <div className="report-item-title">{report.title}</div>
                  <div className="report-item-description">{report.description}</div>
                  <div className="report-item-meta">
                    <Calendar size={12} />
                    <span>{report.date}</span>
                  </div>
                </div>
                <button 
                  className="report-item-download"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportReport(report);
                  }}
                >
                  <Download size={16} />
                </button>
              </div>
            );
          })}
        </div>
        
        {selectedReport && (
          <div className="report-details-section">
            <div className="report-details-header">
              <div>
                <h2>{selectedReport.title}</h2>
                <p className="report-details-subtitle">{selectedReport.description}</p>
              </div>
              <button 
                className="report-export-btn"
                onClick={() => handleExportReport(selectedReport)}
              >
                <Download size={16} />
                <span>Export Report</span>
              </button>
            </div>
            <div className="report-details-content">
              <div className="report-details-placeholder-minimal">
                <BarChart3 size={40} />
                <p>Report visualization will be displayed here</p>
                <div className="report-details-stats">
                  {Object.entries(selectedReport.data).map(([key, value]) => (
                    <div key={key} className="report-stat-item">
                      <span className="report-stat-label">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="report-stat-value">
                        {typeof value === 'number' && key.includes('revenue') ? `$${value.toFixed(2)}` : 
                         typeof value === 'number' ? value.toLocaleString() : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioReports;

