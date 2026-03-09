// ============================================================
// TERRAWALK — Main App Logic
// Real GPS + Firebase Realtime Database + PWA Install
// ============================================================

// ===== FIREBASE CONFIG =====
// 🔴 REPLACE THESE VALUES with your own from Firebase Console
// Go to: console.firebase.google.com → Your Project → Project Settings → Your Apps → SDK Setup
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCrIxtCxP6eJqPmb0BdguiQTtYzvbY2jrE",
  authDomain: "terrawalk-bc09a.firebaseapp.com",
  databaseURL: "https://terrawalk-bc09a-default-rtdb.firebaseio.com",
  projectId: "terrawalk-bc09a",
  storageBucket: "terrawalk-bc09a.firebasestorage.app",
  messagingSenderId: "184264530167",
  appId: "1:184264530167:web:fe431b558530bbd0c79bf2",
  measurementId: "G-FD91RY4Q1M"
};

// ===== CONSTANTS =====
const AVATARS = ['🧢⚡','🥬💪','🔬🧪','🐱🔴','👻💚','🗡️🌀','🧠👾','💀🏴‍☠️','🦸‍♀️✨','🤜🔥'];
const AVATAR_NAMES = ['The Trainer','The Sailor','The Lab Kid','The Cat','Ghost Rider','The Warrior','The Brain','The Pirate','Power Girl','Street Fighter'];
const COLORS = ['#00e5a0','#ff4b6e','#4b9fff','#ffd700','#ff6b35','#a855f7','#ec4899','#14b8a6','#f97316','#84cc16'];
const CITIES = ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Pune','Kolkata','Ahmedabad','Jaipur','Surat'];
const DECAY_INTERVAL_MS = 48 * 60 * 60 * 1000; // 48 hours
const DECAY_RATE = 0.10; // 10% per 48hr inactive

// ===== STATE =====
let state = {
  user: null,
  walking: false,
  territory: 0,
  steps: 0,
  distance: 0,
  captures: 0,
  health: 100,
  walkPath: [],
  sessionGain: 0,
  lastActivity: Date.now(),
  gpsLocked: false,
  currentLat: null,
  currentLng: null,
  userId: null,
};

let map, userMarker, currentPolyline;
let walkInterval, decayInterval, gpsWatcher;
let db = null; // Firebase database reference
let deferredInstallPrompt = null;

// ===== FIREBASE INIT =====
let auth = null;
let confirmationResult = null;

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase not loaded — demo mode');
      return;
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    auth = firebase.auth();
    console.log('✅ Firebase connected');

    // Listen for auth state — auto-login returning users
    auth.onAuthStateChanged(user => {
      if (user) {
        state.userId = user.uid;
        loadUserFromFirebase(user.uid);
      }
    });
  } catch (e) {
    console.warn('Firebase init failed — demo mode:', e.message);
  }
}

// ===== PHONE AUTH =====
function initRecaptcha() {
  try {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      size: 'normal',
      callback: () => { document.getElementById('sendOtpBtn').disabled = false; }
    });
    window.recaptchaVerifier.render();
  } catch(e) { console.warn('reCAPTCHA init failed:', e); }
}

function sendOTP() {
  const code = document.getElementById('countryCode').value.trim() || '+91';
  const num = document.getElementById('phoneInput').value.trim().replace(/\s/g,'');
  if (num.length < 10) { showNotif('Please enter a valid 10-digit number'); return; }

  const fullNumber = code + num;
  const btn = document.getElementById('sendOtpBtn');
  btn.innerHTML = '<span class="loading-spinner"></span>Sending...';
  btn.disabled = true;

  const appVerifier = window.recaptchaVerifier;
  auth.signInWithPhoneNumber(fullNumber, appVerifier)
    .then(result => {
      confirmationResult = result;
      document.getElementById('otpSentTo').textContent = fullNumber;
      showStep('otp');
      document.getElementById('otp0').focus();
      showNotif('OTP sent! Check your messages 📱');
    })
    .catch(err => {
      console.error(err);
      btn.innerHTML = 'SEND OTP →';
      btn.disabled = false;
      showNotif('Failed to send OTP: ' + err.message);
      // Reset recaptcha on error
      try { window.recaptchaVerifier.reset(); } catch(e) {}
    });
}

