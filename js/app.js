// ============================================================
// TERRAWALK — Main App Logic
// Real GPS + Firebase Realtime Database + PWA Install
// ============================================================

// ===== FIREBASE CONFIG =====
// 🔴 REPLACE THESE VALUES with your own from Firebase Console
// Go to: console.firebase.google.com → Your Project → Project Settings → Your Apps → SDK Setup
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
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
function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase not loaded — running in offline/demo mode');
      return;
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    console.log('✅ Firebase connected');
    listenToOtherUsers();
  } catch (e) {
    console.warn('Firebase init failed — demo mode:', e.message);
  }
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
    area: calculateArea(polygon),
    createdAt: Date.now()
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
        if (poly && poly.path && poly.color) {
          L.polygon(poly.path, {
            color: poly.color,
            fillColor: poly.color,
            fillOpacity: 0.25,
            weight: 2
          }).addTo(map);
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
  state.userId = 'user_' + Math.random().toString(36).substr(2, 9);

  // Save to localStorage for persistence
  localStorage.setItem('tw_user', JSON.stringify({ ...state.user, userId: state.userId, territory: 0, steps: 0, distance: 0, captures: 0, health: 100 }));

  document.getElementById('headerAvatar').innerHTML = avatar;
  document.getElementById('headerAvatar').style.background = color + '33';
  document.getElementById('headerAvatar').style.fontSize = '14px';
  document.getElementById('headerName').textContent = name;

  document.getElementById('profileModal').classList.remove('open');
  initMap();
  renderLeaderboards();
  startDecay();
  saveUserToFirebase();
  showNotif(`Welcome ${name}! Walk to claim your ground 🗺️`);
}

function loadSavedProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem('tw_user'));
    if (!saved || !saved.name) return false;
    state.user = { name: saved.name, avatar: saved.avatar, color: saved.color, city: saved.city };
    state.userId = saved.userId;
    state.territory = saved.territory || 0;
    state.steps = saved.steps || 0;
    state.distance = saved.distance || 0;
    state.captures = saved.captures || 0;
    state.health = saved.health || 100;

    document.getElementById('headerAvatar').innerHTML = state.user.avatar;
    document.getElementById('headerAvatar').style.background = state.user.color + '33';
    document.getElementById('headerAvatar').style.fontSize = '14px';
    document.getElementById('headerName').textContent = state.user.name;
    document.getElementById('profileModal').classList.remove('open');
    return true;
  } catch { return false; }
}

function persistState() {
  if (!state.user) return;
  localStorage.setItem('tw_user', JSON.stringify({
    ...state.user,
    userId: state.userId,
    territory: state.territory,
    steps: state.steps,
    distance: state.distance,
    captures: state.captures,
    health: state.health
  }));
}

// ===== MAP INIT =====
function initMap() {
  map = L.map('map', { zoomControl: true, attributionControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

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
    { name: 'Arjun', avatar: '🥬💪', color: '#ff4b6e', offset: [0.003, 0.004], size: 0.002 },
    { name: 'Priya', avatar: '🦸‍♀️✨', color: '#a855f7', offset: [-0.004, 0.002], size: 0.0015 },
    { name: 'Karan', avatar: '🔬🧪', color: '#ffd700', offset: [0.002, -0.003], size: 0.0025 },
    { name: 'Neha', avatar: '👻💚', color: '#f97316', offset: [-0.002, -0.004], size: 0.001 },
  ];
  if (!db) { // Only show demo territories when Firebase is not connected
    demos.forEach(u => {
      const lat = state.currentLat + u.offset[0];
      const lng = state.currentLng + u.offset[1];
      const poly = generatePolygon(lat, lng, u.size, 7);
      L.polygon(poly, { color: u.color, fillColor: u.color, fillOpacity: 0.25, weight: 2 })
        .bindTooltip(`${u.avatar} ${u.name}`, { permanent: false }).addTo(map);
    });
  }
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

function closeTerritory() {
  if (state.walkPath.length < 3) return;
  const area = calculateArea(state.walkPath);
  state.territory += area;
  state.sessionGain += area;
  state.captures++;

  L.polygon(state.walkPath, {
    color: state.user.color, fillColor: state.user.color, fillOpacity: 0.3, weight: 2
  }).addTo(map);

  saveTerritoryToFirebase([...state.walkPath]);
  if (currentPolyline) { map.removeLayer(currentPolyline); currentPolyline = null; }

  const flash = document.getElementById('captureFlash');
  flash.classList.add('flash');
  setTimeout(() => flash.classList.remove('flash'), 300);

  document.getElementById('hudTerritory').textContent = `+${state.sessionGain} m²`;
  updateStats();

  const rivals = ['Arjun','Priya','Karan','Neha'];
  if (Math.random() < 0.3) showNotif(`⚔️ Captured ${rivals[Math.floor(Math.random()*rivals.length)]}'s territory!`);
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

  const hasProfile = loadSavedProfile();
  if (hasProfile) {
    initMap();
    renderLeaderboards();
    startDecay();
    updateStats();
    checkAchievements();
  }
});
