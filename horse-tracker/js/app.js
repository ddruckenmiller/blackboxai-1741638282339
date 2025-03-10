// Global variables
let map;
let trackingEnabled = false;
let currentRoute = [];
let routePolyline;
let startTime;
let timerInterval;
let watchId;
let isPaused = false;
let lastPosition = null;
let currentGait = "N/A";
let lastBearing = null;
let currentTurn = 0;

// Activity state variables
let dressageActive = false;
let dressageTimer = null;
let gameActive = false;
let gameTimer = null;
let competitionActive = false;
let competitionTimer = null;

// Dressage test configurations
const dressageTests = {
    'intro': {
        name: 'Introductory Level',
        instructions: [
            'Enter at A - Working Trot',
            'Track left at C',
            '20m circle at E',
            'Continue to A',
            'Medium walk at A',
            'Free walk at B',
            'Medium walk at M',
            'Working trot at C',
            'Track right at A',
            'Halt at X through medium walk'
        ]
    },
    'training': {
        name: 'Training Level',
        instructions: [
            'Enter at A - Working Trot',
            '20m circle at B',
            'Continue to K',
            'Working canter at K',
            '20m circle at A',
            'Working trot at E',
            'Medium walk at C',
            'Free walk at M',
            'Working trot at C',
            'Halt at X through medium walk'
        ]
    },
    'first': {
        name: 'First Level',
        instructions: [
            'Enter at A - Working Trot',
            'Shoulder-in right at C',
            'Half 10m circle at B',
            'Leg yield left to M',
            'Working canter at C',
            '15m circle at E',
            'Counter canter loop E-B-E',
            'Simple change at L',
            'Working trot at A',
            'Halt at X through medium walk'
        ]
    }
};

// Game configurations
const games = {
    'obstacles': {
        name: 'Obstacle Course',
        instructions: 'Navigate through virtual obstacles marked on the map. Points awarded for smooth transitions and accurate navigation.',
        setup: () => {
            // Add virtual obstacles to the map
            return L.layerGroup().addTo(map);
        }
    },
    'patterns': {
        name: 'Pattern Challenge',
        instructions: 'Follow the highlighted pattern on the map. Score based on accuracy and timing.',
        setup: () => {
            // Add pattern overlay to the map
            return L.layerGroup().addTo(map);
        }
    },
    'precision': {
        name: 'Precision Riding',
        instructions: 'Maintain specific gaits and execute precise turns at marked points. Score based on accuracy.',
        setup: () => {
            // Add precision markers to the map
            return L.layerGroup().addTo(map);
        }
    }
};

// Competition configurations
const competitions = {
    'speed': {
        name: 'Speed Trial',
        instructions: 'Complete the marked course in the fastest time while maintaining control.',
        setup: () => {
            // Add speed course markers to the map
            return L.layerGroup().addTo(map);
        }
    },
    'precision': {
        name: 'Precision Challenge',
        instructions: 'Execute a series of specific movements with maximum accuracy.',
        setup: () => {
            // Add precision challenge markers
            return L.layerGroup().addTo(map);
        }
    },
    'endurance': {
        name: 'Endurance Test',
        instructions: 'Maintain consistent gaits over a longer distance while managing energy.',
        setup: () => {
            // Add endurance course markers
            return L.layerGroup().addTo(map);
        }
    }
};

// Initialize the map and UI
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    initializeControls();
    initializeShareModal();
    initializeDressageModal();
    initializeGamesModal();
    initializeCompetitionModal();
    checkGPSStatus();
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
            updateGPSStatus('GPS Ready');
            lastPosition = position;
        },
        error => {
            showToast('Unable to get your location. Please enable location services.', 'error');
            updateGPSStatus('GPS Error');
        }
    );
}

// Check GPS Status
function checkGPSStatus() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            () => updateGPSStatus('GPS Ready'),
            () => updateGPSStatus('GPS Error')
        );
    } else {
        updateGPSStatus('GPS Not Supported');
    }
}

// Update GPS Status
function updateGPSStatus(status) {
    const statusElement = document.getElementById('gpsStatus');
    const statusMap = {
        'GPS Ready': { text: 'GPS Ready', class: 'text-green-600' },
        'GPS Error': { text: 'GPS Error', class: 'text-red-600' },
        'GPS Not Supported': { text: 'GPS Not Supported', class: 'text-yellow-600' },
        'Tracking': { text: 'Tracking Active', class: 'text-blue-600' }
    };

    const statusInfo = statusMap[status] || { text: status, class: 'text-gray-600' };
    statusElement.textContent = `GPS Status: ${statusInfo.text}`;
    statusElement.className = statusInfo.class;
}

