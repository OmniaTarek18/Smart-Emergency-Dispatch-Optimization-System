# app/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.hello_world, name='home'),  # example homepage
    path('run-query/', views.run_query, name='run_query'),
]
