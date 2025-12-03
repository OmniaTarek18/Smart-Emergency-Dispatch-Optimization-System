# app/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.hello_world, name='home'),  # example homepage
    # path('run-query/', views.run_query, name='run_query'),
    path('login/', views.login),
    path('check-old-password/', views.check_old_password),
    path('change-password/', views.change_password),
    path('refresh-token/', views.refresh_token),

     # Reporter APIs (Public)
    path('incidents/report/', views.report_incident, name='report_incident'),
    
    # Responder APIs
    path('vehicles/location/', views.update_unit_location, name='update_vehicle_location'),
    path('incidents/resolve/', views.resolve_incident_endpoint, name='resolve_incident'),
    
    # Admin/Dispatcher - Incident Management
    path('admin/incidents/', views.list_incidents, name='list_incidents'),
    path('admin/incidents/dispatch/', views.dispatch_incident, name='dispatch_incident'),
    path('admin/incidents/dispatches/get-dispatch', views.get_incident_dispatches, name='get_incident_dispatches'),
    
    # Admin/Dispatcher - Vehicle Management
    path('admin/vehicles/', views.list_vehicles, name='list_vehicles'),
    path('admin/vehicles/create/', views.create_vehicle_endpoint, name='create_vehicle'),
    path('admin/vehicles/delete/', views.delete_vehicle_endpoint, name='delete_vehicle'),
    
    # Admin/Dispatcher - Station Management
    path('admin/stations/', views.list_stations, name='list_stations'),
    path('admin/stations/create/', views.create_station_endpoint, name='create_station'),
    
    # Admin - User Management
    path('admin/users/', views.list_admins, name='list_admins'),
    path('admin/users/create/', views.create_admin_endpoint, name='create_admin'),

    path('admin/analytics/', views.get_analytics, name='get_average_response_time'),

    path("accept-incident/", views.pendingToOnRoute, name="7amada"),

    path("admin/assign-vechile-to-rsponder/", views.ass_responder_to_vehicle, name="assign_to_responder")
]
