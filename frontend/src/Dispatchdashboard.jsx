import React, { useState, useEffect } from 'react';
import { MapPin, Truck, AlertCircle, CheckCircle, Clock, Radio, Building2, Users } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

const DispatchDashboard = () => {
  const [incidents, setIncidents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  useEffect(() => {
    if (token) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [token, filter]);

  const fetchData = () => {
    fetchIncidents();
    fetchVehicles();
    fetchStations();
  };

  const fetchIncidents = async () => {
    try {
      const url = filter === 'all' 
        ? `${API_BASE_URL}/admin/incidents/`
        : `${API_BASE_URL}/admin/incidents/?status=${filter}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setIncidents(data.incidents || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/vehicles/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchStations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stations/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStations(data.stations || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const openDispatchModal = async (incident) => {
    setSelectedIncident(incident);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/incidents/${incident.incident_id}/dispatches/`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setSelectedDispatch(data.dispatches && data.dispatches.length > 0 ? data.dispatches[0] : null);
      setShowDispatchModal(true);
    } catch (error) {
      console.error('Error fetching dispatch:', error);
    }
  };

  const modifyDispatch = async (newVehicleId) => {
    if (!selectedDispatch) {
      alert('No dispatch found for this incident');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/incidents/dispatch/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dispatch_id: selectedDispatch.dispatch_id,
          new_vehicle_id: newVehicleId
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Dispatch modified successfully!');
        setShowDispatchModal(false);
        fetchData();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      alert('Error modifying dispatch: ' + error.message);
    }
    setLoading(false);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      LOW: 'bg-blue-100 text-blue-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      REPORTED: 'bg-yellow-100 text-yellow-800',
      ASSIGNED: 'bg-blue-100 text-blue-800',
      RESOLVED: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getVehicleStatusColor = (status) => {
    const colors = {
      AVAILABLE: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      ON_ROUTE: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type) => {
    const icons = {
      MEDICAL: '🚑',
      FIRE: '🚒',
      POLICE: '🚓'
    };
    return icons[type] || '🚨';
  };

  const availableVehicles = vehicles.filter(v => v.status === 'AVAILABLE');
  const reportedIncidents = incidents.filter(i => i.status === 'REPORTED');
  const assignedIncidents = incidents.filter(i => i.status === 'ASSIGNED');

//   if (!token) {
//     return (
//       <div className="min-h-screen bg-gray-100 flex items-center justify-center">
//         <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
//           <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
//           <p className="text-gray-600 mb-4">Please login to access the dispatch dashboard.</p>
//           <p className="text-sm text-gray-500">Use the login endpoint to get an access token.</p>
//         </div>
//       </div>
//     );
//   }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Emergency Dispatch Dashboard</h1>
          <p className="text-gray-600">Real-time incident monitoring and dispatch management</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Incidents</p>
                <p className="text-2xl font-bold">{incidents.length}</p>
              </div>
              <AlertCircle className="text-blue-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reported</p>
                <p className="text-2xl font-bold text-yellow-600">{reportedIncidents.length}</p>
              </div>
              <Clock className="text-yellow-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assigned</p>
                <p className="text-2xl font-bold text-blue-600">{assignedIncidents.length}</p>
              </div>
              <Radio className="text-blue-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Vehicles</p>
                <p className="text-2xl font-bold text-green-600">{availableVehicles.length}</p>
              </div>
              <Truck className="text-green-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stations</p>
                <p className="text-2xl font-bold">{stations.length}</p>
              </div>
              <Building2 className="text-purple-500" size={32} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incidents List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Active Incidents</h2>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="REPORTED">Reported</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[600px]">
              {incidents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No incidents to display
                </div>
              ) : (
                incidents.map((incident) => (
                  <div
                    key={incident.incident_id}
                    className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getTypeIcon(incident.type)}</span>
                        <div>
                          <p className="font-semibold text-gray-800">
                            Incident #{incident.incident_id}
                          </p>
                          <p className="text-sm text-gray-500">{incident.type}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(incident.severity_level)}`}>
                          {incident.severity_level}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                          {incident.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{incident.lat?.toFixed(2)}, {incident.lng?.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{new Date(incident.time_reported).toLocaleString()}</span>
                      </div>
                    </div>

                    {incident.station_zones && (
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Assigned Stations:</span> {incident.station_zones}
                      </div>
                    )}

                    {incident.vehicle_ids && (
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Vehicle IDs:</span> {incident.vehicle_ids}
                      </div>
                    )}
                    
                    {incident.status === 'ASSIGNED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDispatchModal(incident);
                        }}
                        className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Modify Dispatch
                      </button>
                    )}

                    {incident.response_time && (
                      <div className="text-xs text-gray-500 mt-2">
                        Response time: {incident.response_time} minutes
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Vehicles Panel */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold">Vehicles</h2>
            </div>
            
            <div className="overflow-y-auto max-h-[600px]">
              {vehicles.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No vehicles available
                </div>
              ) : (
                vehicles.map((vehicle) => (
                  <div
                    key={vehicle.vehicle_id}
                    className="p-4 border-b border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getTypeIcon(vehicle.vehicle_type)}</span>
                        <div>
                          <p className="font-semibold text-gray-800">Vehicle #{vehicle.vehicle_id}</p>
                          <p className="text-sm text-gray-500">{vehicle.vehicle_type}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVehicleStatusColor(vehicle.status)}`}>
                        {vehicle.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{vehicle.lat?.toFixed(2)}, {vehicle.lng?.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 size={14} />
                        <span>{vehicle.zone || 'Unknown Zone'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>Capacity: {vehicle.capacity} | Responders: {vehicle.responder_count}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Dispatch Modal */}
        {showDispatchModal && selectedIncident && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold">Modify Dispatch for Incident #{selectedIncident.incident_id}</h2>
                <p className="text-gray-600 mt-2">
                  {selectedIncident.type} - {selectedIncident.severity_level}
                </p>
              </div>
              
              <div className="p-6">
                <h3 className="font-semibold mb-3">Select New Vehicle:</h3>
                <div className="space-y-2">
                  {vehicles
                    .filter(v => v.vehicle_type === selectedIncident.type && v.status === 'AVAILABLE')
                    .map((vehicle) => (
                      <button
                        key={vehicle.vehicle_id}
                        onClick={() => modifyDispatch(vehicle.vehicle_id)}
                        disabled={loading}
                        className="w-full p-4 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 text-left disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">Vehicle #{vehicle.vehicle_id}</p>
                            <p className="text-sm text-gray-600">
                              {vehicle.zone} - Capacity: {vehicle.capacity}
                            </p>
                            <p className="text-xs text-gray-500">
                              Location: {vehicle.lat?.toFixed(2)}, {vehicle.lng?.toFixed(2)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVehicleStatusColor(vehicle.status)}`}>
                            {vehicle.status}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
                
                {vehicles.filter(v => v.vehicle_type === selectedIncident.type && v.status === 'AVAILABLE').length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No available vehicles of type {selectedIncident.type}
                  </p>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DispatchDashboard;