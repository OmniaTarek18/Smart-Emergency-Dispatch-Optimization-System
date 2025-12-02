from django.db import connection
from datetime import datetime


def update_user_password(user_id, new_hashed_password):
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE user SET password = %s WHERE user_id = %s",
                [new_hashed_password, user_id],
            )
            if cursor.rowcount == 0:
                raise Exception("User not found")
    except Exception:
        raise


def get_user_by_user_id(user_id):
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM user WHERE user_id = %s",
                [user_id],
            )
            row = cursor.fetchone()
            user = zip_user(row, cursor.description)
            if user is None:
                raise Exception("user is not found")
            return user
    except Exception:
        raise


def get_user_by_email(email):
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM user WHERE email = %s",
                [email],
            )
            row = cursor.fetchone()
            user = zip_user(row, cursor.description)
            if user is None:
                raise Exception("user is not found")
            return user
    except Exception:
        raise

    # ============= INCIDENT MANAGEMENT =============

def create_incident(incident_type, location_lat, location_lng, severity, description=None):
    """Create a new incident and automatically assign nearest vehicle"""
    try:
        with connection.cursor() as cursor:
            # Call stored procedure to handle incident creation and auto-assignment
            cursor.callproc('handle_new_incident', [
                f'POINT({location_lng} {location_lat})',  # Note: POINT(lng, lat) in MySQL
                severity,
                incident_type,
                0  # OUT parameter placeholder
            ])
            
            # Fetch the result (assigned vehicle_id)
            cursor.execute("SELECT @_handle_new_incident_3")
            result = cursor.fetchone()
            vehicle_id = result[0] if result else None
            
            # Get the created incident
            cursor.execute("""
                SELECT i.incident_id, i.time_reported, 
                       ST_X(i.location) as lng, ST_Y(i.location) as lat,
                       i.type, i.status, i.severity_level,
                       d.vehicle_id, v.status as vehicle_status,
                       s.zone as station_zone
                FROM incident i
                LEFT JOIN dispatch d ON i.incident_id = d.incident_id
                LEFT JOIN vehicle v ON d.vehicle_id = v.vehicle_id
                LEFT JOIN station s ON v.station_id = s.station_id
                ORDER BY i.incident_id DESC
                LIMIT 1
            """)
            
            row = cursor.fetchone()
            return zip_incident(row, cursor.description)
            
    except Exception as e:
        raise Exception(f"Failed to create incident: {str(e)}")


def get_all_incidents(status=None):
    """Get all incidents, optionally filtered by status"""
    try:
        with connection.cursor() as cursor:
            if status:
                cursor.execute("""
                    SELECT i.incident_id, i.time_reported, i.time_resolved,
                           ST_X(i.location) as lng, ST_Y(i.location) as lat,
                           i.type, i.status, i.severity_level,
                           GROUP_CONCAT(DISTINCT v.vehicle_id) as vehicle_ids,
                           GROUP_CONCAT(DISTINCT s.zone) as station_zones,
                           TIMESTAMPDIFF(MINUTE, i.time_reported, 
                                        COALESCE(i.time_resolved, NOW())) as response_time
                    FROM incident i
                    LEFT JOIN dispatch d ON i.incident_id = d.incident_id
                    LEFT JOIN vehicle v ON d.vehicle_id = v.vehicle_id
                    LEFT JOIN station s ON v.station_id = s.station_id
                    WHERE i.status = %s
                    GROUP BY i.incident_id
                    ORDER BY 
                        FIELD(i.severity_level, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
                        i.time_reported DESC
                """, [status])
            else:
                cursor.execute("""
                    SELECT i.incident_id, i.time_reported, i.time_resolved,
                           ST_X(i.location) as lng, ST_Y(i.location) as lat,
                           i.type, i.status, i.severity_level,
                           GROUP_CONCAT(DISTINCT v.vehicle_id) as vehicle_ids,
                           GROUP_CONCAT(DISTINCT s.zone) as station_zones,
                           TIMESTAMPDIFF(MINUTE, i.time_reported, 
                                        COALESCE(i.time_resolved, NOW())) as response_time
                    FROM incident i
                    LEFT JOIN dispatch d ON i.incident_id = d.incident_id
                    LEFT JOIN vehicle v ON d.vehicle_id = v.vehicle_id
                    LEFT JOIN station s ON v.station_id = s.station_id
                    GROUP BY i.incident_id
                    ORDER BY 
                        FIELD(i.severity_level, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
                        i.time_reported DESC
                """)
            
            rows = cursor.fetchall()
            return [zip_incident(row, cursor.description) for row in rows]
    except Exception as e:
        raise Exception(f"Failed to fetch incidents: {str(e)}")