function verifyOTP() {
  const otp = [0,1,2,3,4,5].map(i => document.getElementById('otp'+i).value).join('');
  if (otp.length < 6) { showNotif('Please enter the full 6-digit OTP'); return; }

  const btn = document.getElementById('verifyOtpBtn');
  btn.innerHTML = '<span class="loading-spinner"></span>Verifying...';
  btn.disabled = true;

  confirmationResult.confirm(otp)
    .then(result => {
      state.userId = result.user.uid;
      loadUserFromFirebase(result.user.uid);
    })
    .catch(err => {
      btn.innerHTML = 'VERIFY OTP →';
      btn.disabled = false;
      showNotif('Wrong OTP. Please try again.');
    });
}

function resendOTP() {
  try { window.recaptchaVerifier.reset(); } catch(e) {}
  backToPhone();
  showNotif('Enter your number again to resend OTP');
}

function backToPhone() {
  showStep('phone');
  document.getElementById('sendOtpBtn').innerHTML = 'SEND OTP →';
  document.getElementById('sendOtpBtn').disabled = false;
  [0,1,2,3,4,5].forEach(i => document.getElementById('otp'+i).value = '');
}

function showStep(step) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-' + step).classList.add('active');
}

// OTP input helpers
function otpNext(el, nextIdx) {
  if (el.value && nextIdx !== null) document.getElementById('otp'+nextIdx).focus();
  // Auto verify when all 6 filled
  const otp = [0,1,2,3,4,5].map(i => document.getElementById('otp'+i).value).join('');
  if (otp.length === 6) verifyOTP();
}

function otpBack(e, el, prevIdx) {
  if (e.key === 'Backspace' && !el.value && prevIdx !== null) {
    document.getElementById('otp'+prevIdx).focus();
  }
}

// ===== LOAD USER FROM FIREBASE (returning users) =====
function loadUserFromFirebase(uid) {
  if (!db) return;
  db.ref('users/' + uid).once('value').then(snap => {
    const data = snap.val();
    if (data && data.name) {
      // Returning user — restore their profile & stats
      state.user = { name: data.name, avatar: data.avatar, color: data.color, city: data.city };
      state.territory = data.territory || 0;
      state.steps = data.steps || 0;
      state.distance = data.distance || 0;
      state.captures = data.captures || 0;
      state.health = data.health || 100;
      state.lastActivity = data.lastActivity || Date.now();

      updateHeaderUI();
      document.getElementById('loginModal').classList.remove('open');

      // Init map first, then restore territory polygons
      initMap(/* onReady */ () => {
        restoreTerritoryFromFirebase(uid);
        listenToOtherUsers();
        renderLeaderboards();
        startDecay();
        updateStats();
        checkAchievements();
      });
      showNotif('Welcome back, ' + state.user.name + '! Your territory is loading... 🗺️');
    } else {
      // New user — show profile setup step
      showStep('profile');
    }
  });
}

// ===== RESTORE TERRITORY FROM FIREBASE =====
function restoreTerritoryFromFirebase(uid) {
  if (!db) return;

  // First try fast snapshot restore
  db.ref('territory_snapshot/' + uid).once('value').then(snap => {
    const data = snap.val();
    if (data && data.geojson) {
      try {
        const geojson = JSON.parse(data.geojson);
        if (!territoryStore[uid]) {
          territoryStore[uid] = { uid, name: state.user.name, color: state.user.color, geojson: null, layer: null };
        }
        territoryStore[uid].geojson = geojson;
        redrawTerritory(uid);
        showNotif('Your territory is back! 🟢');
        return;
      } catch(e) { console.warn('Snapshot parse error:', e); }
    }

    // Fallback: rebuild from individual polygons
    db.ref('territories/' + uid).once('value').then(snap2 => {
      const polys = snap2.val();
      if (!polys) return;
      if (!territoryStore[uid]) {
        territoryStore[uid] = { uid, name: state.user.name, color: state.user.color, geojson: null, layer: null };
      }
      Object.values(polys).forEach(poly => {
        if (!poly || !poly.path) return;
        try {
          const newGeoJSON = pathToGeoJSON(poly.path);
          if (territoryStore[uid].geojson) {
            try { territoryStore[uid].geojson = turf.union(territoryStore[uid].geojson, newGeoJSON); }
            catch(e) { console.warn('Union on restore failed:', e); }
          } else {
            territoryStore[uid].geojson = newGeoJSON;
          }
        } catch(e) { console.warn('Restore polygon error:', e); }
      });
      redrawTerritory(uid);
      showNotif('Your territory is back! 🟢');
    });
  });
}

// ===== FIREBASE: SAVE USER DATA =====
function saveUserToFirebase() {
  if (!db || !state.userId) return;
  db.ref(`users/${state.userId}`).set({
    name: state.user.name,
    avatar: state.user.avatar,
    color: state.user.color,
    city: state.user.city,
    territory: state.territory,
    steps: state.steps,
    distance: parseFloat(state.distance.toFixed(2)),
    captures: state.captures,
    health: state.health,
    lastActivity: state.lastActivity,
    updatedAt: Date.now()
  });
}

