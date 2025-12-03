import React, { useState } from "react";
import "./DispatcherControls.css";
// You can install react-icons or just use a text emoji for now
// import { FaCrosshairs } from "react-icons/fa"; 

export default function DispatcherControls({ stations, cars, allIncidents, onAssign, onLocate }) {
    const [activeTab, setActiveTab] = useState("incidents");
    const [selectedIncidentId, setSelectedIncidentId] = useState(null);

    const getSeverityColor = (sev) => {
        if (sev === "Critical") return "#d32f2f";
        if (sev === "High") return "#f57c00";
        return "#388e3c";
    };

    return (
        <div className="dispatcher-controls">
            <header className="dc-header">
                <h2>Dispatcher Command</h2>
                <div className="dc-stats">
                    <span>Active: {allIncidents.filter(i => i.status !== 'Resolved').length}</span>
                    <span>Units Avail: {cars.filter(c => c.status === 'Available').length}</span>
                </div>
            </header>

            <div className="dc-tabs">
                <button className={activeTab === "incidents" ? "active" : ""} onClick={() => setActiveTab("incidents")}>Incidents</button>
                <button className={activeTab === "cars" ? "active" : ""} onClick={() => setActiveTab("cars")}>Units</button>
                <button className={activeTab === "stations" ? "active" : ""} onClick={() => setActiveTab("stations")}>Stations</button>
            </div>

            <div className="dc-content">
                {/* 1. INCIDENTS VIEW */}
                {activeTab === "incidents" && (
                    <div className="list-container">
                        {allIncidents.map((inc) => (
                            <div key={inc.id} className="card incident-card"
                            onClick={() => onLocate(inc.lat, inc.lng)}
                            title="Locate on Map">
                                <div className="card-header">
                                    <span className="badge" style={{backgroundColor: getSeverityColor(inc.severity)}}>{inc.severity}</span>
                                </div>
                                <h4 style={{margin: "5px 0"}}>{inc.type.toUpperCase()}</h4>
                                <p className="card-desc">{inc.desc}</p>
                                
                                <div className="card-footer">
                                    <span className={`status-text ${inc.status.toLowerCase()}`}>Status: {inc.status}</span>
                                    {inc.status === "Pending" ? (
                                        <div className="assign-action">
                                            {selectedIncidentId === inc.id ? (
                                                <div className="unit-selector">
                                                    <select 
                                                        onChange={(e) => {
                                                            if(e.target.value) {
                                                                onAssign(inc.id, e.target.value);
                                                                setSelectedIncidentId(null);
                                                            }
                                                        }}
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled>Select Unit...</option>
                                                        {cars.filter(c => c.status === "Available").map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                    <button className="btn-cancel" onClick={() => setSelectedIncidentId(null)}>X</button>
                                                </div>
                                            ) : (
                                                <button className="btn-dispatch" onClick={() => setSelectedIncidentId(inc.id)}>Dispatch</button>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="assigned-to">Unit: {inc.assignedUnit}</span>
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
                            <div key={car.id} className="card unit-card"
                            onClick={() => onLocate(car.lat, car.lng)}>
                                <div className="unit-info">
                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                        <h4>{car.name}</h4>
                                    </div>
                                    <p>{car.type}</p>
                                </div>
                                <div className={`status-badge ${car.status.toLowerCase()}`}>{car.status}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. STATIONS VIEW */}
                {activeTab === "stations" && (
                    <div className="list-container">
                        {stations.map((st) => (
                            <div key={st.id} className="card station-card"
                            onClick={() => onLocate(st.lat, st.lng)}>
                                <div style={{display:'flex', justifyContent:'space-between'}}>
                                    <h3>{st.name}</h3>
                                </div>
                                <p>Trucks: {st.trucks}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}