// Initialize button controls
function initializeControls() {
    const startButton = document.getElementById('startRide');
    const stopButton = document.getElementById('stopRide');
    const pauseButton = document.getElementById('pauseRide');
    const resetButton = document.getElementById('resetRide');
    const shareButton = document.getElementById('shareRide');
    const dressageButton = document.getElementById('dressageTest');
    const gamesButton = document.getElementById('games');
    const competitionButton = document.getElementById('competition');

    startButton.addEventListener('click', startRide);
    stopButton.addEventListener('click', stopRide);
    pauseButton.addEventListener('click', togglePause);
    resetButton.addEventListener('click', resetRide);
    shareButton.addEventListener('click', showShareModal);
    dressageButton.addEventListener('click', () => {
        const modal = document.getElementById('dressageModal');
        modal.classList.remove('hidden');
        showToast('Dressage Test modal opened', 'info');
    });
    gamesButton.addEventListener('click', () => document.getElementById('gamesModal').classList.remove('hidden'));
    competitionButton.addEventListener('click', () => document.getElementById('competitionModal').classList.remove('hidden'));
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

// Initialize modals
function initializeDressageModal() {
    const modal = document.getElementById('dressageModal');
    const closeButton = document.getElementById('closeDressageModal');
    const startButton = document.getElementById('startDressage');
    const levelSelect = document.getElementById('dressageLevel');

    closeButton.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (dressageActive) endDressageTest();
    });

    levelSelect.addEventListener('change', () => {
        const level = levelSelect.value;
        if (level && dressageTests[level]) {
            const instructions = dressageTests[level].instructions.map((instr, i) => 
                `${i + 1}. ${instr}`
            ).join('\n');
            document.getElementById('dressageInstructions').textContent = instructions;
        }
    });

    startButton.addEventListener('click', startDressageTest);
}

function initializeGamesModal() {
    const modal = document.getElementById('gamesModal');
    const closeButton = document.getElementById('closeGamesModal');
    const startButton = document.getElementById('startGame');
    const gameSelect = document.getElementById('gameSelect');

    closeButton.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (gameActive) endGame();
    });

    gameSelect.addEventListener('change', () => {
        const game = gameSelect.value;
        if (game && games[game]) {
            document.getElementById('gameInstructions').textContent = games[game].instructions;
        }
    });

    startButton.addEventListener('click', startGame);
}

function initializeCompetitionModal() {
    const modal = document.getElementById('competitionModal');
    const closeButton = document.getElementById('closeCompetitionModal');
    const startButton = document.getElementById('startCompetition');
    const competitionSelect = document.getElementById('competitionType');

    closeButton.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (competitionActive) endCompetition();
    });

    competitionSelect.addEventListener('change', () => {
        const competition = competitionSelect.value;
        if (competition && competitions[competition]) {
            document.getElementById('competitionInstructions').textContent = 
                competitions[competition].instructions;
        }
    });

    startButton.addEventListener('click', startCompetition);
}

