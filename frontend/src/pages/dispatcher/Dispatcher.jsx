import React, { useEffect, useState } from "react";
import EmergencyMap from "../../components/map/EmergencyMap";
import DispatcherControls from "../../components/dispatcherControls/DispatcherControls";
import axios from "axios";
// import "./Dispatcher.css"; 

export default function Dispatcher() {
  // 1. DATA STATE 
  const [stations,setStations] = useState([
    { id: 1, name: "Central Command", lat: 31.2252407, lng: 29.9467916, trucks: 5 },
    { id: 2, name: "Downtown Unit", lat: 30.0500, lng: 31.2400, trucks: 2 },
  ]);

  const [incidents, setIncidents] = useState([
    { id: 1, type: "fire", lat: 30.0480, lng: 31.2500, desc: "Building Fire", severity: "High", status: "Pending", assignedUnit: null },
    { id: 2, type: "accident", lat: 30.0530, lng: 31.2280, desc: "Car Crash", severity: "Medium", status: "Pending", assignedUnit: null },
    { id: 3, type: "medical", lat: 30.0400, lng: 31.2300, desc: "Cardiac Arrest", severity: "Critical", status: "Pending", assignedUnit: null },
  ]);

  const [cars, setCars] = useState([
    { id: "c1", name: "Alpha-1", type: "Ambulance", status: "Available", lat: 30.0444, lng: 31.2357 },
    { id: "c2", name: "Bravo-1", type: "Fire Truck", status: "Available", lat: 30.0450, lng: 31.2400 },
    { id: "c3", name: "Charlie-9", type: "Police", status: "Busy", lat: 30.0550, lng: 31.2200 },
  ]);

  const [focusedLocation, setFocusedLocation] = useState(null);

 

  const handleLocate = (lat, lng) => {
    setFocusedLocation({ lat, lng, timestamp: Date.now() }); // Timestamp ensures unique updates even if clicking same spot
  };

  const assignUnit = (incidentId, carId) => {
    const selectedCar = cars.find(c => c.id === carId);
    setIncidents(prev => prev.map(inc => {
        if (inc.id === incidentId) return { ...inc, status: "Dispatched", assignedUnit: selectedCar.name };
        return inc;
    }));
    setCars(prev => prev.map(car => {
        if (car.id === carId) return { ...car, status: "Busy" };
        return car;
    }));
  };


  const getIncidents = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/admin/incidents/",
        { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
      );
        if (response.data) {
            setIncidents(response.data.incidents);
            console.log("Fetched incidents:", response.data.incidents);
        }
    } catch (error) {
      console.error("Error fetching incidents:", error);
    }
    };

    const getStations = async () => {
        try {
            const response = await axios.get("http://127.0.0.1:8000/admin/stations/",
                { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
            );
            if (response.data) {
                setStations(response.data.stations);
                console.log("Fetched stations:", response.data.stations);
            }
        } catch (error) {
            console.error("Error fetching stations:", error);
        }
    };

    const getVehicles = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/admin/vehicles/",
          { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }
        );
            if (response.data) {
                setCars(response.data.vehicles);
                console.log("Fetched vehicles:", response.data.vehicles);
            }
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        }
        };

    useEffect(() => {
      getIncidents();
      getVehicles();
      getStations();
    }, []);


    
    
        


  return (
    <div className="dispatcher-layout" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <div style={{ width: "400px", zIndex: 20, boxShadow: "2px 0 10px rgba(0,0,0,0.1)" }}>
        <DispatcherControls 
            stations={stations} 
            cars={cars} 
            allIncidents={incidents}
            onAssign={assignUnit}
            onLocate={handleLocate} // Pass the function down
        />
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        <EmergencyMap 
            stations={stations} 
            cars={cars}
            allIncidents={incidents} 
            // route={route} 
            focusedLocation={focusedLocation} // Pass the state down
        />
      </div>
    </div>
  );
}