def get_incident_by_id(incident_id):
    """Get incident by ID with all related details"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT i.incident_id, i.time_reported, i.time_resolved,
                       ST_X(i.location) as lng, ST_Y(i.location) as lat,
                       i.type, i.status, i.severity_level,
                       GROUP_CONCAT(DISTINCT v.vehicle_id) as vehicle_ids,
                       GROUP_CONCAT(DISTINCT s.zone) as station_zones,
                       TIMESTAMPDIFF(MINUTE, i.time_reported, 
                                    COALESCE(i.time_resolved, NOW())) as response_time
                FROM incident i
                LEFT JOIN dispatch d ON i.incident_id = d.incident_id
                LEFT JOIN vehicle v ON d.vehicle_id = v.vehicle_id
                LEFT JOIN station s ON v.station_id = s.station_id
                WHERE i.incident_id = %s
                GROUP BY i.incident_id
            """, [incident_id])
            
            row = cursor.fetchone()
            if not row:
                raise Exception("Incident not found")
            return zip_incident(row, cursor.description)
    except Exception as e:
        raise Exception(f"Failed to fetch incident: {str(e)}")


def resolve_incident(incident_id):
    """Resolve incident using stored procedure"""
    try:
        with connection.cursor() as cursor:
            cursor.callproc('resolve_incident', [incident_id])
            return get_incident_by_id(incident_id)
    except Exception as e:
        raise Exception(f"Failed to resolve incident: {str(e)}")


# ============= VEHICLE MANAGEMENT =============

def get_all_vehicles(status=None):
    """Get all vehicles with their station info"""
    try:
        with connection.cursor() as cursor:
            if status:
                cursor.execute("""
                    SELECT v.vehicle_id, v.status, 
                           ST_X(v.location) as lng, ST_Y(v.location) as lat,
                           v.capacity, v.station_id,
                           s.type as vehicle_type, s.zone,
                           COUNT(rv.responder_id) as responder_count
                    FROM vehicle v
                    JOIN station s ON v.station_id = s.station_id
                    LEFT JOIN responder_vehicle rv ON v.vehicle_id = rv.vehicle_id
                    WHERE v.status = %s
                    GROUP BY v.vehicle_id
                    ORDER BY v.vehicle_id
                """, [status])
            else:
                cursor.execute("""
                    SELECT v.vehicle_id, v.status, 
                           ST_X(v.location) as lng, ST_Y(v.location) as lat,
                           v.capacity, v.station_id,
                           s.type as vehicle_type, s.zone,
                           COUNT(rv.responder_id) as responder_count
                    FROM vehicle v
                    JOIN station s ON v.station_id = s.station_id
                    LEFT JOIN responder_vehicle rv ON v.vehicle_id = rv.vehicle_id
                    GROUP BY v.vehicle_id
                    ORDER BY v.vehicle_id
                """)
            
            rows = cursor.fetchall()
            return [zip_vehicle(row, cursor.description) for row in rows]
    except Exception as e:
        raise Exception(f"Failed to fetch vehicles: {str(e)}")


def get_vehicle_by_id(vehicle_id):
    """Get vehicle by ID"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT v.vehicle_id, v.status, 
                       ST_X(v.location) as lng, ST_Y(v.location) as lat,
                       v.capacity, v.station_id,
                       s.type as vehicle_type, s.zone,
                       COUNT(rv.responder_id) as responder_count
                FROM vehicle v
                JOIN station s ON v.station_id = s.station_id
                LEFT JOIN responder_vehicle rv ON v.vehicle_id = rv.vehicle_id
                WHERE v.vehicle_id = %s
                GROUP BY v.vehicle_id
            """, [vehicle_id])
            
            row = cursor.fetchone()
            if not row:
                raise Exception("Vehicle not found")
            return zip_vehicle(row, cursor.description)
    except Exception as e:
        raise Exception(f"Failed to fetch vehicle: {str(e)}")


def update_vehicle_location(vehicle_id, lat, lng):
    """Update vehicle location"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE vehicle 
                SET location = ST_GeomFromText(%s, 4326)
                WHERE vehicle_id = %s
            """, [f'POINT({lng} {lat})', vehicle_id])
            
            if cursor.rowcount == 0:
                raise Exception("Vehicle not found")
            
            return get_vehicle_by_id(vehicle_id)
    except Exception as e:
        raise Exception(f"Failed to update vehicle location: {str(e)}")


def create_vehicle(station_id, capacity, lat, lng):
    """Create new vehicle"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO vehicle (location, capacity, station_id, status)
                VALUES (ST_GeomFromText(%s, 4326), %s, %s, 'AVAILABLE')
            """, [f'POINT({lng} {lat})', capacity, station_id])
            
            vehicle_id = cursor.lastrowid
            return get_vehicle_by_id(vehicle_id)
    except Exception as e:
        raise Exception(f"Failed to create vehicle: {str(e)}")


