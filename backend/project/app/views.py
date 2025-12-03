from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
from .hasher import hash_password, check_password
from .jwt_utils import generate_access_token, generate_refresh_token, refresh_access_token
from .auth import auth_user 
from .repo import *
import json


# Create your views here.
@csrf_exempt
def hello_world(request):
    return JsonResponse({"message": "Hello, world!"})


@csrf_exempt
def run_query(request):
    """
    View to run arbitrary SQL queries sent via POST request.
    this is for testing purposes only and should not be used in production without proper security measures.
    """
    if request.method == "POST":
        try:
            # Get query from request
            if request.content_type == "application/json":
                data = json.loads(request.body)
                query = data.get("query", "")
            else:
                query = request.POST.get("query", "")

            if not query:
                return JsonResponse({"error": "No query provided"}, status=400)

            with connection.cursor() as cursor:
                cursor.execute(query)

                # Handle SELECT queries (that return data)
                if query.strip().upper().startswith("SELECT"):
                    rows = cursor.fetchall()
                    # Get column names
                    columns = (
                        [col[0] for col in cursor.description]
                        if cursor.description
                        else []
                    )

                    # Convert rows to list of dictionaries
                    result_data = []
                    for row in rows:
                        row_dict = {}
                        for i, value in enumerate(row):
                            row_dict[columns[i]] = (
                                str(value) if value is not None else None
                            )
                        result_data.append(row_dict)

                    result = {
                        "success": True,
                        "query": query,
                        "columns": columns,
                        "data": result_data,
                        "row_count": len(rows),
                        "message": f"Query returned {len(rows)} rows",
                    }
                else:
                    # Handle INSERT, UPDATE, DELETE queries
                    result = {
                        "success": True,
                        "query": query,
                        "row_count": cursor.rowcount,
                        "message": f"Query executed successfully. {cursor.rowcount} rows affected.",
                    }

            return JsonResponse({"result": result})

        except Exception as e:
            return JsonResponse(
                {
                    "success": False,
                    "error": str(e),
                    "query": query if "query" in locals() else "Unknown",
                },
                status=500,
            )

    else:
        return JsonResponse({"error": "Invalid request method. Use POST."}, status=400)

@csrf_exempt
def login(request):
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)})

    data = json.loads(request.body)
    email = data.get("email")
    password = data.get("password")
    user = None
    try:
        user = get_user_by_email(email)
    except Exception as e:
        return JsonResponse({"message": f"Invalid user + {str(e)}"}, status=400)
    print
    # password is not correct
    if not check_password(password, user["password"]):
        return JsonResponse({"message": "Invalid password"}, status=400)

    access_token = generate_access_token(user)
    refresh_token = generate_refresh_token(user)

    user.pop("password")
    return JsonResponse(
        {
            "message": "Login successful",
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
        },
        status=200,
    )

@csrf_exempt
@auth_user
def check_old_password(request):
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)})

    user_id = request.user_id
    data = json.loads(request.body)
    old_password = data.get("old_password")
    user = None
    try:
        user = get_user_by_user_id(user_id)
    except Exception as e:
        return JsonResponse({"message": f"Invalid user + {str(e)}"}, status=400)
    
    if not check_password(old_password, user["password"]):
        return JsonResponse({"message": "Invalid old password"}, status=400)

    return JsonResponse({"message": "Old password is correct"}, status=200)

@csrf_exempt
@auth_user
def change_password(request):
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)})

    user_id = request.user_id
    data = json.loads(request.body)
    new_password = data.get("new_password")
    new_hashed_password = hash_password(new_password)
    
    try:
        update_user_password(user_id, new_hashed_password)
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)
    return JsonResponse({"message": "Password changed successfully"})

@csrf_exempt
def refresh_token(request):
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    data = json.loads(request.body)
    refresh_token = data.get("refresh")

    try:
        new_access_token = refresh_access_token(refresh_token)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=500)
    return JsonResponse({"access_token": new_access_token}, status=200)


