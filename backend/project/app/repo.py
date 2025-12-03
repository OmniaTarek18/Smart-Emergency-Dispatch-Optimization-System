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
    try:
        with connection.cursor() as cursor:
            
            # Call stored procedure with real geometry expression
            cursor.execute(
                """
                CALL handle_new_incident(
                    ST_GeomFromText(%s, 4326),
                    %s,
                    %s,
                    @vehicle_id
                )
                """,
                (f"POINT({location_lng} {location_lat})", severity, incident_type)
            )
            
            # Get OUT param
            cursor.execute("SELECT @vehicle_id")
            vehicle_id = cursor.fetchone()[0]

            # Get latest incident
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

def reassign_dispatch(incident_id, vehicle_id, dispatcher_id):
    """Assign vehicle to incident using stored procedure"""
    try:
        with connection.cursor() as cursor:
            cursor.callproc('reassign_incident_vehicle', [
                incident_id,
                vehicle_id,
                dispatcher_id,
              
            ])
            
            # Fetch result
            cursor.execute("SELECT @_reassign_incident_vehicle_3")
            result = cursor.fetchone()

            return get_incident_by_id(incident_id)
    except Exception as e:
        raise Exception(f"Failed to assign vehicle: {str(e)}")

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

def get_average_response_time():
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    AVG(TIMESTAMPDIFF(MINUTE, time_reported, time_resolved)) AS avg_response_time
                FROM incident
                WHERE status = 'RESOLVED'
            """)
            
            row = cursor.fetchone()
            
            return row[0] if row else None
    except Exception as e:
        raise Exception(f"Failed to fetch average response time: {str(e)}")
    

def get_max_response_time():
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    MAX(TIMESTAMPDIFF(MINUTE, time_reported, time_resolved)) AS avg_response_time
                FROM incident
                WHERE status = 'RESOLVED'
            """)
            
            row = cursor.fetchone()
            
            return row[0] if row else None
    except Exception as e:
        raise Exception(f"Failed to fetch average response time: {str(e)}")