// ===== FIREBASE: SAVE TERRITORY POLYGON =====
function saveTerritoryToFirebase(polygon) {
  if (!db || !state.userId) return;
  const polyId = Date.now().toString();
  db.ref(`territories/${state.userId}/${polyId}`).set({
    path: polygon,
    color: state.user.color,
    name: state.user.name,
    area: Math.floor(turf.area(pathToGeoJSON(polygon))),
    createdAt: Date.now()
  });
}

// ===== FIREBASE: SAVE MERGED GEOJSON (full territory snapshot) =====
function saveMergedTerritoryToFirebase() {
  if (!db || !state.userId) return;
  const entry = territoryStore[state.userId];
  if (!entry || !entry.geojson) return;
  // Save the final merged GeoJSON as a snapshot for fast restore on login
  db.ref(`territory_snapshot/${state.userId}`).set({
    geojson: JSON.stringify(entry.geojson),
    color: state.user.color,
    name: state.user.name,
    updatedAt: Date.now()
  });
}

// ===== FIREBASE: LISTEN TO OTHER USERS =====
function listenToOtherUsers() {
  if (!db) return;
  db.ref('territories').on('value', snapshot => {
    const allTerritories = snapshot.val() || {};
    Object.entries(allTerritories).forEach(([uid, polygons]) => {
      if (uid === state.userId) return; // skip self
      Object.values(polygons).forEach(poly => {
        if (poly && poly.path && poly.color && poly.name) {
          registerRivalTerritory(uid, poly.name, poly.color, poly.path);
        }
      });
    });
  });

  // Listen for leaderboard updates
  db.ref('users').orderByChild('territory').limitToLast(20).on('value', snapshot => {
    const users = [];
    snapshot.forEach(child => users.push({ uid: child.key, ...child.val() }));
    users.reverse();
    renderFirebaseLeaderboard(users);
  });
}

function renderFirebaseLeaderboard(users) {
  if (!state.user) return;
  const cityUsers = users.filter(u => u.city === state.user.city);
  renderLbList('localLb', cityUsers.map(u => ({ ...u, me: u.uid === state.userId })));
  renderLbList('globalLb', users.map(u => ({ ...u, me: u.uid === state.userId })));
}

// ===== PROFILE SETUP =====
function buildProfileModal() {
  const avatarPicker = document.getElementById('avatarPicker');
  AVATARS.forEach((a, i) => {
    const el = document.createElement('div');
    el.className = 'avatar-option' + (i === 0 ? ' selected' : '');
    el.innerHTML = `<span style="font-size:20px;line-height:1">${a}</span><span class="av-label">${AVATAR_NAMES[i]}</span>`;
    el.onclick = () => {
      document.querySelectorAll('.avatar-option').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
    };
    avatarPicker.appendChild(el);
  });

  const colorPicker = document.getElementById('colorPicker');
  COLORS.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = 'color-option' + (i === 0 ? ' selected' : '');
    el.style.background = c;
    el.dataset.c = c;
    el.onclick = () => {
      document.querySelectorAll('.color-option').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
    };
    colorPicker.appendChild(el);
  });
}

function createProfile() {
  const name = document.getElementById('usernameInput').value.trim();
  if (!name) { showNotif('Please enter your warrior name!'); return; }

  const avatar = document.querySelector('.avatar-option.selected').querySelector('span').textContent;
  const color = document.querySelector('.color-option.selected').dataset.c;
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];

  state.user = { name, avatar, color, city };

  updateHeaderUI();
  document.getElementById('loginModal').classList.remove('open');
  initMap(() => {
    listenToOtherUsers();
    renderLeaderboards();
    startDecay();
    updateStats();
    checkAchievements();
  });
  saveUserToFirebase();
  showNotif('Welcome ' + name + '! Walk to claim your ground 🗺️');
}

function updateHeaderUI() {
  document.getElementById('headerAvatar').innerHTML = state.user.avatar;
  document.getElementById('headerAvatar').style.background = state.user.color + '33';
  document.getElementById('headerAvatar').style.fontSize = '14px';
  document.getElementById('headerName').textContent = state.user.name;
}

function loadSavedProfile() {
  // Profile is now loaded from Firebase via onAuthStateChanged
  // This function is kept as no-op for compatibility
  return false;
}