def check_request_method(request, method):
    if request.method != method:
        return f"Invalid request method. Use {method}."
    return None


@csrf_exempt
def report_incident(request):
    """Reporter API: Report new incident (auto-assigns vehicle via stored procedure)"""
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ['type', 'lat', 'lng', 'severity_level']
        for field in required_fields:
            if field not in data:
                return JsonResponse({"message": f"Missing required field: {field}"}, status=400)
        
        # Validate type
        valid_types = ['FIRE', 'POLICE', 'MEDICAL']
        if data['type'].upper() not in valid_types:
            return JsonResponse({"message": "Invalid type. Must be FIRE, POLICE, or MEDICAL"}, status=400)
        
        # Validate severity
        valid_severity = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        if data['severity_level'].upper() not in valid_severity:
            return JsonResponse({"message": "Invalid severity_level"}, status=400)
        
        incident = create_incident(
            incident_type=data['type'].upper(),
            location_lat=data['lat'],
            location_lng=data['lng'],
            severity=data['severity_level'].upper(),
            description=data.get('description', '')
        )
        
        return JsonResponse({
            "message": "Incident reported and vehicle auto-assigned successfully",
            "incident": incident
        }, status=201)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)


# ============= RESPONDER APIS =============

@csrf_exempt
def update_unit_location(request):
    """Responder API: Update vehicle location"""
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        data = json.loads(request.body)
        
        required_fields = ['vehicle_id', 'lat', 'lng']
        for field in required_fields:
            if field not in data:
                return JsonResponse({"message": f"Missing required field: {field}"}, status=400)
        
        vehicle = update_vehicle_location(
            vehicle_id=data['vehicle_id'],
            lat=data['lat'],
            lng=data['lng']
        )
        
        return JsonResponse({
            "message": "Location updated successfully",
            "vehicle": vehicle
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)


@csrf_exempt
def resolve_incident_endpoint(request):
    """Responder API: Resolve incident (uses stored procedure)"""
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        data = json.loads(request.body)
        
        if 'incident_id' not in data:
            return JsonResponse({"message": "Missing incident_id"}, status=400)
        
        incident = resolve_incident(data['incident_id'])
        
        return JsonResponse({
            "message": "Incident resolved successfully",
            "incident": incident
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)


# ============= ADMIN/DISPATCHER APIS =============

@csrf_exempt
@auth_user
def list_incidents(request):
    """Admin/Dispatcher API: List all incidents"""
    err = check_request_method(request, "GET")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        user = get_user_by_user_id(request.user_id)
        if user['role'] not in ['ADMIN', 'DISPATCHER']:
            return JsonResponse({"message": "Unauthorized"}, status=403)
        
        status = request.GET.get('status', None)
        if status:
            status = status.upper()
        
        incidents = get_all_incidents(status)
        
        return JsonResponse({
            "incidents": incidents,
            "count": len(incidents)
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)

@csrf_exempt
@auth_user
def dispatch_incident(request):
    """Admin/Dispatcher API: Modify vehicle assignment for incident"""
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        user = get_user_by_user_id(request.user_id)
        if user['role'] not in ['ADMIN', 'DISPATCHER']:
            return JsonResponse({"message": "Unauthorized"}, status=403)
        
        data = json.loads(request.body)
        
        required_fields = ['incident_id', 'new_vehicle_id']
        for field in required_fields:
            if field not in data:
                return JsonResponse({"message": f"Missing required field: {field}"}, status=400)
        
        # Use stored procedure to modify dispatch
        incident = reassign_dispatch(
            incident_id=data['incident_id'],
            vehicle_id=data['new_vehicle_id'],
            dispatcher_id=request.user_id
        )
        
        return JsonResponse({
            "message": "Dispatch modified successfully",
            "incident": incident
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)


@csrf_exempt
@auth_user
def get_incident_dispatches(request):
    """Get dispatch information for an incident"""
    err = check_request_method(request, "GET")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        user = get_user_by_user_id(request.user_id)
        if user['role'] not in ['ADMIN', 'DISPATCHER']:
            return JsonResponse({"message": "Unauthorized"}, status=403)
        
        data = json.loads(request.body)
        incident_id = data.get('incident_id', None)
        
        dispatches = get_dispatch_by_incident(incident_id)
        
        return JsonResponse({
            "dispatches": dispatches
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)


# ============= VEHICLE MANAGEMENT =============

@csrf_exempt
@auth_user
def list_vehicles(request):
    """Admin/Dispatcher API: List all vehicles"""
    err = check_request_method(request, "GET")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        user = get_user_by_user_id(request.user_id)
        if user['role'] not in ['ADMIN', 'DISPATCHER']:
            return JsonResponse({"message": "Unauthorized"}, status=403)
        
        status = request.GET.get('status', None)
        if status:
            status = status.upper()
        
        vehicles = get_all_vehicles(status)
        
        return JsonResponse({
            "vehicles": vehicles,
            "count": len(vehicles)
        }, status=200)
       
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)


@csrf_exempt
@auth_user
def create_vehicle_endpoint(request):
    """Admin API: Create new vehicle"""
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        user = get_user_by_user_id(request.user_id)
        if user['role'] != 'ADMIN':
            return JsonResponse({"message": "Unauthorized - Admin only"}, status=403)
        
        data = json.loads(request.body)
        
        required_fields = ['station_id', 'capacity', 'lat', 'lng']
        for field in required_fields:
            if field not in data:
                return JsonResponse({"message": f"Missing required field: {field}"}, status=400)
        
        vehicle = create_vehicle(
            station_id=data['station_id'],
            capacity=data['capacity'],
            lat=data['lat'],
            lng=data['lng']
        )
        
        return JsonResponse({
            "message": "Vehicle created successfully",
            "vehicle": vehicle
        }, status=201)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)


@csrf_exempt
@auth_user
def delete_vehicle_endpoint(request):
    """Admin API: Delete vehicle"""
    err = check_request_method(request, "DELETE")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        user = get_user_by_user_id(request.user_id)
        if user['role'] != 'ADMIN':
            return JsonResponse({"message": "Unauthorized - Admin only"}, status=403)
        data = json.loads(request.body)

        vehicle_id = data.get('vehicle_id', None)
        if vehicle_id is None:
            return JsonResponse({"message": "Missing vehicle_id"}, status=400)
        
        delete_vehicle(vehicle_id)
        
        return JsonResponse({
            "message": "Vehicle deleted successfully"
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)


# ============= STATION MANAGEMENT =============

@csrf_exempt
@auth_user
def list_stations(request):
    """Admin/Dispatcher API: List all stations"""
    err = check_request_method(request, "GET")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        user = get_user_by_user_id(request.user_id)
        if user['role'] not in ['ADMIN', 'DISPATCHER']:
            return JsonResponse({"message": "Unauthorized"}, status=403)
        
        stations = get_all_stations()
        
        return JsonResponse({
            "stations": stations,
            "count": len(stations)
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)


@csrf_exempt
@auth_user
def create_station_endpoint(request):
    """Admin API: Create new station"""
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        user = get_user_by_user_id(request.user_id)
        if user['role'] != 'ADMIN':
            return JsonResponse({"message": "Unauthorized - Admin only"}, status=403)
        
        data = json.loads(request.body)
        
        required_fields = ['type', 'zone', 'lat', 'lng']
        for field in required_fields:
            if field not in data:
                return JsonResponse({"message": f"Missing required field: {field}"}, status=400)
        
        valid_types = ['FIRE', 'POLICE', 'MEDICAL']
        if data['type'].upper() not in valid_types:
            return JsonResponse({"message": "Invalid type"}, status=400)
        
        station = create_station(
            station_type=data['type'].upper(),
            zone=data['zone'],
            lat=data['lat'],
            lng=data['lng']
        )
        
        return JsonResponse({
            "message": "Station created successfully",
            "station": station
        }, status=201)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)


# ============= USER MANAGEMENT =============

@csrf_exempt
@auth_user
def list_admins(request):
    """Admin API: List all admin/dispatcher users"""
    err = check_request_method(request, "GET")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        user = get_user_by_user_id(request.user_id)
        if user['role'] != 'ADMIN':
            return JsonResponse({"message": "Unauthorized - Admin only"}, status=403)
        
        admins = get_all_admin_users()
        
        return JsonResponse({
            "admins": admins,
            "count": len(admins)
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)


@csrf_exempt
@auth_user
def create_admin_endpoint(request):
    """Admin API: Create new admin/dispatcher user"""
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        user = get_user_by_user_id(request.user_id)
        if user['role'] != 'ADMIN':
            return JsonResponse({"message": "Unauthorized - Admin only"}, status=403)
        
        data = json.loads(request.body)
        
        required_fields = ['email', 'password', 'name']
        for field in required_fields:
            if field not in data:
                return JsonResponse({"message": f"Missing required field: {field}"}, status=400)
        
        role = data.get('role', 'DISPATCHER').upper()
        if role not in ['ADMIN', 'DISPATCHER' , 'RESPONDER']:
            return JsonResponse({"message": "Invalid role. Must be ADMIN or DISPATCHER or RESPONDER"}, status=400)
        
        password_hash = hash_password(data['password'])
        
        admin = create_admin_user(
            email=data['email'],
            password_hash=password_hash,
            name=data['name'],
            role=role
        )
        
        admin.pop('password', None)
        
        return JsonResponse({
            "message": "User created successfully",
            "admin": admin
        }, status=201)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)


def get_analytics(request):
    """Get system analytics - placeholder"""
    err = check_request_method(request, "GET")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        # Placeholder analytics data
        analytics = {}
        analytics["average_response_time"] = get_average_response_time()
        analytics["max_response_time"] = get_max_response_time()
        analytics["min_response_time"] = get_min_response_time()
        analytics["best_responder"] = ""
        analytics["worst_responder"] = ""
        analytics["best_station"] = get_best_station()
        analytics["worst_station"] = get_worst_station()
        analytics["total_incidents_type"] = ""
        analytics["resolved_incidents_type"] = ""
        analytics["active_vehicles_type"] = ""
        analytics["response_time_type"] = ""

        
        return JsonResponse({
            "analytics": analytics
        }, status=200)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)

@csrf_exempt
@auth_user
def pendingToOnRoute(request):
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        user = get_user_by_user_id(request.user_id)
        if user['role'] != 'ADMIN' and user['role'] != "RESPONDER":
            return JsonResponse({"message": "Unauthorized - Admin only"}, status=403)
        
        data = json.loads(request.body)
        if not data["vehicle_id"]:
            return JsonResponse({"message": "please entre incident_id"},status=400)
        update_vehicles_to_on_route_by_incident(data["vehicle_id"])
        get_incident_by_id(data["vehicle_id"])
        return JsonResponse(
            get_vehicle_by_id(data["incident_id"]), status=200
        )
    
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)

@csrf_exempt
@auth_user
def ass_responder_to_vehicle(request):
    err = check_request_method(request, "POST")
    if err:
        return JsonResponse({"message": str(err)}, status=400)

    try:
        user = get_user_by_user_id(request.user_id)
        if user['role'] != 'ADMIN':
            return JsonResponse({"message": "Unauthorized - Admin only"}, status=403)
        
        data = json.loads(request.body)
        assign_responder_to_vehicle(data["responder_id"], data["vehicle_id"])
        usr = get_user_by_user_id(data["responder_id"])
        vechile = get_vehicle_by_id(data["vehicle_id"])
        return JsonResponse({
            "user": usr,
            "vechile": vechile
        },status=200)
        
    except Exception as e:
        return JsonResponse({"message": str(e)}, status=500)



