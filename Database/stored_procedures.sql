DELIMITER $$

DROP PROCEDURE IF EXISTS handle_new_incident$$
CREATE PROCEDURE handle_new_incident(
    IN inc_location POINT, 
    IN inc_severity_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    IN inc_type ENUM('FIRE', 'POLICE', 'MEDICAL'),
    OUT available_vehicle_id INT
)
BEGIN
    DECLARE new_incident_id INT;

    START TRANSACTION;

    INSERT INTO incident (location, severity_level, type)
    VALUES (inc_location, inc_severity_level, inc_type);

    SET new_incident_id = LAST_INSERT_ID();

    SELECT v.vehicle_id
    INTO available_vehicle_id 
    FROM vehicle v
    JOIN station s ON s.station_id = v.station_id
    WHERE v.status = 'AVAILABLE'
      AND s.type = inc_type
    ORDER BY ST_Distance_Sphere(v.location, inc_location)
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF available_vehicle_id IS NULL THEN
        -- ROLLBACK;

        INSERT INTO admin_notification (title, body) 
        VALUES (
            'No available vehicles',
            CONCAT(
                'No available ', inc_type,
                ' vehicles for incident ', new_incident_id,
                ' with severity level ', inc_severity_level
            )
        );

		COMMIT;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No available vehicle found';
    END IF;

    UPDATE vehicle 
    SET status = 'PENDING' 
    WHERE vehicle_id = available_vehicle_id;

    INSERT INTO dispatch (vehicle_id, incident_id)
    VALUES (available_vehicle_id, new_incident_id);

    COMMIT;
END$$


DROP PROCEDURE IF EXISTS modify_dispatch$$
CREATE PROCEDURE modify_dispatch(
    IN p_dispatch_id INT,
    IN p_new_vehicle_id INT,
    IN p_dispatcher_id INT,
    OUT is_modified BOOLEAN
)
BEGIN
    DECLARE new_vehicle_status VARCHAR(10);
    DECLARE old_dispatcher_id INT;

    START TRANSACTION;

    SELECT dispatcher_id
    INTO old_dispatcher_id 
    FROM dispatch 
    WHERE dispatch_id = p_dispatch_id
    FOR UPDATE;

    IF old_dispatcher_id IS NOT NULL THEN
        ROLLBACK;
        SET is_modified = FALSE;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The incident is already dispatched by another dispatcher';
    END IF;

    SELECT status
    INTO new_vehicle_status 
    FROM vehicle     
    WHERE vehicle_id = p_new_vehicle_id
    FOR UPDATE;

    IF new_vehicle_status <> 'AVAILABLE' THEN 
        ROLLBACK;
        SET is_modified = FALSE;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The target vehicle is not available';
    END IF;

    UPDATE dispatch 
    SET dispatcher_id = p_dispatcher_id,
        vehicle_id = p_new_vehicle_id
    WHERE dispatch_id = p_dispatch_id;

    SET is_modified = TRUE;

    COMMIT;
END$$


DROP PROCEDURE IF EXISTS resolve_incident$$
CREATE PROCEDURE resolve_incident(
    IN p_incident_id INT 
)
BEGIN   
    UPDATE incident 
    SET status = 'RESOLVED', 
        time_resolved = CURRENT_TIMESTAMP
    WHERE incident_id = p_incident_id;

    UPDATE vehicle
    SET status = 'AVAILABLE'
    WHERE vehicle_id IN (
        SELECT d.vehicle_id
        FROM dispatch d
        WHERE d.incident_id = p_incident_id
    );
END$$

DROP PROCEDURE IF EXISTS reassign_incident_vehicle$$
CREATE PROCEDURE reassign_incident_vehicle(
    IN p_incident_id INT,
    IN p_new_vehicle_id INT,
    IN p_dispatcher_id INT
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_old_vehicle_id INT;

    START TRANSACTION;

    SELECT status
    INTO v_status
    FROM incident
    WHERE incident_id = p_incident_id
    FOR UPDATE;

    IF v_status = 'RESOLVED' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot reassign a resolved incident';
    END IF;

    SELECT status
    INTO v_status
    FROM vehicle
    WHERE vehicle_id = p_new_vehicle_id
    FOR UPDATE;

    IF v_status <> 'AVAILABLE' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'New vehicle is not available';
    END IF;

    SELECT vehicle_id
    INTO v_old_vehicle_id
    FROM dispatch
    WHERE incident_id = p_incident_id
    LIMIT 1;

    IF v_old_vehicle_id IS NOT NULL THEN
        UPDATE vehicle
        SET status = 'AVAILABLE'
        WHERE vehicle_id = v_old_vehicle_id;

        DELETE FROM dispatch
        WHERE incident_id = p_incident_id;
    END IF;

    INSERT INTO dispatch (vehicle_id, incident_id, dispatcher_id)
    VALUES (p_new_vehicle_id, p_incident_id, p_dispatcher_id);

    UPDATE vehicle
    SET status = 'PENDING'
    WHERE vehicle_id = p_new_vehicle_id;

    UPDATE incident
    SET status = 'ASSIGNED'
    WHERE incident_id = p_incident_id;

    COMMIT;
END$$

DROP PROCEDURE IF EXISTS assign_responder_to_vehicle$$
CREATE PROCEDURE assign_responder_to_vehicle(
    IN p_responder_id INT,
    IN p_new_vehicle_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error: Failed to assign responder to vehicle';
    END;

    START TRANSACTION;

    DELETE FROM responder_vehicle
    WHERE responder_id = p_responder_id;

    DELETE FROM responder_vehicle
    WHERE vehicle_id = p_new_vehicle_id;

    INSERT INTO responder_vehicle (vehicle_id, responder_id)
    VALUES (p_new_vehicle_id, p_responder_id);

    COMMIT;
END$$

DELIMITER ;
