// Global variables
let map;
let trackingEnabled = false;
let currentRoute = [];
let routePolyline;
let startTime;
let timerInterval;
let watchId;

// Initialize the map and UI
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    initializeControls();
    initializeShareModal();
});

// Initialize Leaflet map
function initializeMap() {
    map = L.map('map').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Try to get user's location for initial map position
    navigator.geolocation.getCurrentPosition(
        position => {
            map.setView([position.coords.latitude, position.coords.longitude], 13);
        },
        error => {
            showToast('Unable to get your location. Please enable location services.');
        }
    );
}

// Initialize button controls
function initializeControls() {
    const startButton = document.getElementById('startRide');
    const stopButton = document.getElementById('stopRide');
    const resetButton = document.getElementById('resetRide');
    const shareButton = document.getElementById('shareRide');

    startButton.addEventListener('click', startRide);
    stopButton.addEventListener('click', stopRide);
    resetButton.addEventListener('click', resetRide);
    shareButton.addEventListener('click', showShareModal);
}

// Initialize share modal
function initializeShareModal() {
    const modal = document.getElementById('shareModal');
    const closeButton = document.getElementById('closeModal');
    const copyButton = document.getElementById('copyLink');

    closeButton.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    copyButton.addEventListener('click', copyRideSummary);
}

// Start tracking the ride
function startRide() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser');
        return;
    }

    trackingEnabled = true;
    startTime = new Date();
    currentRoute = [];
    
    // Update UI
    document.getElementById('startRide').disabled = true;
    document.getElementById('stopRide').disabled = false;
    document.getElementById('resetRide').disabled = true;
    document.getElementById('shareRide').disabled = true;

    // Clear existing route if any
    if (routePolyline) {
        map.removeLayer(routePolyline);
    }
    routePolyline = L.polyline([], { color: 'blue' }).addTo(map);

    // Start tracking location
    watchId = navigator.geolocation.watchPosition(
        updatePosition,
        error => {
            showToast('Error tracking location: ' + error.message);
            stopRide();
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );

    // Start timer
    startTimer();
}

// Update position and route
function updatePosition(position) {
    const newPosition = [position.coords.latitude, position.coords.longitude];
    currentRoute.push(newPosition);
    
    // Update polyline
    routePolyline.setLatLngs(currentRoute);
    
    // Center map on current position
    map.setView(newPosition);
    
    // Update statistics
    updateStatistics();
}

// Stop tracking the ride
function stopRide() {
    trackingEnabled = false;
    clearInterval(timerInterval);
    
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }

    // Update UI
    document.getElementById('startRide').disabled = false;
    document.getElementById('stopRide').disabled = true;
    document.getElementById('resetRide').disabled = false;
    document.getElementById('shareRide').disabled = false;

    // Final statistics update
    updateStatistics();
}

// Reset the ride
function resetRide() {
    currentRoute = [];
    if (routePolyline) {
        map.removeLayer(routePolyline);
    }
    
    // Reset statistics
    document.getElementById('duration').textContent = '00:00:00';
    document.getElementById('distance').textContent = '0.00 km';
    document.getElementById('speed').textContent = '0.0 km/h';
    
    // Update UI
    document.getElementById('resetRide').disabled = true;
    document.getElementById('shareRide').disabled = true;
}

// Start the timer
function startTimer() {
    timerInterval = setInterval(() => {
        const duration = new Date() - startTime;
        document.getElementById('duration').textContent = formatDuration(duration);
    }, 1000);
}

// Update statistics
function updateStatistics() {
    if (currentRoute.length < 2) return;

    // Calculate total distance
    const distance = calculateTotalDistance();
    document.getElementById('distance').textContent = distance.toFixed(2) + ' km';

    // Calculate average speed
    const duration = (new Date() - startTime) / 1000 / 3600; // hours
    const speed = distance / duration;
    document.getElementById('speed').textContent = speed.toFixed(1) + ' km/h';
}

// Calculate total distance in kilometers
function calculateTotalDistance() {
    let total = 0;
    for (let i = 1; i < currentRoute.length; i++) {
        total += calculateDistance(currentRoute[i-1], currentRoute[i]);
    }
    return total;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const lat1 = point1[0] * Math.PI / 180;
    const lat2 = point2[0] * Math.PI / 180;
    const deltaLat = (point2[0] - point1[0]) * Math.PI / 180;
    const deltaLon = (point2[1] - point1[1]) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Format duration as HH:MM:SS
function formatDuration(duration) {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor(duration / (1000 * 60 * 60));

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Show share modal
function showShareModal() {
    const modal = document.getElementById('shareModal');
    const summary = document.getElementById('rideSummary');
    
    const distance = document.getElementById('distance').textContent;
    const duration = document.getElementById('duration').textContent;
    const speed = document.getElementById('speed').textContent;
    
    summary.textContent = `🐎 Horse Riding Summary:\n\nDistance: ${distance}\nDuration: ${duration}\nAverage Speed: ${speed}`;
    
    modal.classList.remove('hidden');
}

// Copy ride summary to clipboard
function copyRideSummary() {
    const summary = document.getElementById('rideSummary').textContent;
    
    navigator.clipboard.writeText(summary)
        .then(() => {
            showToast('Ride summary copied to clipboard!');
        })
        .catch(err => {
            showToast('Failed to copy ride summary');
        });
}

// Show toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show toast
    toast.style.display = 'block';
    
    // Hide and remove toast after 3 seconds
    setTimeout(() => {
        toast.style.display = 'none';
        document.body.removeChild(toast);
    }, 3000);
}
