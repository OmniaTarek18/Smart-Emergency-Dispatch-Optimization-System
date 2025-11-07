from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
import json

# Create your views here.
@csrf_exempt
def hello_world(request):
    return JsonResponse({'message': 'Hello, world!'})



@csrf_exempt
def run_query(request):
    """
    View to run arbitrary SQL queries sent via POST request.
    this is for testing purposes only and should not be used in production without proper security measures.
    """
    if request.method == 'POST':
        try:
            # Get query from request
            if request.content_type == 'application/json':
                data = json.loads(request.body)
                query = data.get('query', '')
            else:
                query = request.POST.get('query', '')
            
            if not query:
                return JsonResponse({'error': 'No query provided'}, status=400)
            
            with connection.cursor() as cursor:
                cursor.execute(query)
                
                # Handle SELECT queries (that return data)
                if query.strip().upper().startswith('SELECT'):
                    rows = cursor.fetchall()
                    # Get column names
                    columns = [col[0] for col in cursor.description] if cursor.description else []
                    
                    # Convert rows to list of dictionaries
                    result_data = []
                    for row in rows:
                        row_dict = {}
                        for i, value in enumerate(row):
                            row_dict[columns[i]] = str(value) if value is not None else None
                        result_data.append(row_dict)
                    
                    result = {
                        'success': True,
                        'query': query,
                        'columns': columns,
                        'data': result_data,
                        'row_count': len(rows),
                        'message': f'Query returned {len(rows)} rows'
                    }
                else:
                    # Handle INSERT, UPDATE, DELETE queries
                    result = {
                        'success': True,
                        'query': query,
                        'row_count': cursor.rowcount,
                        'message': f'Query executed successfully. {cursor.rowcount} rows affected.'
                    }

            return JsonResponse({'result': result})
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e),
                'query': query if 'query' in locals() else 'Unknown'
            }, status=500)
            
    else:
        return JsonResponse({'error': 'Invalid request method. Use POST.'}, status=400)
