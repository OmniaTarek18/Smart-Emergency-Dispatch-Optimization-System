import React, { act, useState,useEffect } from "react";
import "./DispatcherControls.css";
import axios from "axios";

export default function DispatcherControls({
  stations,
  cars,
  allIncidents,
  onAssign,
  onLocate,
  onAddIncident,
  onAddVehicle, 
  onAddStation, 
  pickedLocation,
  clearPickedLocation,
  isAddingCar,
  isAddingIncident,
  isAddingStation,
  setIsAddingCar,
  setIsAddingIncident,
  setIsAddingStation,
}) {
  const [activeTab, setActiveTab] = useState("incidents");
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  // Toggle States
  

  // Form States
  const [incidentForm, setIncidentForm] = useState({
    type: "POLICE",
    severity: "MEDIUM",
    lat: "",
    lng: "",
  });
  const [carForm, setCarForm] = useState({
    stationId: "",
    capacity: 1,
    lat: "",
    lng: "",
  });
  const [stationForm, setStationForm] = useState({
    type: "POLICE",
    zone: "",
    lat: "",
    lng: "",
  });

  const getSeverityColor = (sev) => {
    if (sev === "CRITICAL") return "#d32f2f";
    if (sev === "HIGH") return "#f57c00";
    return "#388e3c";
  };

  

  const handleInputChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (pickedLocation && isAddingIncident) {
      setIncidentForm(prev => ({
        ...prev,
        lat: pickedLocation.lat.toFixed(6),
        lng: pickedLocation.lng.toFixed(6)
      }));
    }
    if (pickedLocation && isAddingCar) {
      setCarForm(prev => ({
        ...prev,
        lat: pickedLocation.lat.toFixed(6),
        lng: pickedLocation.lng.toFixed(6)
      }));
    }
    if (pickedLocation && isAddingStation) {
      setStationForm(prev => ({
        ...prev,
        lat: pickedLocation.lat.toFixed(6),
        lng: pickedLocation.lng.toFixed(6)
      }));
    }
  }, [pickedLocation]);

  // --- SUBMIT HANDLERS ---
  const handleSubmitIncident = (e) => {
    e.preventDefault();
    

    axios
      .post(
        "http://127.0.0.1:8000/incidents/report/",
        {
          type: incidentForm.type,
          severity_level: incidentForm.severity,
          lat: parseFloat(incidentForm.lat),
          lng: parseFloat(incidentForm.lng),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      )
      .then((response) => {
        console.log("Incident reported:", response.data);
        if (onAddIncident) onAddIncident(response.data);
        clearPickedLocation();
        setIncidentForm({ type: "POLICE", severity: "MEDIUM", lat: "", lng: "" });
        setIsAddingIncident(false);
      })
      .catch((error) => {
        console.error("Error reporting incident:", error);
      });

    
  };

  const handleSubmitCar = (e) => {
    e.preventDefault();
    

    axios
      .post(
        "http://127.0.0.1:8000/admin/vehicles/create/",
        {
          station_id: parseInt(carForm.stationId),
          capacity: parseInt(carForm.capacity),
          lat: parseFloat(carForm.lat),
          lng: parseFloat(carForm.lng),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      )
      .then((response) => {
        console.log("Vehicle added:", response.data);
        if (onAddVehicle) onAddVehicle(response.data); // Notify parent
        clearPickedLocation();
        setCarForm({ stationId: "", capacity: 1, lat: "", lng: "" });
        setIsAddingCar(false);
      })
      .catch((error) => {
        console.error("Error adding vehicle:", error);
      });

    
  };

  const handleSubmitStation = (e) => {
    e.preventDefault();
    

    axios
      .post(
        "http://127.0.0.1:8000/admin/stations/create/",
        {
          type: stationForm.type,
          zone: stationForm.zone,
          lat: parseFloat(stationForm.lat),
          lng: parseFloat(stationForm.lng),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      )
      .then((response) => {
        console.log("Station added:", response.data);
        if (onAddStation) onAddStation(response.data); // Notify parent
        clearPickedLocation();
        setStationForm({ type: "POLICE", zone: "", lat: "", lng: "" });
        setIsAddingStation(false);
      })
      .catch((error) => {
        console.error("Error adding station:", error);
      });

    
  };

  const deleteCar = async (carId) => {
    await axios
      .delete("http://127.0.0.1:8000/admin/vehicles/delete/", {
        data: { vehicle_id: carId },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
      })
      .then((response) => {
        console.log("Vehicle deleted:", response.data);
        // Optionally, you can notify the parent component to refresh the vehicle list
      })
      .catch((error) => {
        alert("Error deleting vehicle:", error);
      });
  };

  // --- RENDER FUNCTIONS ---

  return (
    <div className="dispatcher-controls">
      <header className="dc-header">
        <h2>Dispatcher Command</h2>
        <div className="dc-stats">
          <span>
            Active: {allIncidents.filter((i) => i.status !== "RESOLVED").length}
          </span>
          <span>
            Units Avail: {cars.filter((c) => c.status === "AVAILABLE").length}
          </span>
        </div>
      </header>

      {/* TABS (Disable tabs while adding to prevent confusion) */}
      <div className="dc-tabs">
        <button
          className={activeTab === "incidents" ? "active" : ""}
          onClick={() => {
            setActiveTab("incidents");
            setIsAddingIncident(false);
          }}
        >
          Incidents
        </button>
        <button
          className={activeTab === "cars" ? "active" : ""}
          onClick={() => {
            setActiveTab("cars");
            setIsAddingCar(false);
          }}
        >
          Units
        </button>
        <button
          className={activeTab === "stations" ? "active" : ""}
          onClick={() => {
            setActiveTab("stations");
            setIsAddingStation(false);
          }}
        >
          Stations
        </button>
      </div>
      {activeTab === "incidents" && !isAddingIncident && (
        <div className="add-button-container">
          <button
            className="add-button-incident"
            onClick={() => setIsAddingIncident(true)}
          >
            + Report Incident
          </button>
        </div>
      )}

      {activeTab === "cars" && !isAddingCar && (
        <div className="add-button-container">
          <button
            className="add-button-car"
            onClick={() => setIsAddingCar(true)}
          >
            + New Vehicle
          </button>
        </div>
      )}

      {activeTab === "stations" && !isAddingStation && (
        <div className="add-button-container">
          <button
            className="add-button-station"
            onClick={() => setIsAddingStation(true)}
          >
            + New Station
          </button>
        </div>
      )}

      <div className="dc-content">
        {/* =======================
            1. INCIDENTS TAB
           ======================= */}
        {activeTab === "incidents" && (
          <>
            {!isAddingIncident ? (
              <>
                <div className="list-container">
                  {allIncidents.map((inc) => (
                    <div
                      key={inc.incident_id}
                      className="card incident-card"
                      onClick={() => onLocate(inc.lat, inc.lng)}
                    >
                      <div className="card-header">
                        <span
                          className="badge"
                          style={{
                            backgroundColor: getSeverityColor(
                              inc.severity_level
                            ),
                          }}
                        >
                          {inc.severity_level}
                        </span>
                        <p className="card-desc" style={{ marginLeft: "auto" }}>
                          ID: {inc.incident_id}
                        </p>
                      </div>
                      <h4>{inc.type.toUpperCase()}</h4>
                      <p className="card-desc">Region: {inc.station_zones}</p>
                      <p className="card-desc">Reported Time: {inc.time_reported}</p>

                      <div className="card-footer">
                        <span
                          className={`status-text ${inc.status.toLowerCase()}`}
                        >
                          Status: {inc.status}
                        </span>
                        {inc.status === "REPORTED" ? (
                          <div className="assign-action">
                            {selectedIncidentId === inc.incident_id ? (
                              <div className="unit-selector">
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      onAssign(inc.incident_id, e.target.value);
                                      setSelectedIncidentId(null);
                                    }
                                  }}
                                  defaultValue=""
                                  onClick={(e) => e.stopPropagation()} // Prevent card click
                                >
                                  <option value="" disabled>
                                    Select Unit...
                                  </option>
                                  {cars
                                    .filter((c) => c.status === "AVAILABLE")
                                    .map((c) => (
                                      <option
                                        key={c.vehicle_id}
                                        value={c.vehicle_id}
                                      >
                                        {c.vehicle_id}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  className="btn-cancel"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedIncidentId(null);
                                  }}
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn-dispatch"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedIncidentId(inc.incident_id);
                                }}
                              >
                                Dispatch
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="assigned-to">
                            Unit: {inc.vehicle_ids}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              // --- ADD INCIDENT FORM ---
              <form className="add-form" onSubmit={handleSubmitIncident}>
                <h3>Report New Incident</h3>

                <p style={{ fontSize: "12px", color: "#666" }}>
                  Tip: Click anywhere on the map to set the location.
                </p>

                <label>Type</label>
                <select
                  name="type"
                  value={incidentForm.type}
                  onChange={handleInputChange(setIncidentForm)}
                >
                  <option value="POLICE">POLICE</option>
                  <option value="FIRE">FIRE</option>
                  <option value="MEDICAL">MEDICAL</option>
                </select>

                <label>Severity</label>
                <select
                  name="severity"
                  value={incidentForm.severity}
                  onChange={handleInputChange(setIncidentForm)}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>

                <div className="form-row">
                  <div>
                    <label>Lat</label>
                    <input
                      type="number"
                      step="any"
                      name="lat"
                      required
                      readOnly // NEW: Make read-only to encourage map use
                      style={{ backgroundColor: "#f0f0f0" }}
                      value={incidentForm.lat}
                      onChange={handleInputChange(setIncidentForm)}
                    />
                  </div>
                  <div>
                    <label>Lng</label>
                    <input
                      type="number"
                      step="any"
                      name="lng"
                      required
                      readOnly // NEW: Make read-only to encourage map use
                      style={{ backgroundColor: "#f0f0f0" }}
                      value={incidentForm.lng}
                      onChange={handleInputChange(setIncidentForm)}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                        setIsAddingIncident(false);
                        clearPickedLocation(); // NEW: Clear pin on cancel
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-save">
                    Report Incident
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* =======================
            2. CARS TAB
           ======================= */}
        {activeTab === "cars" && (
          <>
            {!isAddingCar ? (
              <>
                <div className="list-container">
                  {cars.map((car) => (
                    <div
                      key={car.vehicle_id}
                      className="card unit-card"
                      onClick={() => onLocate(car.lat, car.lng)}
                    >
                      <div className="unit-info">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <button
                              className="delete-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCar(car.vehicle_id);
                              }}
                            >
                              DELETE
                            </button>
                          </div>
                          <h4>{car.vehicle_type}</h4>
                          <div
                            className={`status-badge ${car.status.toLowerCase()}`}
                          >
                            {car.status}
                          </div>
                        </div>
                      </div>
                      <div className="card-footer">
                        <span className="card-desc">ID: {car.vehicle_id}</span>
                        <span className="card-desc">
                          Station: {car.station_id}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              // --- ADD CAR FORM ---
              <form className="add-form" onSubmit={handleSubmitCar}>
                <h3>Register New Vehicle</h3>

                <label>Station ID</label>
                <input
                  type="number"
                  name="stationId"
                  required
                  value={carForm.stationId}
                  onChange={handleInputChange(setCarForm)}
                  placeholder="e.g. 1"
                />

                <label>Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  min="1"
                  required
                  value={carForm.capacity}
                  onChange={handleInputChange(setCarForm)}
                />

                <div className="form-row">
                  <div>
                    <label>Lat</label>
                    <input
                      type="number"
                      step="any"
                      name="lat"
                      required
                      readOnly // NEW: Make read-only to encourage map use
                      style={{ backgroundColor: "#f0f0f0" }}
                      value={carForm.lat}
                      onChange={handleInputChange(setCarForm)}
                    />
                  </div>
                  <div>
                    <label>Lng</label>
                    <input
                      type="number"
                      step="any"
                      name="lng"
                      required
                      readOnly // NEW: Make read-only to encourage map use
                      style={{ backgroundColor: "#f0f0f0" }}
                      value={carForm.lng}
                      onChange={handleInputChange(setCarForm)}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setIsAddingCar(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-save">
                    Add Vehicle
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* =======================
            3. STATIONS TAB
           ======================= */}
        {activeTab === "stations" && (
          <>
            {!isAddingStation ? (
              <>
                <div className="list-container">
                  {stations.map((st) => (
                    <div
                      key={st.station_id}
                      className="card station-card"
                      onClick={() => onLocate(st.lat, st.lng)}
                    >
                      <div
                        style={{
                          display: "block",
                          justifyContent: "space-between",
                          
                        }}
                      >
                        <h3>{st.type}</h3>
                      </div>
                      <p className="card-desc">Zone: {st.zone}</p>
                      <p className="card-desc">Trucks: {st.vehicle_count}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              // --- ADD STATION FORM ---
              <form className="add-form" onSubmit={handleSubmitStation}>
                <h3>Construct New Station</h3>

                <label>Type</label>
                <select
                  name="type"
                  value={stationForm.type}
                  onChange={handleInputChange(setStationForm)}
                >
                  <option value="POLICE">POLICE</option>
                  <option value="FIRE">FIRE</option>
                  <option value="MEDICAL">MEDICAL</option>
                </select>

                <label>Zone Name</label>
                <input
                  type="text"
                  name="zone"
                  required
                  value={stationForm.zone}
                  onChange={handleInputChange(setStationForm)}
                  placeholder="e.g. Smouha"
                />

                <div className="form-row">
                  <div>
                    <label>Lat</label>
                    <input
                      type="number"
                      step="any"
                      name="lat"
                      required
                      readOnly // NEW: Make read-only to encourage map use
                      style={{ backgroundColor: "#f0f0f0" }}
                      value={stationForm.lat}
                      onChange={handleInputChange(setStationForm)}
                    />
                  </div>
                  <div>
                    <label>Lng</label>
                    <input
                      type="number"
                      step="any"
                      name="lng"
                      required
                      readOnly // NEW: Make read-only to encourage map use
                      style={{ backgroundColor: "#f0f0f0" }}
                      value={stationForm.lng}
                      onChange={handleInputChange(setStationForm)}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setIsAddingStation(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-save">
                    Build Station
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
