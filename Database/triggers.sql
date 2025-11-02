DELIMITER $$

-- notify dispatcher after automatic vehicle assignment to new incident
CREATE TRIGGER notify_dispatchers_after_auto_assign
AFTER INSERT ON dispatch
FOR EACH ROW
BEGIN
    DECLARE new_notification_id INT;
    IF NEW.dispatcher_id IS NULL THEN

        -- Create a new notification for the incident
        INSERT INTO user_notification (incident_id, title)
        VALUES (NEW.incident_id, 'New Incident');

        -- Get the generated notification ID
        SET new_notification_id = LAST_INSERT_ID();

        -- Send this notification to all dispatchers
        INSERT INTO user_notification_status (user_notification_id, user_id)
        SELECT new_notification_id, user_id
        FROM user
        WHERE role = 'DISPATCHER';

    END IF;
END $$


-- notify responders after their vehicle assignment to new incident
CREATE TRIGGER notify_responders_after_new_assign
AFTER UPDATE ON dispatch
FOR EACH ROW
BEGIN
    DECLARE new_notification_id INT;
    IF OLD.dispatcher_id IS NULL AND NEW.dispatcher_id IS NOT NULL THEN

        -- Create a new notification for the incident
        INSERT INTO user_notification (incident_id, title)
        VALUES (NEW.incident_id, 'New assigned Incident');

        -- Get the generated notification ID
        SET new_notification_id = LAST_INSERT_ID();

        -- Send this notification to all responders
        INSERT INTO user_notification_status (user_notification_id, user_id)
        SELECT new_notification_id, responder_id
        FROM responder_vehicle WHERE vehicle_id = NEW.vehicle_id;

    END IF;
END $$


CREATE TRIGGER notify_admins
AFTER INSERT ON admin_notification
FOR EACH ROW
BEGIN 
    INSERT INTO admin_notification_status (admin_id, admin_notification_id)
    SELECT user_id, NEW.admin_notification_id 
    FROM user 
    WHERE role = 'ADMIN';
END$$


DELIMITER ;


