from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse, FileResponse
from .models import Search
from .forms import SearchForm
import folium
import geocoder
import os
import json  # Needed to parse JSON data in AJAX request
from django.conf import settings

def serve_csv_file(request):
    file_path = os.path.join(settings.BASE_DIR, 'static/mapproject/worldcities.csv')
    response = FileResponse(open(file_path, 'rb'), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="worldcities.csv"'
    return response

def get_lat_lng(request):
    address = Search.objects.all().last()
    location = geocoder.osm(address)
    lat = location.lat
    lng = location.lng

    if lat is None or lng is None:
        address.delete()
        return JsonResponse({'error': 'Invalid address input'})

    data = {
        'latitude': lat,
        'longitude': lng,
    }
    return JsonResponse(data)

def index(request):
    if request.method == 'POST' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        try:
            data = json.loads(request.body)
            search_query = data.get('search')
            
            if not search_query:
                return JsonResponse({'error': 'No search query provided'}, status=400)
                
            location = geocoder.osm(search_query)
            lat = location.lat
            lng = location.lng

            if lat is None or lng is None:
                return JsonResponse({'error': 'Invalid address input'}, status=400)

            return JsonResponse({'latitude': lat, 'longitude': lng})
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    if request.method == 'POST':
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            # Handle AJAX request
            data = json.loads(request.body)
            search_query = data.get('search')
            location = geocoder.osm(search_query)
            lat = location.lat
            lng = location.lng

            if lat is None or lng is None:
                return JsonResponse({'error': 'Invalid address input'}, status=400)

            return JsonResponse({'latitude': lat, 'longitude': lng})

        else:
            # Handle regular form submission
            form = SearchForm(request.POST)
            if form.is_valid():
                form.save()
                return redirect('/')

    else:
        form = SearchForm()

    address = Search.objects.all().last()
    location = geocoder.osm(address)
    lat = location.lat
    lng = location.lng
    country = location.country

    if lat is None or lng is None and address is not None:
        address.delete()
        return HttpResponse('Your address input is invalid')

    context = {
        "form": form,
    }
    return render(request, 'index.html', context)