function persistState() {
  // State is persisted to Firebase via saveUserToFirebase()
  // localStorage used only as fallback for territory GeoJSON
  if (state.userId && territoryStore[state.userId] && territoryStore[state.userId].geojson) {
    try {
      localStorage.setItem('tw_geojson_' + state.userId, JSON.stringify(territoryStore[state.userId].geojson));
    } catch(e) {}
  }
}

// ===== MAP INIT =====
function initMap(onReady) {
  map = L.map('map', { zoomControl: true, attributionControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
  setTimeout(() => { map.invalidateSize(); }, 300);

  updateGpsStatus('searching', 'Searching for GPS signal...');

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      state.currentLat = lat;
      state.currentLng = lng;
      state.gpsLocked = true;
      map.setView([lat, lng], 17);
      placeUserMarker(lat, lng);
      updateGpsStatus('locked', 'GPS Locked ✓');
      addDemoTerritories();
      if (onReady) onReady();
    },
    () => {
      // Fallback: Delhi
      const lat = 28.6139, lng = 77.2090;
      state.currentLat = lat;
      state.currentLng = lng;
      map.setView([lat, lng], 16);
      placeUserMarker(lat, lng);
      updateGpsStatus('searching', 'GPS unavailable — using Delhi');
      showNotif('📍 Enable location for real GPS tracking');
      addDemoTerritories();
      if (onReady) onReady();
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function updateGpsStatus(status, text) {
  const dot = document.getElementById('gpsDot');
  const label = document.getElementById('gpsLabel');
  dot.className = 'gps-dot ' + status;
  label.textContent = text;
}

function placeUserMarker(lat, lng) {
  const icon = L.divIcon({
    html: `<div style="width:40px;height:40px;border-radius:50%;background:${state.user.color};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 20px ${state.user.color};line-height:1">${state.user.avatar}</div>`,
    iconSize: [40, 40], className: ''
  });
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.marker([lat, lng], { icon }).addTo(map);
}

function addDemoTerritories() {
  const demos = [
    { name: 'Arjun', avatar: '🥬💪', color: '#ff4b6e', offset: [0.003, 0.004], radius: 200 },
    { name: 'Priya', avatar: '🦸‍♀️✨', color: '#a855f7', offset: [-0.004, 0.002], radius: 150 },
    { name: 'Karan', avatar: '🔬🧪', color: '#ffd700', offset: [0.002, -0.003], radius: 250 },
    { name: 'Neha', avatar: '👻💚', color: '#f97316', offset: [-0.002, -0.004], radius: 100 },
  ];
  demos.forEach((u, i) => {
    const lat = state.currentLat + u.offset[0];
    const lng = state.currentLng + u.offset[1];
    // Use turf.circle for clean geometry
    try {
      const circle = turf.circle([lng, lat], u.radius / 1000, { steps: 16, units: 'kilometers' });
      const path = circle.geometry.coordinates[0].map(c => [c[1], c[0]]);
      const demoUid = 'demo_' + i;
      registerRivalTerritory(demoUid, u.name, u.color, path);
    } catch(e) {
      // Fallback to generated polygon
      const poly = generatePolygon(lat, lng, 0.002, 8);
      registerRivalTerritory('demo_' + i, u.name, u.color, poly);
    }
  });
}

function generatePolygon(cLat, cLng, size, pts) {
  return Array.from({ length: pts }, (_, i) => {
    const angle = (i / pts) * 2 * Math.PI;
    const r = size * (0.7 + Math.random() * 0.6);
    return [cLat + r * Math.cos(angle), cLng + r * Math.sin(angle)];
  });
}

// ===== WALK =====
function toggleWalk() { state.walking ? stopWalk() : startWalk(); }

function startWalk() {
  state.walking = true;
  state.walkPath = [];
  state.sessionGain = 0;

  document.getElementById('walkBtn').textContent = '⏹ STOP WALK';
  document.getElementById('walkBtn').classList.add('active');
  document.getElementById('walkingHud').classList.add('visible');
  document.getElementById('statusBadge').textContent = '🔴 WALKING';

  // Real GPS tracking
  if (navigator.geolocation && state.gpsLocked) {
    gpsWatcher = navigator.geolocation.watchPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        state.currentLat = lat;
        state.currentLng = lng;
        addWalkPoint(lat, lng);
        placeUserMarker(lat, lng);
        map.panTo([lat, lng]);
        state.steps += estimateSteps(pos.coords.speed);
        state.distance += 0.001;
        updateStats();
      },
      null,
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
    );
    showNotif('Real GPS active — start walking! 🚶');
  } else {
    // Demo simulation fallback
    simulateWalk();
    showNotif('Demo mode — tap map to trace path 🗺️');
  }
}

function stopWalk() {
  state.walking = false;
  state.lastActivity = Date.now();
  state.health = Math.min(100, state.health + 20);

  if (gpsWatcher) navigator.geolocation.clearWatch(gpsWatcher);
  if (walkInterval) clearInterval(walkInterval);
  if (state.walkPath.length > 2) closeTerritory();

  document.getElementById('walkBtn').textContent = '▶ START WALK';
  document.getElementById('walkBtn').classList.remove('active');
  document.getElementById('walkingHud').classList.remove('visible');
  document.getElementById('statusBadge').textContent = '🟢 READY';

  updateStats();
  checkAchievements();
  persistState();
  saveUserToFirebase();
  saveMergedTerritoryToFirebase();
  showNotif(`Walk done! +${state.sessionGain} m² claimed 🎉`);
}

function estimateSteps(speed) {
  if (!speed || speed <= 0) return Math.floor(Math.random() * 5) + 8;
  return Math.floor(speed * 1.4 * 2); // ~1.4 steps/meter
}

function simulateWalk() {
  let lat = state.currentLat, lng = state.currentLng;
  let angle = Math.random() * 360;
  let step = 0;
  addWalkPoint(lat, lng);

  walkInterval = setInterval(() => {
    if (!state.walking) { clearInterval(walkInterval); return; }
    angle += (Math.random() - 0.5) * 60;
    const rad = angle * Math.PI / 180;
    lat += Math.cos(rad) * 0.00008;
    lng += Math.sin(rad) * 0.00008;
    state.currentLat = lat;
    state.currentLng = lng;
    addWalkPoint(lat, lng);
    placeUserMarker(lat, lng);
    state.steps += Math.floor(Math.random() * 8) + 12;
    state.distance += 0.008;
    updateStats();
    step++;
    if (step % 22 === 0) { closeTerritory(); state.walkPath = [[lat, lng]]; }
  }, 800);
}

function addWalkPoint(lat, lng) {
  state.walkPath.push([lat, lng]);
  if (currentPolyline) map.removeLayer(currentPolyline);
  currentPolyline = L.polyline(state.walkPath, {
    color: state.user.color, weight: 3, opacity: 0.8, dashArray: '6,4'
  }).addTo(map);
}

// ===== TERRITORY STORE =====
// Each entry: { uid, name, color, geojson: GeoJSON Feature (Polygon/MultiPolygon), layer }
let territoryStore = {};

// ===== TURF HELPERS =====

// Convert [[lat,lng],...] path to GeoJSON polygon (Turf uses [lng,lat])
function pathToGeoJSON(path) {
  const coords = path.map(p => [p[1], p[0]]);
  // Close the ring
  if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) {
    coords.push(coords[0]);
  }
  return turf.polygon([coords]);
}