// Start tracking the ride
function startRide() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return;
    }

    const rideName = document.getElementById('rideName').value;
    const horseSelect = document.getElementById('horseSelect').value;

    if (!rideName || !horseSelect) {
        showToast('Please enter ride name and select a horse', 'warning');
        return;
    }

    trackingEnabled = true;
    isPaused = false;
    startTime = new Date();
    currentRoute = [];
    
    // Update UI
    updateButtonStates(true);
    updateGPSStatus('Tracking');

    // Clear existing route if any
    if (routePolyline) {
        map.removeLayer(routePolyline);
    }
    routePolyline = L.polyline([], { color: 'blue', weight: 3 }).addTo(map);

    // Start tracking location
    watchId = navigator.geolocation.watchPosition(
        updatePosition,
        error => {
            showToast('Error tracking location: ' + error.message, 'error');
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
    showToast('Ride tracking started', 'success');
}

// Toggle pause state
function togglePause() {
    isPaused = !isPaused;
    const pauseButton = document.getElementById('pauseRide');
    
    if (isPaused) {
        pauseButton.innerHTML = '<i class="fas fa-play mr-2"></i>Resume Ride';
        pauseButton.classList.replace('bg-yellow-600', 'bg-green-600');
        showToast('Ride paused', 'info');
    } else {
        pauseButton.innerHTML = '<i class="fas fa-pause mr-2"></i>Pause Ride';
        pauseButton.classList.replace('bg-green-600', 'bg-yellow-600');
        showToast('Ride resumed', 'info');
    }
}

// Calculate bearing between two points
function calculateBearing(point1, point2) {
    const lat1 = point1[0] * Math.PI / 180;
    const lat2 = point2[0] * Math.PI / 180;
    const lon1 = point1[1] * Math.PI / 180;
    const lon2 = point2[1] * Math.PI / 180;
    
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
             Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360; // Normalize to 0-360
    return bearing;
}

// Calculate turn angle between two bearings
function calculateTurnAngle(bearing1, bearing2) {
    let angle = Math.abs(bearing2 - bearing1);
    if (angle > 180) {
        angle = 360 - angle;
    }
    return angle;
}

// Determine gait based on speed
function determineGait(speedKmh) {
    if (speedKmh < 5) return "Walk";
    if (speedKmh < 15) return "Trot";
    return "Canter";
}

// Update position and route
function updatePosition(position) {
    if (isPaused) return;

    const newPosition = [position.coords.latitude, position.coords.longitude];
    currentRoute.push(newPosition);
    
    // Update polyline
    routePolyline.setLatLngs(currentRoute);
    
    // Center map on current position
    map.setView(newPosition);
    
    // Update current speed and gait
    if (position.coords.speed !== null) {
        const speedKmh = (position.coords.speed * 3.6).toFixed(1);
        document.getElementById('currentSpeed').textContent = `${speedKmh} km/h`;
        
        // Update gait
        currentGait = determineGait(parseFloat(speedKmh));
        document.getElementById('gait').textContent = currentGait;
    }

    // Update elevation
    if (position.coords.altitude !== null) {
        document.getElementById('elevation').textContent = `${Math.round(position.coords.altitude)} m`;
    }

    // Calculate and update turn angle
    if (lastPosition) {
        const currentBearing = calculateBearing([lastPosition.coords.latitude, lastPosition.coords.longitude], newPosition);
        
        if (lastBearing !== null) {
            currentTurn = calculateTurnAngle(lastBearing, currentBearing);
            document.getElementById('turn').textContent = `${Math.round(currentTurn)}°`;
        }
        
        lastBearing = currentBearing;
    }

    // Update statistics
    updateStatistics();
    lastPosition = position;

    // Update active features if any
    if (dressageActive) updateDressageTest();
    if (gameActive) updateGame();
    if (competitionActive) updateCompetition();
}

// Stop tracking the ride
function stopRide() {
    trackingEnabled = false;
    clearInterval(timerInterval);
    
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }

    // Update UI
    updateButtonStates(false);
    updateGPSStatus('GPS Ready');

    // Final statistics update
    updateStatistics();
    showToast('Ride completed', 'success');
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
    document.getElementById('currentSpeed').textContent = '0.0 km/h';
    document.getElementById('elevation').textContent = '0 m';
    
    // Reset form
    document.getElementById('rideName').value = '';
    document.getElementById('horseSelect').value = '';

    // Update UI
    updateButtonStates(false);
    showToast('Ride reset', 'info');
}

// Update button states
function updateButtonStates(isTracking) {
    document.getElementById('startRide').disabled = isTracking;
    document.getElementById('stopRide').disabled = !isTracking;
    document.getElementById('pauseRide').disabled = !isTracking;
    document.getElementById('resetRide').disabled = !isTracking;
    document.getElementById('shareRide').disabled = !isTracking && currentRoute.length === 0;
}

