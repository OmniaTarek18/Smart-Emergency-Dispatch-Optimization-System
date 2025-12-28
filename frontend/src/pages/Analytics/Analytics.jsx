import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Clock, CheckCircle, Activity, Award, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from "../../interceptor/api";
import './Analytics.css';

const COLORS = {
  POLICE: '#8b5cf6',
  MEDICAL: '#3b82f6',
  FIRE: '#ef4444',
};

export default function Analytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await api.get("http://127.0.0.1:8000/admin/analytics/", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setAnalytics(response.data.analytics);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
        setError("Failed to load analytics data");
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading-state">Loading analytics...</div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="analytics-container">
        <div className="error-state">{error || "No data available"}</div>
      </div>
    );
  }

  // Prepare data for charts
  const incidentTypeData = analytics.total_incidents_type.map(item => ({
    name: item.type,
    value: item.total_count,
    color: COLORS[item.type] || '#666'
  }));

  const resolutionRateData = analytics.total_incidents_type.map(item => ({
    name: item.type,
    rate: parseFloat(item.resolution_rate_percentage.toFixed(1))
  }));

  const avgResolutionTimeData = analytics.total_incidents_type.map(item => ({
    name: item.type,
    time: parseFloat(item.avg_resolution_time_minutes.toFixed(1))
  }));

  const vehicleData = analytics.active_vehicles_type.map(item => ({
    name: item.station_type,
    count: item.vehicle_count
  }));

  const totalIncidents = analytics.total_incidents_type.reduce((sum, item) => sum + item.total_count, 0);
  const totalResolved = analytics.total_incidents_type.reduce((sum, item) => sum + item.resolved_count, 0);
  const totalActive = analytics.total_incidents_type.reduce((sum, item) => sum + item.assigned_count, 0);
  const totalVehicles = analytics.active_vehicles_type.reduce((sum, item) => sum + item.vehicle_count, 0);

  return (
    <div className="analytics-container">
      <header className="analytics-header">
        <div className="header-content">
          <div className="header-left">
            <button className="back-button" onClick={() => navigate('/')}>
              <ArrowLeft className="icon" />
            </button>
            <div>
              <h1 className="header-title">Analytics Dashboard</h1>
              <p className="header-subtitle">Performance metrics and insights</p>
            </div>
          </div>
        </div>
      </header>

      <div className="analytics-content">
        {/* Main Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="card-header">
              <span className="card-title">Avg Response Time</span>
              <Clock className="card-icon" />
            </div>
            <div className="card-content">
              <div className="stat-value">{parseFloat(analytics.average_response_time).toFixed(0)} min</div>
              <p className="stat-description">
                Min: {analytics.min_response_time} | Max: {analytics.max_response_time}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-header">
              <span className="card-title">Total Incidents</span>
              <TrendingUp className="card-icon" />
            </div>
            <div className="card-content">
              <div className="stat-value">{totalIncidents}</div>
              <p className="stat-description">
                {totalActive} currently assigned
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-header">
              <span className="card-title">Resolved Incidents</span>
              <CheckCircle className="card-icon" />
            </div>
            <div className="card-content">
              <div className="stat-value">{totalResolved}</div>
              <p className="stat-description">
                {totalIncidents > 0 ? ((totalResolved / totalIncidents) * 100).toFixed(1) : 0}% resolution rate
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="card-header">
              <span className="card-title">Total Vehicles</span>
              <Activity className="card-icon" />
            </div>
            <div className="card-content">
              <div className="stat-value">{totalVehicles}</div>
              <p className="stat-description">
                Active fleet
              </p>
            </div>
          </div>
        </div>

        {/* Best/Worst Performers */}
        <div className="performers-grid">
          <div className="performer-card best">
            <div className="performer-header">
              <Award className="performer-icon" />
              <div>
                <h3 className="performer-title">Best Responder</h3>
                <p className="performer-subtitle">Fastest average response time</p>
              </div>
            </div>
            <div className="performer-content">
              <p className="performer-name">{analytics.best_responder.responder_name}</p>
              <p className="performer-email">{analytics.best_responder.email}</p>
              <div className="performer-stats">
                <div className="performer-stat">
                  <span className="stat-label">Avg Response Time</span>
                  <span className="stat-value">{analytics.best_responder.avg_response_time_minutes.toFixed(1)} min</span>
                </div>
                <div className="performer-stat">
                  <span className="stat-label">Incidents Resolved</span>
                  <span className="stat-value">{analytics.best_responder.total_incidents_resolved}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="performer-card worst">
            <div className="performer-header">
              <AlertTriangle className="performer-icon" />
              <div>
                <h3 className="performer-title">Needs Improvement</h3>
                <p className="performer-subtitle">Slowest average response time</p>
              </div>
            </div>
            <div className="performer-content">
              <p className="performer-name">{analytics.worst_responder.responder_name}</p>
              <p className="performer-email">{analytics.worst_responder.email}</p>
              <div className="performer-stats">
                <div className="performer-stat">
                  <span className="stat-label">Avg Response Time</span>
                  <span className="stat-value">{analytics.worst_responder.avg_response_time_minutes.toFixed(1)} min</span>
                </div>
                <div className="performer-stat">
                  <span className="stat-label">Incidents Resolved</span>
                  <span className="stat-value">{analytics.worst_responder.total_incidents_resolved}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Station Performance */}
        <div className="station-grid">
          <div className="station-card">
            <div className="chart-header">
              <h3 className="chart-title">Best Performing Station</h3>
              <p className="chart-description">{analytics.best_station.station_type} Station</p>
            </div>
            <div className="station-stats">
              <div className="station-stat">
                <span className="stat-label">Avg Response Time</span>
                <span className="stat-value">{(parseFloat(analytics.best_station.average_response_time) / 60).toFixed(1)} min</span>
              </div>
              <div className="station-stat">
                <span className="stat-label">Resolved Incidents</span>
                <span className="stat-value">{analytics.best_station.resolved_count}</span>
              </div>
            </div>
          </div>

          <div className="station-card">
            <div className="chart-header">
              <h3 className="chart-title">Station Needing Support</h3>
              <p className="chart-description">{analytics.worst_station.station_type} Station</p>
            </div>
            <div className="station-stats">
              <div className="station-stat">
                <span className="stat-label">Avg Response Time</span>
                <span className="stat-value">{(parseFloat(analytics.worst_station.average_response_time) / 60).toFixed(1)} min</span>
              </div>
              <div className="station-stat">
                <span className="stat-label">Resolved Incidents</span>
                <span className="stat-value">{analytics.worst_station.resolved_count}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Incidents by Type</h3>
              <p className="chart-description">Distribution of emergency types</p>
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incidentTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incidentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Resolution Rate by Type</h3>
              <p className="chart-description">Percentage of resolved incidents</p>
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resolutionRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Average Resolution Time</h3>
              <p className="chart-description">Time in minutes by incident type</p>
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={avgResolutionTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="time" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Vehicle Distribution</h3>
              <p className="chart-description">Vehicles by station type</p>
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vehicleData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Incident Breakdown */}
        <div className="vehicle-card">
          <div className="chart-header">
            <h3 className="chart-title">Detailed Incident Breakdown</h3>
            <p className="chart-description">Status breakdown by incident type</p>
          </div>
          <div className="incident-breakdown">
            {analytics.total_incidents_type.map((incident) => (
              <div key={incident.type} className="incident-type-box">
                <h4 className="incident-type-title">{incident.type}</h4>
                <div className="incident-stats-grid">
                  <div className="incident-stat">
                    <span className="incident-stat-label">Total</span>
                    <span className="incident-stat-value">{incident.total_count}</span>
                  </div>
                  <div className="incident-stat">
                    <span className="incident-stat-label">Resolved</span>
                    <span className="incident-stat-value resolved">{incident.resolved_count}</span>
                  </div>
                  <div className="incident-stat">
                    <span className="incident-stat-label">Assigned</span>
                    <span className="incident-stat-value assigned">{incident.assigned_count}</span>
                  </div>
                  <div className="incident-stat">
                    <span className="incident-stat-label">Reported</span>
                    <span className="incident-stat-value reported">{incident.reported_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}