// Convert GeoJSON polygon coords back to [[lat,lng],...] for Leaflet
function geojsonToLeaflet(geojson) {
  const type = geojson.geometry.type;
  if (type === 'Polygon') {
    return [geojson.geometry.coordinates[0].map(c => [c[1], c[0]])];
  } else if (type === 'MultiPolygon') {
    return geojson.geometry.coordinates.map(poly => poly[0].map(c => [c[1], c[0]]));
  }
  return [];
}

// Redraw territory for a uid from their stored GeoJSON
function redrawTerritory(uid) {
  const entry = territoryStore[uid];
  if (!entry) return;
  if (entry.layer) { map.removeLayer(entry.layer); entry.layer = null; }
  if (!entry.geojson) return;

  const isMe = uid === state.userId;
  const paths = geojsonToLeaflet(entry.geojson);
  const layers = paths.map(path =>
    L.polygon(path, {
      color: entry.color,
      fillColor: entry.color,
      fillOpacity: isMe ? 0.4 : 0.25,
      weight: isMe ? 2.5 : 1.5,
      smoothFactor: 1
    })
  );
  entry.layer = L.layerGroup(layers).addTo(map);
}

// ===== CLOSE TERRITORY (merge + capture) =====
function closeTerritory() {
  if (state.walkPath.length < 3) return;

  const newPath = [...state.walkPath];
  const uid = state.userId;
  let newGeoJSON;

  try { newGeoJSON = pathToGeoJSON(newPath); }
  catch(e) { console.warn('Invalid polygon', e); return; }

  const newArea = calculateArea(newPath);

  // Init user entry if first territory
  if (!territoryStore[uid]) {
    territoryStore[uid] = { uid, name: state.user.name, color: state.user.color, geojson: null, layer: null };
  }

  // ---- CAPTURE: subtract overlap from each rival ----
  Object.keys(territoryStore).forEach(rivalUid => {
    if (rivalUid === uid) return;
    const rival = territoryStore[rivalUid];
    if (!rival.geojson) return;

    try {
      const intersection = turf.intersect(newGeoJSON, rival.geojson);
      if (!intersection) return; // no overlap

      // Calculate captured area in m²
      const capturedM2 = Math.floor(turf.area(intersection));
      if (capturedM2 < 1) return;

      // Subtract captured area from rival
      const remaining = turf.difference(rival.geojson, newGeoJSON);
      rival.geojson = remaining; // null if fully consumed
      redrawTerritory(rivalUid);

      // Add captured area to user's stats
      state.territory += capturedM2;
      state.sessionGain += capturedM2;
      state.captures++;

      showNotif(`⚔️ Captured ${capturedM2} m² from ${rival.name}!`);
    } catch(e) { console.warn('Capture error:', e); }
  });

  // ---- MERGE: union new polygon into user's existing territory ----
  try {
    if (territoryStore[uid].geojson) {
      const merged = turf.union(territoryStore[uid].geojson, newGeoJSON);
      territoryStore[uid].geojson = merged;
    } else {
      territoryStore[uid].geojson = newGeoJSON;
    }
  } catch(e) {
    // Fallback: just set as new polygon if union fails
    territoryStore[uid].geojson = newGeoJSON;
    console.warn('Union error:', e);
  }

  // Add new walk area to stats
  const realArea = Math.floor(turf.area(newGeoJSON));
  state.territory += realArea;
  state.sessionGain += realArea;

  redrawTerritory(uid);
  persistTerritoryStore(uid);
  saveTerritoryToFirebase(newPath);
  saveMergedTerritoryToFirebase();

  if (currentPolyline) { map.removeLayer(currentPolyline); currentPolyline = null; }

  const flash = document.getElementById('captureFlash');
  flash.classList.add('flash');
  setTimeout(() => flash.classList.remove('flash'), 300);

  document.getElementById('hudTerritory').textContent = `+${state.sessionGain} m²`;
  updateStats();
}

