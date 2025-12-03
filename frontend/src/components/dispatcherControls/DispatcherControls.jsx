import React, { useState } from "react";
import "./DispatcherControls.css";
// You can install react-icons or just use a text emoji for now
// import { FaCrosshairs } from "react-icons/fa";

export default function DispatcherControls({
  stations,
  cars,
  allIncidents,
  onAssign,
  onLocate,
}) {
  const [activeTab, setActiveTab] = useState("incidents");
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  const getSeverityColor = (sev) => {
    if (sev === "CRITICAL") return "#d32f2f";
    if (sev === "HIGH") return "#f57c00";
    return "#388e3c";
  };

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

      <div className="dc-tabs">
        <button
          className={activeTab === "incidents" ? "active" : ""}
          onClick={() => setActiveTab("incidents")}
        >
          Incidents
        </button>
        <button
          className={activeTab === "cars" ? "active" : ""}
          onClick={() => setActiveTab("cars")}
        >
          Units
        </button>
        <button
          className={activeTab === "stations" ? "active" : ""}
          onClick={() => setActiveTab("stations")}
        >
          Stations
        </button>
      </div>

      <div className="dc-content">
        {/* 1. INCIDENTS VIEW */}
        {activeTab === "incidents" && (
          <div className="list-container">
            {allIncidents.map((inc) => (
              <div
                key={inc.incident_id}
                className="card incident-card"
                onClick={() => onLocate(inc.lat, inc.lng)}
                title="Locate on Map"
              >
                <div className="card-header">
                  <span
                    className="badge"
                    style={{
                      backgroundColor: getSeverityColor(inc.severity_level),
                    }}
                  >
                    {inc.severity_level}
                  </span>
                  <p className="card-desc" style={{ marginLeft: "auto" }}>
                    ID: {inc.incident_id}
                  </p>
                </div>
                <h4 style={{ margin: "5px 0" }}>{inc.type.toUpperCase()}</h4>
                <p className="card-desc">Region: {inc.station_zones}</p>
                <p className="card-desc">Reported Time: {inc.time_reported}</p>
                <p className="card-desc">
                  {inc.time_resolved && `Resolved Time: ${inc.time_resolved}`}
                </p>

                <div className="card-footer">
                  <span className={`status-text ${inc.status.toLowerCase()}`}>
                    Status: {inc.status}
                  </span>
                  {inc.status === "REPORTED" ? (
                    <div className="assign-action">
                      {selectedIncidentId === inc.id ? (
                        <div className="unit-selector">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                onAssign(inc.id, e.target.value);
                                setSelectedIncidentId(null);
                              }
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Select Unit...
                            </option>
                            {cars
                              .filter((c) => c.status === "AVAILABLE")
                              .map((c) => (
                                <option key={c.vehicle_id} value={c.vehicle_id}>
                                  {c.vehicle_id}
                                </option>
                              ))}
                          </select>
                          <button
                            className="btn-cancel"
                            onClick={() => setSelectedIncidentId(null)}
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-dispatch"
                          onClick={() => setSelectedIncidentId(inc.id)}
                        >
                          Dispatch
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="assigned-to">
                      Unit id: {inc.vehicle_ids}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. CARS VIEW */}
        {activeTab === "cars" && (
          <div className="list-container">
            {cars.map((car) => (
              <>
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
                      <h4>{car.vehicle_type}</h4>
                      <div
                        className={`status-badge ${car.status.toLowerCase()}`}
                      >
                        {car.status}
                      </div>
                    </div>
                  </div>

                  <br />
                  <div className="card-footer">
                    <span className="card-desc">ID: {car.vehicle_id}</span>
                    <span className="card-desc">
                      Responder: {car.responder_type}
                    </span>
                  </div>
                </div>
              </>
            ))}
          </div>
        )}

        {/* 3. STATIONS VIEW */}
        {activeTab === "stations" && (
          <div className="list-container">
            {stations.map((st) => (
              <div
                key={st.station_id}
                className="card station-card"
                onClick={() => onLocate(st.lat, st.lng)}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <h3>{st.type}</h3>
                </div>
                <p className="card-desc">ID: {st.station_id}</p>
                <p className="card-desc">Zone: {st.zone}</p>
                <p>Trucks: {st.vehicle_count}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
