import React, { useState, useMemo, useEffect, useRef } from "react";
import Map, { 
  Marker, 
  Source, 
  Layer, 
  NavigationControl, 
  GeolocateControl, 
  FullscreenControl, 
  ScaleControl,
  Popup 
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./Map.css";

const panelStyle = { /* ... keep your existing panel style ... */
  position: "absolute", top: "10px", left: "10px", background: "white", padding: "15px", 
  borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.3)", zIndex: 10, maxWidth: "250px"
};

const buttonStyle = (isActive) => ({ /* ... keep existing button style ... */
  background: isActive ? "#007bff" : "#f0f0f0", color: isActive ? "white" : "#333",
  border: "1px solid #ccc", padding: "8px 12px", margin: "5px 5px 0 0", borderRadius: "4px", cursor: "pointer"
});

export default function EmergencyMap({ stations, allIncidents, route, focusedLocation }) {
  
  // 1. CREATE A REF FOR THE MAP
  const mapRef = useRef(null);

  const [filterType, setFilterType] = useState("all");
  const [mapStyle, setMapStyle] = useState("https://basemaps.cartocdn.com/gl/positron-gl-style/style.json");
  const [selectedItem, setSelectedItem] = useState(null);
  const [ambulancePos, setAmbulancePos] = useState({ lat: 30.0444, lng: 31.2357 });

  const visibleIncidents = useMemo(() => {
    return filterType === "all" ? allIncidents : allIncidents.filter(inc => inc.type === filterType);
  }, [filterType, allIncidents]);

  // 2. LISTEN FOR FOCUS UPDATES
  useEffect(() => {
    if (focusedLocation && mapRef.current) {
        // Use the mapLibre flyTo animation
        mapRef.current.flyTo({
            center: [focusedLocation.lng, focusedLocation.lat],
            zoom: 15,
            speed: 1.2,
            curve: 1
        });
    }
  }, [focusedLocation]);

  return (
    <div className="map-container">
      
      {/* Control Panel (Keeping your existing UI) */}
      <div style={panelStyle}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>Dispatcher Controls</h3>
        <div style={{ marginBottom: "15px" }}>
            <label style={{fontWeight: 'bold', fontSize: '12px'}}>Filter Incidents:</label><br/>
            <button onClick={() => setFilterType("all")} style={buttonStyle(filterType === "all")}>All</button>
            <button onClick={() => setFilterType("fire")} style={buttonStyle(filterType === "fire")}>Fire 🔥</button>
            <button onClick={() => setFilterType("accident")} style={buttonStyle(filterType === "accident")}>Accident ⚠️</button>
        </div>
        <div>
            <label style={{fontWeight: 'bold', fontSize: '12px'}}>Map Layer:</label><br/>
            <button onClick={() => setMapStyle("https://basemaps.cartocdn.com/gl/positron-gl-style/style.json")} style={buttonStyle(mapStyle.includes("positron"))}>Street</button>
            <button onClick={() => setMapStyle("https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json")} style={buttonStyle(mapStyle.includes("dark-matter"))}>Dark</button>
        </div>
      </div>

      <Map
        ref={mapRef} // 3. ATTACH THE REF HERE
        mapLib={maplibregl}
        initialViewState={{
          longitude: 31.2357,
          latitude: 30.0444,
          zoom: 13,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
      >
        <GeolocateControl position="top-right" />
        <FullscreenControl position="top-right" />
        <NavigationControl position="top-right" showCompass={true} />
        <ScaleControl />

        {/* Stations */}
        {stations.map((st) => (
          <Marker key={st.id} latitude={st.lat} longitude={st.lng} anchor="bottom" onClick={e => { e.originalEvent.stopPropagation(); setSelectedItem(st); }}>
            <div style={{ fontSize: "25px", cursor: "pointer" }}>🏥</div>
          </Marker>
        ))}

        {/* Incidents */}
        {visibleIncidents.map((inc) => (
          <Marker key={inc.id} latitude={inc.lat} longitude={inc.lng} anchor="bottom" onClick={e => { e.originalEvent.stopPropagation(); setSelectedItem(inc); }}>
            <div style={{ fontSize: "28px", cursor: "pointer" }}>
              {inc.type === "fire" ? "🔥" : inc.type === "accident" ? "⚠️" : "🆘"}
            </div>
          </Marker>
        ))}

        {/* Ambulance */}
        <Marker latitude={ambulancePos.lat} longitude={ambulancePos.lng} anchor="center">
           <div style={{ fontSize: "30px", transition: "transform 1.5s linear" }}>🚑</div>
        </Marker>

        {/* Route */}
        <Source id="route" type="geojson" data={route}>
          <Layer id="route-line" type="line" paint={{ "line-color": "#007bff", "line-width": 5, "line-opacity": 0.7 }} />
        </Source>

        {/* Popup */}
        {selectedItem && (
          <Popup latitude={selectedItem.lat} longitude={selectedItem.lng} onClose={() => setSelectedItem(null)} closeButton={true} closeOnClick={false} anchor="top">
            <div style={{ padding: "5px", color: "#333" }}>
              <h3 style={{margin: "0 0 5px 0"}}>{selectedItem.name || selectedItem.type.toUpperCase()}</h3>
              <p style={{margin: 0}}>{selectedItem.trucks ? `Available Trucks: ${selectedItem.trucks}` : selectedItem.desc}</p>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}