// Persist territory GeoJSON to localStorage
function persistTerritoryStore(uid) {
  try {
    const entry = territoryStore[uid];
    if (entry && entry.geojson) {
      localStorage.setItem('tw_geojson_' + uid, JSON.stringify(entry.geojson));
    }
  } catch(e) {}
}

// Restore saved territory — from Firebase first, fallback to localStorage
function restoreTerritoryFromStorage() {
  const uid = state.userId;
  if (!uid) return;

  // Try Firebase first (works across devices)
  if (db) {
    db.ref('territories/' + uid).once('value').then(snap => {
      const data = snap.val();
      if (!data) { restoreTerritoryFromLocal(uid); return; }

      if (!territoryStore[uid]) {
        territoryStore[uid] = { uid, name: state.user.name, color: state.user.color, geojson: null, layer: null };
      }

      // Merge all saved polygons back into one GeoJSON
      Object.values(data).forEach(poly => {
        if (!poly || !poly.path) return;
        try {
          const newGeo = pathToGeoJSON(poly.path);
          if (territoryStore[uid].geojson) {
            territoryStore[uid].geojson = turf.union(territoryStore[uid].geojson, newGeo);
          } else {
            territoryStore[uid].geojson = newGeo;
          }
        } catch(e) {}
      });

      if (territoryStore[uid].geojson) {
        // Update territory area from restored GeoJSON
        state.territory = Math.floor(turf.area(territoryStore[uid].geojson));
        redrawTerritory(uid);
        updateStats();
        showNotif('Territory restored! 🗺️');
      }
    }).catch(() => restoreTerritoryFromLocal(uid));
  } else {
    restoreTerritoryFromLocal(uid);
  }
}

// Fallback: restore from localStorage
function restoreTerritoryFromLocal(uid) {
  try {
    const saved = JSON.parse(localStorage.getItem('tw_geojson_' + uid));
    if (!saved) return;
    if (!territoryStore[uid]) {
      territoryStore[uid] = { uid, name: state.user.name, color: state.user.color, geojson: null, layer: null };
    }
    territoryStore[uid].geojson = saved;
    state.territory = Math.floor(turf.area(saved));
    redrawTerritory(uid);
    updateStats();
  } catch(e) { console.warn('Could not restore territory:', e); }
}

