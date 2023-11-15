import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

document.addEventListener('DOMContentLoaded', function () {
    
    let cities = [];


    // Initialize scene, camera, renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 60);
    camera.position.set(8, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const container = document.getElementById('globe-container');
    container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);

    // Initialize world
    const worldTexture = new THREE.TextureLoader().load("static/mapproject/small-world.jpg");
    const worldGeometry = new THREE.SphereGeometry(1, 40, 40);
    const worldMaterial = new THREE.MeshBasicMaterial({
    map: worldTexture
    });
    const world = new THREE.Mesh(worldGeometry, worldMaterial);
    scene.add(world);

    // Raycasting and Mouse utilities
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    const clickStart = new THREE.Vector2();
    const clickEnd = new THREE.Vector2();

    renderer.domElement.style.zIndex = "-1";

    // Event Listeners
    renderer.domElement.addEventListener('mousedown', (event) => {
        isDragging = false;
        clickStart.set(event.clientX, event.clientY);
    }, false);

    renderer.domElement.addEventListener('mousemove', () => {
        isDragging = true;
    }, false);

    renderer.domElement.addEventListener('mouseup', (event) => {
        clickEnd.set(event.clientX, event.clientY);

        if (!isDragging || clickStart.distanceTo(clickEnd) < 5) {
            setMouseForRaycaster(event);
            checkIntersection();
        }
    }, false);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Functions
    function setMouseForRaycaster(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }

    function getLatLngFromVector(point) {
        // Longitude: arctan2 of the y and x coordinates
        const lng = Math.atan2(point.y, point.x) * (180 / Math.PI);
        
        // Latitude: arcsin of the z coordinate
        const lat = Math.asin(point.z) * (180 / Math.PI);
        
        return {
            lat: lat,
            lng: lng
        };
    }

    //let point1 = {
    // lat:43.6532,
    // lng:-79.3832
    //}

    ///let pos = calcPosFromLatLongRad(point1.lat, point1.lng);

    function haversineDistance(coords1, coords2) {
        const R = 6371; // Earth's radius in km
        const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
        const dLng = (coords2.lng - coords1.lng) * Math.PI / 180;

        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Returns distance in km
    }

    function findClosestCity(antipode) {
        let closestCity = null;
        let shortestDistance = Infinity;

        cities.forEach(city => {
            const distance = haversineDistance(antipode, city);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                closestCity = city;
            }
        });
        console.log(closestCity)
        return closestCity;
    }

    const csvFileURL = "static/mapproject/worldcities.csv";
    Papa.parse(csvFileURL, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            cities = results.data;
            // Call the function to ask for user location and plot it
            //document.getElementById('findAntipode').addEventListener('click', function() {
              //  askForUserLocationAndPlot();
            //});
        }
    });

    /*function askForUserLocationAndPlot() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                // Plot the user's location on the globe
                const userPos = calcPosFromLatLongRad(userLat, userLng);
                plotPointOnGlobe(userPos);

                const antipode = {lat: -userLat, lng: (userLng > 0 ? userLng - 180 : userLng + 180)};
                const nearestCity = findClosestCity(antipode);

                if (nearestCity) {
                    const cityPos = calcPosFromLatLongRad(nearestCity.lat, nearestCity.lng);
                    // Plot the antipodal point on the globe
                    plotPointOnGlobe(cityPos);
                }

                // Animate the camera to focus on the user's location
                animateCameraToLocation(userLat, userLng, () => {
                    // After that animation completes, animate to the antipodal point
                    animateCameraToLocation(antipode.lat, antipode.lng);
                });

            }, (error) => {
                console.error("Error obtaining location: ", error);
            });
        } else {
            console.log("Geolocation is not supported by this browser.");
        }
    }*/


    const CAMERA_ORBIT_RADIUS = 8;  // This is the distance from the globe's center

    function animateCameraToLocation(lat, lng, callback) {
        const position = calcPosFromLatLongRad(lat, lng);
        const targetPosition = new THREE.Vector3(position.x, position.y, position.z).multiplyScalar(CAMERA_ORBIT_RADIUS);
        const startPosition = camera.position.clone();
        const duration = 2000;  // 2 seconds
        const startTime = Date.now();

        function animate() {
            const elapsed = Date.now() - startTime;
            const t = Math.min(1, elapsed / duration);
            camera.position.lerpVectors(startPosition, targetPosition, t);
            controls.update();  // Important to ensure the camera's rotation is also updated

            if (t < 1) {
                requestAnimationFrame(animate);
            } else if (callback) {
                callback();
            }
        }

        animate();
    }

    function createCurveBetweenPoints(point1, point2, divisions = 50) {
        const curve = new THREE.CatmullRomCurve3([point1, point2], false, 'chordal');
        const points = curve.getPoints(divisions);
        return new THREE.BufferGeometry().setFromPoints(points);
    }

    function addLineToScene(point1, point2, color = 0xff0000) {
        const geometry = createCurveBetweenPoints(point1, point2);
        const material = new THREE.LineBasicMaterial({color: color});
        const line = new THREE.Line(geometry, material);
        scene.add(line);
    }

    function calcPosFromLatLongRad(lat, lng){
        var phi = (90-lat) *(Math.PI/180);
        var theta = (lng+180)*(Math.PI/180);
        let x = -(Math.sin(phi)*Math.cos(theta));
        let z = (Math.sin(phi)*Math.sin(theta));
        let y = (Math.cos(phi));
        return {x,y,z};
    }

    function plotPointOnGlobe(position, label) {
        // Existing code to plot the point
        const geometry = new THREE.SphereGeometry(0.01, 32, 32); 
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(position.x, position.y, position.z);
        scene.add(sphere);
    
        // Create a label
        const labelSprite = createTextLabel(label, position);
        scene.add(labelSprite);
    }

    // Call the function to ask for user location and plot it
    //askForUserLocationAndPlot();

    //plotPointOnGlobe(pos);

    function createTextLabel(text, position) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
    
        context.font = 'Bold 20px Arial'; // You can adjust the font size and style as needed
        context.fillStyle = 'rgba(0, 0, 0, 1)'; // Change text color to black
        context.fillText(text, 50, 50); // The position where the text is drawn on the canvas
    
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
    
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(position);
        sprite.scale.set(0.5, 0.25, 1); // You can adjust the scale as needed
    
        return sprite;
    }



    function calcLatLongFromPos(x, y, z) {
        const phi = Math.acos(y);
        const theta = Math.atan2(z, x);
        
        const lat = 90 - (phi * (180 / Math.PI));
        const lng = theta * (180 / Math.PI) - 180;
        
        return { lat, lng };
    }

    renderer.domElement.addEventListener('mouseup', (event) => {
        clickEnd.set(event.clientX, event.clientY);

        if (!isDragging || clickStart.distanceTo(clickEnd) < 5) {
            setMouseForRaycaster(event);
            checkIntersection();
        }
    }, false);

    function checkIntersection() {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(world);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            
            const coords = calcLatLongFromPos(point.x, point.y, point.z);
            console.log(`Latitude: ${coords.lat.toFixed(2)}, Longitude: ${coords.lng.toFixed(2)}`);

            const antipodalPoint = getAntipodalVector(point);
            addLineToScene(point, antipodalPoint);
        }
    }
    
    function getAntipodalVector(point) {
        return new THREE.Vector3(-point.x, -point.y, -point.z);
    }

    document.querySelector('.form-inline').addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent the default form submission
    
        const formData = new FormData(event.target);
        const searchQuery = formData.get('citysearch');
        
        fetch('/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({ search: searchQuery })
        })
        .then(response => response.json())
        .then(data => {
            const latitude = data.latitude;
            const longitude = data.longitude;
            plotLocationAndAntipode(latitude, longitude);
    
            // Use the latitude and longitude data to update the globe
            //const userPos = calcPosFromLatLongRad(latitude, longitude);
            //plotPointOnGlobe(userPos, searchQuery); // Pass the search query as the label
            
            // Optionally animate the camera to the new location
           // animateCameraToLocation(latitude, longitude);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
    });
    
    // Function to get CSRF token
    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    function plotLocationAndAntipode(latitude, longitude) {
        // Plot the user's location on the globe
        const userPos = calcPosFromLatLongRad(latitude, longitude);
        plotPointOnGlobe(userPos, 'Your Location');
    
        // Calculate the antipodal point
        const antipode = {lat: -latitude, lng: (longitude > 0 ? longitude - 180 : longitude + 180)};
        const antipodePos = calcPosFromLatLongRad(antipode.lat, antipode.lng);
    
        // Find the closest city to the antipodal point
        const nearestCity = findClosestCity(antipode);
        if (nearestCity) {
            const cityPos = calcPosFromLatLongRad(nearestCity.lat, nearestCity.lng);
            plotPointOnGlobe(cityPos, nearestCity.city); // Assuming 'name' is a property of the city object
        }
    
        // Animate the camera to focus on the user's location
        animateCameraToLocation(latitude, longitude, () => {
            // After that animation completes, animate to the antipodal point
            animateCameraToLocation(antipode.lat, antipode.lng);
        });
    }

    //const equatorGeometry = new THREE.CircleGeometry(1, 64); // Assuming globe radius is 1
    //const equatorMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red color for the equator
    //const equator = new THREE.LineLoop(equatorGeometry, equatorMaterial);
    //scene.add(equator);

    //const meridianGeometry = new THREE.CircleGeometry(1, 64); // Assuming globe radius is 1
    //const meridianMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue color for the prime meridian
    //const meridian = new THREE.LineLoop(meridianGeometry, meridianMaterial);
    //meridian.rotation.x = Math.PI / 2; // Rotate 90 degrees to align with the YZ plane
    //scene.add(meridian);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        //world.rotation.y += 0.0005;
        renderer.render(scene, camera);
    }

    scene.position.y = 0;
    animate();

  });