// Start the timer
function startTimer() {
    timerInterval = setInterval(() => {
        if (!isPaused) {
            const duration = new Date() - startTime;
            document.getElementById('duration').textContent = formatDuration(duration);
        }
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
    
    const rideName = document.getElementById('rideName').value;
    const horseName = document.getElementById('horseSelect').options[document.getElementById('horseSelect').selectedIndex].text;
    const distance = document.getElementById('distance').textContent;
    const duration = document.getElementById('duration').textContent;
    const speed = document.getElementById('speed').textContent;
    
    summary.textContent = `🐎 Horse Riding Summary\n\nRide: ${rideName}\nHorse: ${horseName}\nDistance: ${distance}\nDuration: ${duration}\nAverage Speed: ${speed}`;
    
    modal.classList.remove('hidden');
}

// Copy ride summary to clipboard
function copyRideSummary() {
    const summary = document.getElementById('rideSummary').textContent;
    
    navigator.clipboard.writeText(summary)
        .then(() => {
            showToast('Ride summary copied to clipboard!', 'success');
        })
        .catch(err => {
            showToast('Failed to copy ride summary', 'error');
        });
}

// Dressage test functions
function startDressageTest() {
    const level = document.getElementById('dressageLevel').value;
    if (!level) {
        showToast('Please select a test level', 'warning');
        return;
    }

    dressageActive = true;
    document.getElementById('startDressage').disabled = true;
    document.getElementById('dressageLevel').disabled = true;
    
    // Reset scores and timer
    document.getElementById('dressageScore').textContent = '0.0';
    document.getElementById('dressageTime').textContent = '00:00';
    
    // Start timer
    let seconds = 0;
    dressageTimer = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        document.getElementById('dressageTime').textContent = 
            `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, 1000);

    showToast('Dressage test started', 'success');
}

function endDressageTest() {
    if (!dressageActive) return;
    
    clearInterval(dressageTimer);
    dressageActive = false;
    document.getElementById('startDressage').disabled = false;
    document.getElementById('dressageLevel').disabled = false;
    
    // Calculate final score based on gait transitions, turn accuracy, etc.
    const finalScore = calculateDressageScore();
    document.getElementById('dressageScore').textContent = finalScore.toFixed(1);
    
    showToast('Dressage test completed', 'success');
}

function calculateDressageScore() {
    // Implement scoring logic based on:
    // - Smoothness of gait transitions
    // - Accuracy of turns
    // - Consistency of speed
    // For now, return a sample score
    return 7.5;
}

// Game functions
function startGame() {
    const gameType = document.getElementById('gameSelect').value;
    if (!gameType) {
        showToast('Please select a game', 'warning');
        return;
    }

    gameActive = true;
    document.getElementById('startGame').disabled = true;
    document.getElementById('gameSelect').disabled = true;
    
    // Reset score and timer
    document.getElementById('gameScore').textContent = '0';
    document.getElementById('gameTime').textContent = '00:00';
    
    // Setup game elements
    const gameLayer = games[gameType].setup();
    
    // Start timer
    let seconds = 0;
    gameTimer = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        document.getElementById('gameTime').textContent = 
            `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, 1000);

    showToast('Game started', 'success');
}

function endGame() {
    if (!gameActive) return;
    
    clearInterval(gameTimer);
    gameActive = false;
    document.getElementById('startGame').disabled = false;
    document.getElementById('gameSelect').disabled = false;
    
    showToast('Game completed', 'success');
}

function updateGame() {
    if (!gameActive) return;
    
    // Update game score based on current position, speed, and accuracy
    const currentScore = parseInt(document.getElementById('gameScore').textContent);
    document.getElementById('gameScore').textContent = (currentScore + 1).toString();
}

// Competition functions
function startCompetition() {
    const competitionType = document.getElementById('competitionType').value;
    if (!competitionType) {
        showToast('Please select a competition type', 'warning');
        return;
    }

    competitionActive = true;
    document.getElementById('startCompetition').disabled = true;
    document.getElementById('competitionType').disabled = true;
    
    // Reset scores and timer
    document.getElementById('competitionScore').textContent = '0.0';
    document.getElementById('competitionTime').textContent = '00:00';
    document.getElementById('competitionRank').textContent = '--';
    
    // Setup competition elements
    const competitionLayer = competitions[competitionType].setup();
    
    // Start timer
    let seconds = 0;
    competitionTimer = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        document.getElementById('competitionTime').textContent = 
            `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, 1000);

    showToast('Competition started', 'success');
}

function endCompetition() {
    if (!competitionActive) return;
    
    clearInterval(competitionTimer);
    competitionActive = false;
    document.getElementById('startCompetition').disabled = false;
    document.getElementById('competitionType').disabled = false;
    
    // Calculate final score and rank
    const finalScore = calculateCompetitionScore();
    document.getElementById('competitionScore').textContent = finalScore.toFixed(1);
    document.getElementById('competitionRank').textContent = '1st'; // Simulated ranking
    
    showToast('Competition completed', 'success');
}

function calculateCompetitionScore() {
    // Implement scoring logic based on:
    // - Speed (for speed trials)
    // - Accuracy (for precision challenges)
    // - Endurance metrics
    // For now, return a sample score
    return 85.5;
}

function updateCompetition() {
    if (!competitionActive) return;
    
    // Update competition score based on performance metrics
    const currentScore = parseFloat(document.getElementById('competitionScore').textContent);
    document.getElementById('competitionScore').textContent = 
        (currentScore + 0.1).toFixed(1);
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const typeClasses = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        warning: 'bg-yellow-600',
        info: 'bg-blue-600'
    };
    
    toast.className = `${typeClasses[type]} text-white px-6 py-3 rounded-lg shadow-lg mb-3 flex items-center`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]} mr-2"></i>
        ${message}
    `;
    
    container.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}
