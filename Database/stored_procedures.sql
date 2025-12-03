

CREATE PROCEDURE handle_new_incident(
    IN inc_location POINT, 
    IN inc_severity_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    IN inc_type ENUM('FIRE', 'POLICE', 'MEDICAL'),
    OUT available_vehicle_id INT
)
BEGIN
    DECLARE new_incident_id INT;

    INSERT INTO incident (location, severity_level, type) VALUES (inc_location, inc_severity_level, inc_type);
    SET new_incident_id = LAST_INSERT_ID();

    START TRANSACTION;

    -- get nearest available vehicle with same type 
    SELECT v.vehicle_id INTO available_vehicle_id 
    FROM vehicle v
    JOIN station s ON s.station_id = v.station_id
    WHERE status = 'AVAILABLE' AND s.type = inc_type 
    ORDER BY ST_Distance_Sphere(v.location, inc_location) ASC
    LIMIT 1 FOR UPDATE SKIP LOCKED;
    

    IF available_vehicle_id IS NULL THEN
        ROLLBACK;
        INSERT INTO admin_notification (title, body) 
        VALUES ('No available vehicles',
        CONCAT('No available ' , inc_type, ' vehicles for incident ', new_incident_id,' with severity level ', inc_severity_level));
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No available vehicle found';
    END IF;

    UPDATE vehicle 
    SET status = 'PENDING' 
    WHERE vehicle_id = available_vehicle_id;
    
    INSERT INTO dispatch (vehicle_id, incident_id)
    VALUES (available_vehicle_id, new_incident_id);
    
    COMMIT;
END ;


CREATE PROCEDURE handle_new_incident(
    IN inc_location POINT, 
    IN inc_severity_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    IN inc_type ENUM('FIRE', 'POLICE', 'MEDICAL'),
    OUT available_vehicle_id INT
)
BEGIN
    DECLARE new_incident_id INT;

    INSERT INTO incident (location, severity_level, type) VALUES (inc_location, inc_severity_level, inc_type);
    SET new_incident_id = LAST_INSERT_ID();

    START TRANSACTION;

    -- get nearest available vehicle with same type 
    SELECT v.vehicle_id INTO available_vehicle_id 
    FROM vehicle v
    JOIN station s ON s.station_id = v.station_id
    WHERE status = 'AVAILABLE' AND s.type = inc_type 
    ORDER BY ST_Distance_Sphere(v.location, inc_location) ASC
    LIMIT 1 FOR UPDATE SKIP LOCKED;
    

    IF available_vehicle_id IS NULL THEN
        ROLLBACK;
        INSERT INTO admin_notification (title, body) 
        VALUES ('No available vehicles',
        CONCAT('No available ' , inc_type, ' vehicles for incident ', new_incident_id,' with severity level ', inc_severity_level));
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No available vehicle found';
    END IF;

    UPDATE vehicle 
    SET status = 'PENDING' 
    WHERE vehicle_id = available_vehicle_id;
    
    INSERT INTO dispatch (vehicle_id, incident_id)
    VALUES (available_vehicle_id, new_incident_id);
    
    COMMIT;
END ;


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
END ;



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
END ;





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
END ;



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
END ;



CREATE PROCEDURE reassign_incident_vehicle(
    IN p_incident_id INT,
    IN p_new_vehicle_id INT,
    IN p_dispatcher_id INT
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_old_vehicle_id INT;

    START TRANSACTION;

    -- Lock incident
    SELECT status INTO v_status
    FROM incident
    WHERE incident_id = p_incident_id
    FOR UPDATE;

    IF v_status = 'RESOLVED' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot reassign a resolved incident';
    END IF;

    -- Lock new vehicle and check availability
    SELECT status INTO v_status
    FROM vehicle
    WHERE vehicle_id = p_new_vehicle_id
    FOR UPDATE;

    IF v_status != 'AVAILABLE' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'New vehicle is not available';
    END IF;

    -- Find old vehicle assigned to the incident
    SELECT vehicle_id INTO v_old_vehicle_id
    FROM dispatch
    WHERE incident_id = p_incident_id
    LIMIT 1;

    -- If an old assignment exists → remove it
    IF v_old_vehicle_id IS NOT NULL THEN
        
        -- Free old vehicle
        UPDATE vehicle SET status = 'AVAILABLE'
        WHERE vehicle_id = v_old_vehicle_id;

        -- Delete old dispatch
        DELETE FROM dispatch
        WHERE incident_id = p_incident_id;
    END IF;

    -- Insert new dispatch
    INSERT INTO dispatch (vehicle_id, incident_id, dispatcher_id)
    VALUES (p_new_vehicle_id, p_incident_id, p_dispatcher_id);

    -- Set new vehicle to PENDING
    UPDATE vehicle SET status = 'PENDING'
    WHERE vehicle_id = p_new_vehicle_id;

    -- Mark incident as ASSIGNED
    UPDATE incident SET status = 'ASSIGNED'
    WHERE incident_id = p_incident_id;

    COMMIT;
END;



CREATE PROCEDURE assign_responder_to_vehicle(
    IN p_responder_id INT,
    IN p_new_vehicle_id INT
)
BEGIN
    -- Declare variables for error handling
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- Rollback transaction on error
        ROLLBACK;
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Error: Failed to assign responder to vehicle';
    END;
    
    -- Start transaction
    START TRANSACTION;
    
    -- Delete old vehicle assignment if exists
    DELETE FROM responder_vehicle
    WHERE responder_id = p_responder_id;

    DELETE FROM responder_vehicle
    WHERE vehicle_id = p_new_vehicle_id;
    
    -- Insert new vehicle assignment
    INSERT INTO responder_vehicle (vehicle_id, responder_id)
    VALUES (p_new_vehicle_id, p_responder_id);
    
    -- Commit transaction
    COMMIT;
    
END ;