// Register a rival's territory into the store (called from Firebase listener)
function registerRivalTerritory(uid, name, color, path) {
  if (uid === state.userId) return;
  try {
    const newGeoJSON = pathToGeoJSON(path);
    if (!territoryStore[uid]) {
      territoryStore[uid] = { uid, name, color, geojson: null, layer: null };
    }
    if (territoryStore[uid].geojson) {
      territoryStore[uid].geojson = turf.union(territoryStore[uid].geojson, newGeoJSON);
    } else {
      territoryStore[uid].geojson = newGeoJSON;
    }
    redrawTerritory(uid);
  } catch(e) { console.warn('Register rival error:', e); }
}

function calculateArea(path) {
  let area = 0;
  const n = path.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += path[i][1] * path[j][0];
    area -= path[j][1] * path[i][0];
  }
  return Math.max(1, Math.abs(area / 2) * 1e10 | 0);
}

// ===== DECAY =====
function startDecay() {
  decayInterval = setInterval(() => {
    if (state.walking) return;
    const inactiveMins = (Date.now() - state.lastActivity) / 60000;
    if (inactiveMins > 1) {
      state.health = Math.max(0, state.health - 0.3);
      if (state.health < 60) {
        document.getElementById('decayWarning').style.display = 'block';
        state.territory = Math.max(0, Math.floor(state.territory * 0.999));
      }
      const fillEl = document.getElementById('healthFill');
      const pctEl = document.getElementById('healthPct');
      const noteEl = document.getElementById('healthNote');
      if (fillEl) fillEl.style.width = state.health + '%';
      if (pctEl) pctEl.textContent = Math.floor(state.health) + '%';
      if (noteEl) noteEl.textContent = inactiveMins > 2 ?
        `⚠️ Inactive ${Math.floor(inactiveMins)}m – territory shrinking` :
        'Walk to maintain your territory';
      persistState();
    }
  }, 5000);
}

// ===== STATS =====
function updateStats() {
  document.getElementById('statTerritory').textContent = formatNum(state.territory);
  document.getElementById('statSteps').textContent = formatNum(state.steps);
  document.getElementById('statDist').textContent = state.distance.toFixed(1);
  document.getElementById('statCaptures').textContent = state.captures;
  document.getElementById('hudDist').textContent = state.distance.toFixed(2) + ' km';
  document.getElementById('hudTerritory').textContent = '+' + state.sessionGain + ' m²';
}

function formatNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return n.toString();
}

// ===== LEADERBOARD (demo fallback) =====
function renderLeaderboards() {
  if (db) return; // Firebase handles it
  const local = [
    { name: state.user.name, avatar: state.user.avatar, color: state.user.color, city: state.user.city, territory: state.territory, me: true },
    { name: 'Arjun Singh', avatar: '🥬💪', color: '#ff4b6e', city: state.user.city, territory: 8420 },
    { name: 'Priya Sharma', avatar: '🦸‍♀️✨', color: '#a855f7', city: state.user.city, territory: 6300 },
    { name: 'Karan Mehta', avatar: '🔬🧪', color: '#ffd700', city: state.user.city, territory: 5100 },
    { name: 'Neha Gupta', avatar: '👻💚', color: '#f97316', city: state.user.city, territory: 3800 },
    { name: 'Rahul Verma', avatar: '🧠👾', color: '#14b8a6', city: state.user.city, territory: 2200 },
  ];
  const global = [
    { name: 'Vikram Nair', avatar: '🗡️🌀', color: '#ff4b6e', city: 'Bangalore', territory: 48200 },
    { name: 'Ananya Iyer', avatar: '🧢⚡', color: '#4b9fff', city: 'Chennai', territory: 41000 },
    { name: 'Rohit Patel', avatar: '🤜🔥', color: '#ffd700', city: 'Ahmedabad', territory: 38500 },
    { name: 'Kavya Reddy', avatar: '💀🏴‍☠️', color: '#a855f7', city: 'Hyderabad', territory: 32000 },
    { name: 'Aditya Kumar', avatar: '🐱🔴', color: '#f97316', city: 'Mumbai', territory: 28700 },
    { name: state.user.name, avatar: state.user.avatar, color: state.user.color, city: state.user.city, territory: state.territory, me: true },
  ];
  renderLbList('localLb', local.sort((a,b) => b.territory - a.territory));
  renderLbList('globalLb', global.sort((a,b) => b.territory - a.territory));
  setTimeout(renderLeaderboards, 5000);
}

