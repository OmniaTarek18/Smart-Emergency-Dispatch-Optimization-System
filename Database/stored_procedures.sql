DELIMITER $$

CREATE PROCEDURE handle_new_incident(
    IN location POINT, 
    IN severity_level VARCHAR(10),
    IN type VARCHAR(10),
    OUT available_vehicle_id INT
)
BEGIN
    DECLARE new_incident_id INT;

    INSERT INTO incident (location, severity_level, type) VALUES (location, severity_level, type);
    SET new_incident_id = LAST_INSERT_ID();

    START TRANSACTION;

    -- get nearest available vehicle with same type 
    SELECT v.vehicle_id INTO available_vehicle_id 
    FROM vehicle v
    JOIN station s ON s.station_id = v.station_id
    WHERE status = 'AVAILABLE' AND s.type = type 
    ORDER BY ST_Distance_Sphere(v.location, location) ASC
    LIMIT 1 FOR UPDATE SKIP LOCKED;
    

    IF available_vehicle_id IS NULL THEN
        ROLLBACK;
        INSERT INTO admin_notification (title, body) 
        VALUES ('No available vehicles',
        CONCAT('No available' , type, ' vehicles for incident ', new_incident_id,' with severity level ', severity_level));
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No available vehicle found';
    END IF;

    UPDATE vehicle 
    SET status = 'PENDING' 
    WHERE vehicle_id = available_vehicle_id;
    
    INSERT INTO dispatch (vehicle_id, incident_id)
    VALUES (available_vehicle_id, new_incident_id);
    
    COMMIT;
END $$


CREATE PROCEDURE modify_dispatch(
    IN dispatch_id INT,
    IN new_vehicle_id INT,
    IN dispatcher_id INT,
    OUT is_modified BOOLEAN
)
BEGIN
    DECLARE new_vehicle_status VARCHAR(10);
    DECLARE old_dispatcher_id INT;

    START TRANSACTION;

    SELECT dispatcher_id INTO old_dispatcher_id 
    FROM dispatch 
    WHERE dispatch.dispatch_id = dispatch_id
    FOR UPDATE;

    IF old_dispatcher_id IS NOT NULL THEN
        ROLLBACK;
        SET is_modified = FALSE;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'The incident is already dispatched by another dispatcher';
    END IF;

    SELECT status INTO new_vehicle_status 
    FROM vehicle     
    WHERE vehicle_id = new_vehicle_id
    FOR UPDATE;
    
    IF new_vehicle_status != 'AVAILABLE' THEN 
        ROLLBACK;
        SET is_modified = FALSE;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'The target vehicle is not available';
    END IF;

    UPDATE dispatch 
    SET dispatch.dispatcher_id = dispatcher_id,
    dispatch.vehicle_id = new_vehicle_id
    WHERE dispatch.dispatch_id = dispatch_id;

    SET is_modified = TRUE;

    COMMIT;
END $$



CREATE PROCEDURE resolve_incident(
    IN incident_id INT 
)
BEGIN   
    -- Update incident status and time resolved
    UPDATE incident 
    SET incident.status = 'RESOLVED', 
    incident.time_resolved = CURRENT_TIMESTAMP
    WHERE incident.incident_id = incident_id;

    -- Update vehicles status
    UPDATE vehicle SET status = 'AVAILABLE' WHERE vehicle_id IN(
        SELECT dispatch.vehicle_id FROM dispatch WHERE dispatch.incident_id = incident_id
    );
END $$



DELIMITER ;