def get_min_response_time():
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    MIN(TIMESTAMPDIFF(MINUTE, time_reported, time_resolved)) AS avg_response_time
                FROM incident
                WHERE status = 'RESOLVED'
            """)
            
            row = cursor.fetchone()
            
            return row[0] if row else None
    except Exception as e:
        raise Exception(f"Failed to fetch average response time: {str(e)}")

def get_best_station():
    try:
        with connection.cursor() as crs:
            crs.execute("""
                        SELECT 
                            s.station_id,
                            s.type AS station_type,
                            AVG(TIMESTAMPDIFF(SECOND, i.time_reported, i.time_resolved)) AS avg_response_time_seconds,
                            COUNT(DISTINCT i.incident_id) AS total_incidents_resolved
                        FROM station s
                        INNER JOIN vehicle v ON s.station_id = v.station_id
                        INNER JOIN dispatch d ON v.vehicle_id = d.vehicle_id
                        INNER JOIN incident i ON d.incident_id = i.incident_id
                        WHERE i.time_resolved IS NOT NULL
                        GROUP BY s.station_id, s.type, s.zone
                        ORDER BY avg_response_time_seconds ASC
                        LIMIT 1;
                        """)
            row = crs.fetchone()
            if row:
                res ={
                    "station_id" : row[0],
                    "station_type": row[1],
                    "average_response_time": row[2],
                    "resolved_count" : row[3]
                }
                return res
            return row if row else None
    except Exception as e:
            raise Exception(f"Failed to fetch average response time: {str(e)}")


def get_worst_station():
    try:
        with connection.cursor() as crs:
            crs.execute("""
                        SELECT 
                            s.station_id,
                            s.type AS station_type,
                            AVG(TIMESTAMPDIFF(SECOND, i.time_reported, i.time_resolved)) AS avg_response_time_seconds,
                            COUNT(DISTINCT i.incident_id) AS total_incidents_resolved
                        FROM station s
                        INNER JOIN vehicle v ON s.station_id = v.station_id
                        INNER JOIN dispatch d ON v.vehicle_id = d.vehicle_id
                        INNER JOIN incident i ON d.incident_id = i.incident_id
                        WHERE i.time_resolved IS NOT NULL
                        GROUP BY s.station_id, s.type, s.zone
                        ORDER BY avg_response_time_seconds DESC
                        LIMIT 1;
                        """)
            row = crs.fetchone()
            if row:
                res ={
                    "station_id" : row[0],
                    "station_type": row[1],
                    "average_response_time": row[2],
                    "resolved_count" : row[3]
                }
                return res
            return row if row else None
    except Exception as e:
            raise Exception(f"Failed to fetch average response time: {str(e)}")


def get_best_responder():
    """
    Get the responder with minimum average response time
    
    Args:
        connection: Active database connection
        
    Returns:
        dict: Responder details with response time metrics, or None if no data
        
    Raises:
        Exception: If database query fails
    """
    try:
        with connection.cursor() as crs:
            crs.execute("""
                SELECT 
                    u.user_id AS responder_id,
                    u.name AS responder_name,
                    u.email,
                    AVG(TIMESTAMPDIFF(SECOND, i.time_reported, i.time_resolved)) AS avg_response_time_seconds,
                    COUNT(DISTINCT i.incident_id) AS total_incidents_resolved
                FROM user u
                INNER JOIN responder_vehicle rv ON u.user_id = rv.responder_id
                INNER JOIN vehicle v ON rv.vehicle_id = v.vehicle_id
                INNER JOIN dispatch d ON v.vehicle_id = d.vehicle_id
                INNER JOIN incident i ON d.incident_id = i.incident_id
                WHERE u.role = 'RESPONDER'
                AND i.time_resolved IS NOT NULL
                GROUP BY u.user_id, u.name, u.email
                ORDER BY avg_response_time_seconds ASC
                LIMIT 1
            """)
            
            row = crs.fetchone()
            
            if row:
                return {
                    'responder_id': row[0],
                    'responder_name': row[1],
                    'email': row[2],
                    'avg_response_time_minutes': round(float(row[3]) / 60, 2),
                    'total_incidents_resolved': row[4]
                }
            return None
            
    except Exception as e:
        raise Exception(f"Failed to fetch best responder: {str(e)}")


def get_worst_responder():
    """
    Get the responder with minimum average response time
    
    Args:
        connection: Active database connection
        
    Returns:
        dict: Responder details with response time metrics, or None if no data
        
    Raises:
        Exception: If database query fails
    """
    try:
        with connection.cursor() as crs:
            crs.execute("""
                SELECT 
                    u.user_id AS responder_id,
                    u.name AS responder_name,
                    u.email,
                    AVG(TIMESTAMPDIFF(SECOND, i.time_reported, i.time_resolved)) AS avg_response_time_seconds,
                    COUNT(DISTINCT i.incident_id) AS total_incidents_resolved
                FROM user u
                INNER JOIN responder_vehicle rv ON u.user_id = rv.responder_id
                INNER JOIN vehicle v ON rv.vehicle_id = v.vehicle_id
                INNER JOIN dispatch d ON v.vehicle_id = d.vehicle_id
                INNER JOIN incident i ON d.incident_id = i.incident_id
                WHERE u.role = 'RESPONDER'
                AND i.time_resolved IS NOT NULL
                GROUP BY u.user_id, u.name, u.email
                ORDER BY avg_response_time_seconds DESC
                LIMIT 1
            """)
            
            row = crs.fetchone()
            
            if row:
                return {
                    'responder_id': row[0],
                    'responder_name': row[1],
                    'email': row[2],
                    'avg_response_time_seconds': float(row[3]),
                    'avg_response_time_minutes': round(float(row[3]) / 60, 2),
                    'total_incidents_resolved': row[4]
                }
            return None
            
    except Exception as e:
        raise Exception(f"Failed to fetch best responder: {str(e)}")


def get_incidents_by_type_detailed():
    """
    Get detailed statistics of incidents for each type including all statuses
    
    Args:
        connection: Active database connection
        
    Returns:
        list: List of dictionaries with comprehensive incident statistics
        
    Raises:
        Exception: If database query fails
    """
    try:
        with connection.cursor() as crs:
            crs.execute("""
                SELECT 
                    type,
                    COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) AS resolved_count,
                    COUNT(CASE WHEN status = 'ASSIGNED' THEN 1 END) AS assigned_count,
                    COUNT(CASE WHEN status = 'REPORTED' THEN 1 END) AS reported_count,
                    COUNT(*) AS total_count,
                    COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) * 100.0 / COUNT(*) AS resolution_rate_percentage,
                    AVG(CASE WHEN status = 'RESOLVED' THEN TIMESTAMPDIFF(SECOND, time_reported, time_resolved) END) AS avg_resolution_time_seconds
                FROM incident
                GROUP BY type
                ORDER BY resolved_count DESC
            """)
            
            rows = crs.fetchall()
            
            results = []
            for row in rows:
                avg_time = float(row[6]) if row[6] else 0
                results.append({
                    'type': row[0],
                    'resolved_count': row[1],
                    'assigned_count': row[2],
                    'reported_count': row[3],
                    'total_count': row[4],
                    'resolution_rate_percentage': round(float(row[5]), 2),
                    'avg_resolution_time_seconds': round(avg_time, 2),
                    'avg_resolution_time_minutes': round(avg_time / 60, 2)
                })
            
            return results
            
    except Exception as e:
        raise Exception(f"Failed to fetch incidents by type: {str(e)}")
    

def get_vehicle_count_by_type():
    """
    Get the count of vehicles for each station type
    
    Args:
        connection: Active database connection
        
    Returns:
        list: List of dictionaries with station type and vehicle count
        
    Raises:
        Exception: If database query fails
    """
    try:
        with connection.cursor() as crs:
            crs.execute("""
                SELECT 
                    s.type AS station_type,
                    COUNT(v.vehicle_id) AS vehicle_count
                FROM station s
                LEFT JOIN vehicle v ON s.station_id = v.station_id
                GROUP BY s.type
                ORDER BY vehicle_count DESC
            """)
            
            rows = crs.fetchall()
            
            results = []
            for row in rows:
                results.append({
                    'station_type': row[0],
                    'vehicle_count': row[1]
                })
            
            return results
            
    except Exception as e:
        raise Exception(f"Failed to fetch vehicle count by type: {str(e)}")


def assign_responder_to_vehicle (responder_id, new_vehicle_id):
    """
    Assign a responder to a new vehicle and remove old assignment
    
    Args:
        connection: Active database connection
        responder_id: ID of the responder
        new_vehicle_id: ID of the new vehicle to assign
        
    Returns:
        bool: True if assignment successful
        
    Raises:
        Exception: If assignment fails
    """
    try:
        with connection.cursor() as crs:
            crs.callproc('assign_responder_to_vehicle', 
                        [responder_id, new_vehicle_id])
            connection.commit()
            return True
            
    except Exception as e:
        connection.rollback()
        raise Exception(f"Failed to assign responder to vehicle: {str(e)}")



def update_vehicles_to_on_route_by_incident(vehicle_id):
    """
    Update all PENDING vehicles for an incident to ON_ROUTE
    
    Args:
        connection: Active database connection
        incident_id: ID of the incident
        
    Returns:
        int: Number of vehicles updated
    """
    try:
        with connection.cursor() as crs:
            crs.execute("""
                UPDATE vehicle v
                SET v.status = 'ON_ROUTE'
                WHERE  v.vehicle_id= %s
                AND v.status = 'PENDING'
            """, (vehicle_id,))
            
            connection.commit()
            return crs.rowcount
            
    except Exception as e:
        connection.rollback()
        raise Exception(f"Failed to update vehicles: {str(e)}")


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