function renderLbList(id, data) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = data.slice(0, 10).map((u, i) => {
    const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    return `<div class="lb-item ${u.me ? 'me' : ''}">
      <div class="lb-rank ${rankClass}">${rankLabel}</div>
      <div class="lb-avatar" style="background:${u.color}33">${u.avatar}</div>
      <div class="lb-info">
        <div class="lb-name">${u.name}${u.me ? ' (You)' : ''}</div>
        <div class="lb-city">${u.city || ''}</div>
      </div>
      <div class="lb-territory">${formatNum(u.territory)} m²</div>
    </div>`;
  }).join('');
}

// ===== ACHIEVEMENTS =====
function checkAchievements() {
  const all = [
    { icon: '👟', label: '100 Steps!', cond: state.steps >= 100 },
    { icon: '🗺️', label: 'Territory Explorer', cond: state.territory >= 500 },
    { icon: '⚔️', label: 'First Capture', cond: state.captures >= 1 },
    { icon: '🏃', label: '0.5km Walker', cond: state.distance >= 0.5 },
    { icon: '🔥', label: '1km Warrior', cond: state.distance >= 1 },
    { icon: '👑', label: 'Territory King', cond: state.territory >= 5000 },
  ];
  const earned = all.filter(a => a.cond);
  const el = document.getElementById('achievementsList');
  if (!el) return;
  el.innerHTML = earned.length
    ? earned.map(a => `<div style="display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:12px;"><span style="font-size:16px">${a.icon}</span><span>${a.label}</span></div>`).join('')
    : `<div style="color:var(--text-dim);font-size:12px">Walk to earn achievements!</div>`;
}

// ===== TABS =====
function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
}

// ===== SIDEBAR MOBILE =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

// ===== NOTIFICATION =====
function showNotif(msg) {
  const el = document.getElementById('notif');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ===== PWA INSTALL =====
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  setTimeout(() => document.getElementById('installBanner').classList.add('show'), 3000);
});

function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(result => {
    if (result.outcome === 'accepted') showNotif('TerraWalk installed! 🎉');
    document.getElementById('installBanner').classList.remove('show');
    deferredInstallPrompt = null;
  });
}

function dismissInstall() {
  document.getElementById('installBanner').classList.remove('show');
}

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('✅ Service Worker registered'))
    .catch(e => console.warn('SW registration failed:', e));
}

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
  buildProfileModal();
  initFirebase();
  // reCAPTCHA init happens after Firebase is ready
  setTimeout(initRecaptcha, 500);
});

// ===== DEMO MODE =====
function startDemo() {
  if (!state.user) { showNotif('Please create your profile first!'); return; }
  if (!map) { showNotif('Map still loading, try again!'); return; }

  showNotif('🎮 Demo Mode — watch your territory appear!');

  const center = map.getCenter();
  state.currentLat = center.lat;
  state.currentLng = center.lng;
  state.walking = true;
  state.walkPath = [];
  state.sessionGain = 0;

  document.getElementById('walkBtn').textContent = '⏹ STOP WALK';
  document.getElementById('walkBtn').classList.add('active');
  document.getElementById('walkingHud').classList.add('visible');
  document.getElementById('statusBadge').textContent = '🎮 DEMO';
  document.getElementById('demoBtn').style.display = 'none';

  const lat = state.currentLat;
  const lng = state.currentLng;
  const radius = 0.0012;
  const totalSteps = 36;
  let currentStep = 0;

  addWalkPoint(lat + radius, lng);
  placeUserMarker(lat + radius, lng);

  walkInterval = setInterval(() => {
    if (!state.walking) { clearInterval(walkInterval); return; }
    currentStep++;
    const angle = (currentStep / totalSteps) * 2 * Math.PI;
    const newLat = lat + radius * Math.cos(angle);
    const newLng = lng + radius * Math.sin(angle);
    addWalkPoint(newLat, newLng);
    placeUserMarker(newLat, newLng);
    map.panTo([newLat, newLng]);
    state.steps += Math.floor(Math.random() * 8) + 15;
    state.distance += 0.023;
    updateStats();

    if (currentStep >= totalSteps) {
      clearInterval(walkInterval);
      setTimeout(() => {
        closeTerritory();
        state.walking = false;
        document.getElementById('walkBtn').textContent = '▶ START WALK';
        document.getElementById('walkBtn').classList.remove('active');
        document.getElementById('walkingHud').classList.remove('visible');
        document.getElementById('statusBadge').textContent = '🟢 READY';
        document.getElementById('demoBtn').style.display = 'block';
        updateStats();
        checkAchievements();
        persistState();
        saveUserToFirebase();
        showNotif('🎉 Territory claimed! +' + state.sessionGain + ' m²');
      }, 500);
    }
  }, 300);
}