def delete_vehicle(vehicle_id):
    """Delete vehicle (will cascade to responder_vehicle and dispatch)"""
    try:
        with connection.cursor() as cursor:
            # Check if vehicle has active dispatches
            cursor.execute("""
                SELECT COUNT(*) FROM dispatch d
                JOIN incident i ON d.incident_id = i.incident_id
                WHERE d.vehicle_id = %s AND i.status != 'RESOLVED'
            """, [vehicle_id])
            
            count = cursor.fetchone()[0]
            if count > 0:
                raise Exception("Cannot delete vehicle with active assignments")
            
            cursor.execute("DELETE FROM vehicle WHERE vehicle_id = %s", [vehicle_id])
            
            if cursor.rowcount == 0:
                raise Exception("Vehicle not found")
            
            return True
    except Exception as e:
        raise Exception(f"Failed to delete vehicle: {str(e)}")


# ============= DISPATCH MANAGEMENT =============

def modify_dispatch(dispatch_id, new_vehicle_id, dispatcher_id):
    """Modify dispatch using stored procedure"""
    try:
        with connection.cursor() as cursor:
            cursor.callproc('modify_dispatch', [
                dispatch_id,
                new_vehicle_id,
                dispatcher_id,
                0  # OUT parameter placeholder
            ])
            
            # Fetch result
            cursor.execute("SELECT @_modify_dispatch_3")
            result = cursor.fetchone()
            is_modified = result[0] if result else False
            
            if not is_modified:
                raise Exception("Failed to modify dispatch")
            
            # Get incident info
            cursor.execute("""
                SELECT incident_id FROM dispatch WHERE dispatch_id = %s
            """, [dispatch_id])
            
            row = cursor.fetchone()
            if row:
                return get_incident_by_id(row[0])
            
            return None
    except Exception as e:
        raise Exception(f"Failed to modify dispatch: {str(e)}")


def get_dispatch_by_incident(incident_id):
    """Get dispatch info for an incident"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT d.dispatch_id, d.vehicle_id, d.incident_id, d.dispatcher_id,
                       u.name as dispatcher_name
                FROM dispatch d
                LEFT JOIN user u ON d.dispatcher_id = u.user_id
                WHERE d.incident_id = %s
            """, [incident_id])
            
            rows = cursor.fetchall()
            return [zip_dispatch(row, cursor.description) for row in rows]
    except Exception as e:
        raise Exception(f"Failed to fetch dispatch: {str(e)}")


# ============= STATION MANAGEMENT =============

def get_all_stations():
    """Get all stations"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT station_id, type, zone,
                       ST_X(location) as lng, ST_Y(location) as lat,
                       (SELECT COUNT(*) FROM vehicle v WHERE v.station_id = s.station_id) as vehicle_count
                FROM station s
                ORDER BY zone, type
            """)
            
            rows = cursor.fetchall()
            return [zip_station(row, cursor.description) for row in rows]
    except Exception as e:
        raise Exception(f"Failed to fetch stations: {str(e)}")


def create_station(station_type, zone, lat, lng):
    """Create new station"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO station (type, zone, location)
                VALUES (%s, %s, ST_GeomFromText(%s, 4326))
            """, [station_type, zone, f'POINT({lng} {lat})'])
            
            station_id = cursor.lastrowid
            
            cursor.execute("""
                SELECT station_id, type, zone,
                       ST_X(location) as lng, ST_Y(location) as lat
                FROM station WHERE station_id = %s
            """, [station_id])
            
            row = cursor.fetchone()
            return zip_station(row, cursor.description)
    except Exception as e:
        raise Exception(f"Failed to create station: {str(e)}")


# ============= USER MANAGEMENT =============

def create_admin_user(email, password_hash, name, role='ADMIN'):
    """Create admin/dispatcher user"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO user (email, password, name, role)
                VALUES (%s, %s, %s, %s)
            """, [email, password_hash, name, role])
            
            user_id = cursor.lastrowid
            return get_user_by_user_id(user_id)
    except Exception as e:
        raise Exception(f"Failed to create user: {str(e)}")


def get_all_admin_users():
    """Get all admin and dispatcher users"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT user_id, email, name, role
                FROM user
                WHERE role IN ('ADMIN', 'DISPATCHER')
                ORDER BY role, name
            """)
            
            rows = cursor.fetchall()
            return [zip_user(row, cursor.description) for row in rows]
    except Exception as e:
        raise Exception(f"Failed to fetch admin users: {str(e)}")


# ============= HELPER FUNCTIONS =============

def zip_incident(row, description):
    if row is None:
        return None
    columns = [col[0] for col in description]
    return dict(zip(columns, row))


def zip_vehicle(row, description):
    if row is None:
        return None
    columns = [col[0] for col in description]
    return dict(zip(columns, row))


def zip_dispatch(row, description):
    if row is None:
        return None
    columns = [col[0] for col in description]
    return dict(zip(columns, row))


def zip_station(row, description):
    if row is None:
        return None
    columns = [col[0] for col in description]
    return dict(zip(columns, row))

def zip_user(row, description):
    if row is None:
        return None
    columns = [col[0] for col in description]
    user = dict(zip(columns, row))
    return user