// ============================================================
// TERRAWALK — Main App Logic
// Real GPS + Firebase Realtime Database + PWA Install
// ============================================================

// ===== FIREBASE CONFIG =====
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

// ===== APP VERSION =====
const APP_VERSION = '2.0';

// ===== FCM VAPID KEY =====
const VAPID_KEY = 'PASTE_YOUR_VAPID_KEY_HERE';

// ===== CONSTANTS =====
const AVATAR_NAMES = [
  "Person","Man","Woman",
  "Penguin","Owl","Duck","Eagle","Turtle","Octopus","Crab","Lobster","Dolphin","Shark",
  "Bee","Butterfly","Ladybug","Ant","Cricket",
  "Hedgehog","Sloth","Otter","Skunk","Kangaroo","Bison","Mammoth","Giraffe","Zebra"
];

const AVATARS_EMOJI = [
  "🧍","🧍‍♂️","🧍‍♀️",
  "🐧","🦉","🦆","🦅","🐢","🐙","🦀","🦞","🐬","🦈",
  "🐝","🦋","🐞","🐜","🦗",
  "🦔","🦥","🦦","🦨","🦘","🦬","🦣","🦒","🦓"
];

const COLORS = ['#00e5a0','#ff4b6e','#4b9fff','#ffd700','#ff6b35','#a855f7','#ec4899','#14b8a6','#f97316','#84cc16'];
const CITIES = ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Pune','Kolkata','Ahmedabad','Jaipur','Surat'];

// ===== STATE =====
let state = {
  user: null,
  walking: false,
  territory: 0,
  steps: 0,
  distance: 0,
  captures: 0,
  todayTerritory: 0,
  todaySteps: 0,
  todayDistance: 0,
  todayCaptures: 0,
  todayDate: new Date().toDateString(),
  health: 100,
  walkPath: [],
  sessionGain: 0,
  sessionDist: 0,
  sessionSteps: 0,
  lastActivity: Date.now(),
  gpsLocked: false,
  currentLat: null,
  currentLng: null,
  userId: null,
};

let map, userMarker, currentPolyline;
let currentHeading = 0;
let demoRunning = false;
let demoInterval = null;
let walkInterval, decayInterval, gpsWatcher;
let db = null;
let deferredInstallPrompt = null;

// ===== FIREBASE INIT =====
function initFirebase() {
  try {
    if (typeof firebase === 'undefined') { return; }
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
  } catch (e) {}
}

// ===== PHONE LOGIN =====
let currentPhone = '';
function initRecaptcha() { /* not needed */ }

function submitPhone() {
  const code = document.getElementById('countryCode').value.trim() || '+91';
  const num = document.getElementById('phoneInput').value.trim().replace(/\s/g,'');
  if (num.length < 10) { showNotif('Please enter a valid 10-digit number'); return; }
  currentPhone = code + num;
  const btn = document.getElementById('submitPhoneBtn');
  btn.innerHTML = '<span class="loading-spinner"></span>Loading...';
  btn.disabled = true;
  const uid = 'ph_' + btoa(currentPhone).replace(/[^a-zA-Z0-9]/g,'');
  state.userId = uid;
  localStorage.setItem('tw_uid', uid);
  localStorage.setItem('tw_phone', currentPhone);
  loadUserFromFirebase(uid);
}

function showStep(step) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-' + step).classList.add('active');
}

// ===== LOAD USER FROM FIREBASE =====
function loadUserFromFirebase(uid) {
  if (!db) return;
  db.ref('users/' + uid).once('value').then(snap => {
    const data = snap.val();
    if (data && data.name) {
      state.user = {
        name: data.name, avatar: data.avatar, color: data.color, city: data.city,
        bio: data.bio || '', accessory: data.accessory || 'none',
        zoneName: data.zoneName || '', walkGoal: data.walkGoal || 5000,
      };
      state.sessionDist = 0; state.sessionSteps = 0;
      state.territory = data.territory || 0; state.steps = data.steps || 0;
      state.distance = data.distance || 0; state.captures = data.captures || 0;
      state.health = data.health || 100; state.lastActivity = data.lastActivity || Date.now();
      const storedDate = data.todayDate || '';
      const todayStr = new Date().toDateString();
      if (storedDate === todayStr) {
        state.todayTerritory = data.todayTerritory || 0;
        state.todaySteps = data.todaySteps || 0;
        state.todayDistance = data.todayDistance || 0;
        state.todayCaptures = data.todayCaptures || 0;
        state.todayDate = todayStr;
      } else {
        state.todayTerritory = 0; state.todaySteps = 0;
        state.todayDistance = 0; state.todayCaptures = 0;
        state.todayDate = todayStr;
      }
      updateHeaderUI();
      document.getElementById('loginModal').classList.remove('open');
      initMap(() => {
        restoreTerritoryFromFirebase(uid, () => { listenToOtherUsers(); });
        listenForNotifications();
        renderLeaderboards();
        startDecay();
        updateStats();
        checkAchievements();
        setTimeout(checkNotifPrompt, 2000);
      });
      showNotif('Welcome back, ' + state.user.name + '! Your territory is loading... 🗺️');
    } else {
      const btn = document.getElementById('submitPhoneBtn');
      if (btn) { btn.innerHTML = 'CONTINUE →'; btn.disabled = false; }
      showStep('profile');
    }
  });
}

// ===== RESTORE TERRITORY FROM FIREBASE =====
function restoreTerritoryFromFirebase(uid, onDone) {
  if (!db) { if (onDone) onDone(); return; }
  db.ref('territory_snapshot/' + uid).once('value').then(snap => {
    const data = snap.val();
    if (data && data.geojson) {
      try {
        const geojson = JSON.parse(data.geojson);
        if (!territoryStore[uid]) {
          territoryStore[uid] = { uid, name: state.user.name, color: state.user.color, zoneName: state.user.zoneName || '', geojson: null, layer: null };
        }
        territoryStore[uid].geojson = geojson;
        redrawTerritory(uid);
        showNotif('Your territory is back! 🟢');
        if (onDone) onDone();
        return;
      } catch(e) { console.warn('Snapshot parse error:', e); }
    }
    db.ref('territories/' + uid).once('value').then(snap2 => {
      const polys = snap2.val();
      if (!polys) { if (onDone) onDone(); return; }
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
      if (onDone) onDone();
    });
  });
}

// ===== FIREBASE: SAVE USER DATA =====
function saveUserToFirebase() {
  if (!db || !state.userId || !state.user) return;
  db.ref(`users/${state.userId}`).set({
    name: state.user.name, avatar: state.user.avatar, color: state.user.color,
    city: state.user.city, bio: state.user.bio || '', accessory: state.user.accessory || 'none',
    zoneName: state.user.zoneName || '', walkGoal: state.user.walkGoal || 5000,
    territory: state.territory, steps: state.steps,
    distance: parseFloat(state.distance.toFixed(2)), captures: state.captures,
    health: state.health, lastActivity: state.lastActivity,
    todayTerritory: state.todayTerritory || 0, todaySteps: state.todaySteps || 0,
    todayDistance: parseFloat((state.todayDistance || 0).toFixed(2)),
    todayCaptures: state.todayCaptures || 0,
    todayDate: state.todayDate || new Date().toDateString(),
    updatedAt: Date.now()
  });
}

// ===== FIREBASE: SAVE TERRITORY POLYGON =====
function saveTerritoryToFirebase(polygon) {
  if (!db || !state.userId) return;
  const polyId = Date.now().toString();
  db.ref(`territories/${state.userId}/${polyId}`).set({
    path: polygon, color: state.user.color, name: state.user.name,
    area: Math.floor(turf.area(pathToGeoJSON(polygon))), createdAt: Date.now()
  });
}

// ===== FIREBASE: SAVE MERGED GEOJSON =====
function saveMergedTerritoryToFirebase() {
  if (!db || !state.userId) return;
  const entry = territoryStore[state.userId];
  if (!entry || !entry.geojson) return;
  db.ref(`territory_snapshot/${state.userId}`).set({
    geojson: JSON.stringify(entry.geojson), color: state.user.color,
    name: state.user.name, updatedAt: Date.now()
  });
}

// ===== RECONCILE RIVAL OVERLAP =====
function reconcileRivalOverlap(rivalUid) {
  const myEntry = territoryStore[state.userId];
  const rivalEntry = territoryStore[rivalUid];
  if (!myEntry || !myEntry.geojson || !rivalEntry || !rivalEntry.geojson) return;
  try {
    const intersection = turf.intersect(myEntry.geojson, rivalEntry.geojson);
    if (!intersection) return;
    const overlapM2 = Math.floor(turf.area(intersection));
    if (overlapM2 < 10) return;
    console.log(`Reconciling ${overlapM2}m² overlap with ${rivalEntry.name}`);
    const remaining = turf.difference(rivalEntry.geojson, myEntry.geojson);
    rivalEntry.geojson = remaining || null;
    if (db) {
      if (rivalEntry.geojson) {
        db.ref(`territory_snapshot/${rivalUid}`).update({ geojson: JSON.stringify(rivalEntry.geojson), updatedAt: Date.now() });
      } else {
        db.ref(`territory_snapshot/${rivalUid}`).remove();
      }
    }
    if (window._twLocalCaptures) window._twLocalCaptures.add(rivalUid);
  } catch(e) { console.warn('Reconcile overlap error:', e); }
}

// ===== FIREBASE: LISTEN TO OTHER USERS =====
function listenToOtherUsers() {
  if (!db) return;
  const userStepsMap = {};
  const locallyCapture = new Set();
  window._twLocalCaptures = locallyCapture;

  db.ref('users').once('value').then(snap => {
    snap.forEach(child => { userStepsMap[child.key] = child.val().steps || 0; });
    db.ref('territory_snapshot').on('value', snapshots => {
      snapshots.forEach(child => {
        const uid = child.key;
        if (uid === state.userId) return;
        const data = child.val();
        if (!data || !data.geojson) return;
        try {
          const geojson = JSON.parse(data.geojson);
          const rivalSteps = userStepsMap[uid] || 0;
          if (!territoryStore[uid]) {
            territoryStore[uid] = { uid, name: data.name, color: data.color, geojson, layer: null, steps: rivalSteps };
            reconcileRivalOverlap(uid);
            redrawTerritory(uid);
          } else if (!locallyCapture.has(uid)) {
            territoryStore[uid].geojson = geojson;
            territoryStore[uid].steps = rivalSteps;
            territoryStore[uid].name = data.name;
            territoryStore[uid].color = data.color;
            redrawTerritory(uid);
          }
        } catch(e) { console.warn('Rival snapshot error:', e); }
      });
    });
  });

  db.ref('users').orderByChild('territory').limitToLast(20).on('value', snapshot => {
    const users = [];
    snapshot.forEach(child => users.push({ uid: child.key, ...child.val() }));
    users.reverse();
    users.forEach(u => {
      if (u.uid !== state.userId && territoryStore[u.uid]) {
        const newSteps = u.steps || 0;
        if (territoryStore[u.uid].steps !== newSteps) {
          territoryStore[u.uid].steps = newSteps;
          redrawTerritory(u.uid);
        }
      }
    });
    renderFirebaseLeaderboard(users);
  });

  db.ref('users').once('value', snapshot => {
    const allUsers = [];
    snapshot.forEach(child => allUsers.push({ uid: child.key, ...child.val() }));
    updateWalkersOnline(allUsers);
    renderTopTodayList(allUsers);
  });
  db.ref('users').on('child_changed', () => {
    db.ref('users').once('value', snapshot => {
      const allUsers = [];
      snapshot.forEach(child => allUsers.push({ uid: child.key, ...child.val() }));
      updateWalkersOnline(allUsers);
      renderTopTodayList(allUsers);
    });
  });
}

function renderFirebaseLeaderboard(users) {
  if (!state.user) return;
  const cityUsers = users.filter(u => u.city === state.user.city);
  renderLbList('localLb', cityUsers.map(u => ({ ...u, me: u.uid === state.userId })));
  renderLbList('globalLb', users.map(u => ({ ...u, me: u.uid === state.userId })));
}

// ===== WALKERS ONLINE TODAY =====
function updateWalkersOnline(users) {
  if (!db) return;
  const el = document.getElementById('walkersOnlineCount');
  if (!el) return;
  db.ref('users').once('value', snap => {
    let count = 0;
    snap.forEach(() => count++);
    el.textContent = Math.max(1, count);
  });
}

// ============================================================
// ===== DUMMY WALKERS — Deterministic per GPS grid cell =====
//
// How it works:
//   • The map is divided into a grid of ~330×330m cells
//     (DUMMY_GRID_DEG = 0.003°, roughly 330 m per degree at mid-latitudes).
//   • Every cell gets a stable integer "cellSeed" derived from its
//     grid coordinates. Any two users whose GPS falls in the same cell
//     compute the exact same cellSeed → identical dummy names, colors,
//     steps, polygon positions.
//   • The number of dummies per cell is 1–4, weighted toward 2–3,
//     also deterministic from the seed (so same cell always has same count).
//   • When the real user's GPS crosses into a new cell, the old dummy
//     polygons are removed and fresh ones are spawned for the new cell.
// ============================================================

// Grid resolution: 0.003° ≈ 330 m. Tune up for larger cells, down for smaller.
const DUMMY_GRID_DEG = 0.003;

// Large name pools for variety across the map
const DUMMY_FIRST_NAMES = [
  'Arjun','Priya','Karan','Neha','Rohit','Anjali','Vikram','Pooja',
  'Rahul','Sneha','Amit','Kavya','Nikhil','Divya','Sanjay','Meera',
  'Aditya','Ritika','Manish','Swati','Deepak','Nisha','Suresh','Ananya',
  'Harsh','Pallavi','Gaurav','Shreya','Vivek','Riya','Tarun','Simran',
  'Mohit','Preeti','Akash','Shweta','Varun','Kritika','Rohan','Ishita'
];
const DUMMY_LAST_NAMES = [
  'Mehta','Sharma','Nair','Gupta','Patel','Singh','Kumar','Iyer',
  'Verma','Reddy','Joshi','Rao','Agarwal','Bose','Malhotra','Chopra',
  'Pandey','Dubey','Shah','Mishra','Tiwari','Sinha','Kapoor','Banerjee',
  'Saxena','Pillai','Menon','Chatterjee','Bhatt','Kulkarni'
];

// ── Seeded pseudorandom (mulberry32) ─────────────────────────────────────────
// Always returns the same float in [0,1) for the same seed integer.
// This is the core of the determinism — no Math.random() used for seeded picks.
function seededRand(seed) {
  let t = (seed + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Pick an array item deterministically — offset makes each pick independent.
function seededPick(arr, seed, offset) {
  return arr[Math.floor(seededRand(seed + offset * 9973) * arr.length)];
}

// ── Cell key ─────────────────────────────────────────────────────────────────
// Converts lat/lng to a stable integer that uniquely identifies the grid cell.
function getCellKey(lat, lng) {
  const cellLat = Math.floor(lat / DUMMY_GRID_DEG);
  const cellLng = Math.floor(lng / DUMMY_GRID_DEG);
  return (cellLat * 180000 + cellLng) | 0; // prime factor reduces collisions
}

// ── Dummy count per cell (1–4, weighted toward 2–3) ─────────────────────────
// Distribution: 1→15%  2→35%  3→35%  4→15%
function getDummyCountForCell(cellSeed) {
  const r = seededRand(cellSeed + 77777);
  if (r < 0.15) return 1;
  if (r < 0.50) return 2;
  if (r < 0.85) return 3;
  return 4;
}

// ── Build dummy roster for a cell ────────────────────────────────────────────
// Every field (name, avatar, color, steps) is derived only from cellSeed + index,
// so two users in the same cell always see the same competitors.
function generateDummyWalkersForCell(cellSeed) {
  const count = getDummyCountForCell(cellSeed);
  const dummies = [];
  for (let i = 0; i < count; i++) {
    const s = cellSeed + i * 31337; // unique sub-seed per dummy in this cell
    const firstName    = seededPick(DUMMY_FIRST_NAMES, s, 1);
    const lastName     = seededPick(DUMMY_LAST_NAMES,  s, 2);
    const avatar       = seededPick(AVATAR_NAMES,       s, 3);
    const color        = seededPick(COLORS,             s, 4);
    const todaySteps   = 2500 + Math.floor(seededRand(s + 5) * 6000); // 2500–8500
    const todayDistance = parseFloat((todaySteps * 0.00078).toFixed(1));
    dummies.push({
      uid: `dummy_cell_${cellSeed}_${i}`,
      name: `${firstName} ${lastName}`,
      avatar, color, todaySteps, todayDistance,
    });
  }
  return dummies;
}

// Active dummies for the current cell — rebuilt when cell changes
let DUMMY_WALKERS = [];
let _lastDummyCellKey = null;

// ── Spawn polygons for the current GPS cell ───────────────────────────────────
function spawnDummyPolygons() {
  if (!state.currentLat) return;

  const cellKey = getCellKey(state.currentLat, state.currentLng);
  if (cellKey === _lastDummyCellKey) return; // still in same cell — nothing to do
  _lastDummyCellKey = cellKey;

  removeDummyPolygons(); // clear previous cell's dummies

  DUMMY_WALKERS = generateDummyWalkersForCell(cellKey);

  // Polygon offsets are seeded so they're stable and identical for all users in this cell
  const cs = cellKey;
  const baseOffsets = [
    [  0.002 + seededRand(cs +  1) * 0.003,  0.003 + seededRand(cs +  2) * 0.003 ],
    [ -0.003 - seededRand(cs +  3) * 0.002,  0.002 + seededRand(cs +  4) * 0.004 ],
    [  0.003 + seededRand(cs +  5) * 0.002, -0.002 - seededRand(cs +  6) * 0.003 ],
    [ -0.001 - seededRand(cs +  7) * 0.003, -0.003 - seededRand(cs +  8) * 0.002 ],
  ];

  DUMMY_WALKERS.forEach((d, i) => {
    const lat    = state.currentLat  + baseOffsets[i][0];
    const lng    = state.currentLng + baseOffsets[i][1];
    const radius = 70 + (d.todaySteps / 8500) * 130 + seededRand(cs + i * 7) * 30;
    makeDummyPolygon(lat, lng, radius, d.uid);
  });
}

// ── Called on every GPS tick — refreshes dummies only when cell boundary crossed
function checkDummyCellChange(lat, lng) {
  const cellKey = getCellKey(lat, lng);
  if (cellKey !== _lastDummyCellKey) spawnDummyPolygons();
}

// ── Draw a single dummy polygon on the map ────────────────────────────────────
// Polygon shape uses Math.random() for organic look — that's fine because the
// NAME/COLOR/STEPS are all seeded; only the exact vertex positions vary slightly.
function makeDummyPolygon(centerLat, centerLng, radiusMetres, uid) {
  if (!window.turf) return;
  if (territoryStore[uid] && territoryStore[uid].geojson) return; // already drawn

  const pts = 10 + Math.floor(Math.random() * 6); // 10–15 sides, organic shape
  const coords = [];
  const R = 6371000;
  for (let i = 0; i < pts; i++) {
    const angle = (i / pts) * 2 * Math.PI;
    const r = radiusMetres * (0.6 + Math.random() * 0.7);
    const dLat = (r * Math.cos(angle)) / R * (180 / Math.PI);
    const dLng = (r * Math.sin(angle)) / (R * Math.cos(centerLat * Math.PI / 180)) * (180 / Math.PI);
    coords.push([centerLng + dLng, centerLat + dLat]);
  }
  coords.push(coords[0]); // close ring

  try {
    const geojson = turf.polygon([coords]);
    const d = DUMMY_WALKERS.find(d => d.uid === uid);
    if (!d) return;
    territoryStore[uid] = { uid, name: d.name, color: d.color, geojson, layer: null, steps: d.todaySteps, zoneName: '' };
    redrawTerritory(uid);
  } catch(e) { console.warn('Dummy polygon error:', e); }
}

// ── Remove ALL dummy polygons (supports both old and new UID formats) ─────────
function removeDummyPolygons() {
  Object.keys(territoryStore).forEach(uid => {
    if (uid.startsWith('dummy_cell_') || uid.startsWith('dummy_')) {
      if (territoryStore[uid] && territoryStore[uid].layer) map.removeLayer(territoryStore[uid].layer);
      delete territoryStore[uid];
    }
  });
}

// ===== TOP 5 WALKERS TODAY =====
function renderTopTodayList(users) {
  const el = document.getElementById('topTodayList');
  if (!el) return;

  // Real walkers who have walked today (exclude self — they see themselves separately)
  const realRanked = users
    .filter(u => (u.todaySteps || 0) > 0)
    .sort((a, b) => (b.todaySteps || 0) - (a.todaySteps || 0))
    .slice(0, 5);

  // Dummies ALWAYS spawn — they are area-based competitors, not a fallback.
  // spawnDummyPolygons() is a no-op if the cell hasn't changed, so safe to call here.
  spawnDummyPolygons();

  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];

  if (!realRanked.length) {
    // No real walkers today — show only dummies in the leaderboard list
    el.innerHTML = DUMMY_WALKERS.map((u, i) => {
      const emoji = getAvatarEmoji(u.avatar);
      return `<div class="top-today-item">
        <div class="top-today-rank">${medals[i] || (i + 1)}</div>
        <div class="top-today-avatar" style="background:${u.color}33">${emoji}</div>
        <div class="top-today-info">
          <div class="top-today-name">${u.name}</div>
          <div class="top-today-steps">${formatNum(u.todaySteps)} steps</div>
        </div>
        <div class="top-today-dist">${u.todayDistance.toFixed(1)} km</div>
      </div>`;
    }).join('');
    return;
  }

  // Real walkers exist — show them in the list; dummies still show on the MAP
  el.innerHTML = realRanked.map((u, i) => {
    const isMe = u.uid === state.userId;
    const emoji = getAvatarEmoji(u.avatar || 'Person');
    const steps = formatNum(u.todaySteps || 0);
    const dist  = (u.todayDistance || 0).toFixed(1);
    return `<div class="top-today-item${isMe ? '" style="border-color:' + (u.color||'var(--accent)') + ';background:' + (u.color||'var(--accent)') + '11' : ''}">
      <div class="top-today-rank">${medals[i]}</div>
      <div class="top-today-avatar" style="background:${u.color||'#333'}33">${emoji}</div>
      <div class="top-today-info">
        <div class="top-today-name">${u.name}${isMe ? ' (You)' : ''}</div>
        <div class="top-today-steps">${steps} steps</div>
      </div>
      <div class="top-today-dist">${dist} km</div>
    </div>`;
  }).join('');
}

// ===== PROFILE SETUP =====
function buildProfileModal() {
  const avatarPicker = document.getElementById('avatarPicker');
  AVATAR_NAMES.forEach((name, i) => {
    const el = document.createElement('div');
    el.className = 'avatar-option' + (i === 0 ? ' selected' : '');
    el.dataset.avatar = name;
    const emoji = AVATARS_EMOJI[i] || '🧍';
    el.innerHTML = `<div style="font-size:28px;line-height:1.2;text-align:center">${emoji}</div><span class="av-label">${name}</span>`;
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
  const avatar = document.querySelector('.avatar-option.selected').dataset.avatar || AVATAR_NAMES[0];
  const color = document.querySelector('.color-option.selected').dataset.c;
  const cityEl = document.getElementById('citySelect');
  const city = (cityEl && cityEl.value) ? cityEl.value : CITIES[Math.floor(Math.random() * CITIES.length)];
  state.user = { name, avatar, color, city, bio: '', accessory: 'none', zoneName: '', walkGoal: 5000 };
  updateHeaderUI();
  document.getElementById('loginModal').classList.remove('open');
  initMap(() => {
    listenToOtherUsers();
    listenForNotifications();
    renderLeaderboards();
    startDecay();
    updateStats();
    checkAchievements();
    setTimeout(checkNotifPrompt, 2000);
  });
  saveUserToFirebase();
  showNotif('Welcome ' + name + '! Walk to claim your ground 🗺️');
}

// ===== PROFILE MENU =====
function toggleProfileMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('profileMenu');
  menu.classList.toggle('open');
  if (menu.classList.contains('open')) updateProfileMenu();
}
function closeProfileMenu() { document.getElementById('profileMenu').classList.remove('open'); }
document.addEventListener('click', e => {
  const menu = document.getElementById('profileMenu');
  const chip = document.getElementById('profileChip');
  if (menu && chip && !menu.contains(e.target) && !chip.contains(e.target)) closeProfileMenu();
});
function updateProfileMenu() {
  if (!state.user) return;
  document.getElementById('pmColorSwatch').style.background = state.user.color;
  document.getElementById('pmZoneName').textContent = state.user.zoneName || '';
  document.getElementById('pmWalkGoal').textContent = formatNum(state.user.walkGoal || 5000) + ' steps';
  document.getElementById('pmBio').textContent = state.user.bio || 'Tap to add your bio...';
  const prev = document.getElementById('pmAvatarPreview');
  if (prev) prev.textContent = getAvatarEmoji(state.user.avatar || 'Person');
}

// ===== EDIT NICKNAME =====
function openEditName() {
  closeProfileMenu();
  showMiniModal('✏️ Edit Nickname', `
    <input id="mmInput" type="text" maxlength="20" placeholder="Your nickname" value="${state.user.name}"/>
  `, () => {
    const val = document.getElementById('mmInput').value.trim();
    if (!val) return;
    state.user.name = val;
    saveUserToFirebase();
    updateHeaderUI();
    if (territoryStore[state.userId]) { territoryStore[state.userId].name = val; redrawTerritory(state.userId); }
    showNotif('Nickname updated! ✏️');
  });
  setTimeout(() => document.getElementById('mmInput')?.focus(), 100);
}

// ===== CHANGE AVATAR =====
function openChangeAvatar() {
  closeProfileMenu();
  const cur = state.user.avatar || 'Person';
  const grid = AVATAR_NAMES.map((name, i) => {
    const emoji = AVATARS_EMOJI[i];
    const isSel = name === cur;
    return `<div class="avatar-change-option${isSel ? ' selected' : ''}" onclick="selectAvatarChange('${name}', this)" title="${name}">
      <div style="font-size:26px;line-height:1.2">${emoji}</div>
      <div style="font-size:8px;color:var(--text-dim);margin-top:2px;text-align:center">${name}</div>
    </div>`;
  }).join('');
  showMiniModal('🐾 Change Avatar', `<div class="avatar-change-grid">${grid}</div>`, () => {
    const sel = document.querySelector('.avatar-change-option.selected');
    if (!sel) return;
    const newAvatar = sel.dataset.avatarName || sel.title || cur;
    state.user.avatar = newAvatar;
    saveUserToFirebase();
    updateHeaderUI();
    if (state.currentLat) placeUserMarker(state.currentLat, state.currentLng);
    showNotif('Avatar updated! ' + getAvatarEmoji(newAvatar));
  });
}
function selectAvatarChange(name, el) {
  document.querySelectorAll('.avatar-change-option').forEach(a => a.classList.remove('selected'));
  el.classList.add('selected');
  el.dataset.avatarName = name;
}

// ===== EDIT BIO =====
function openEditBio() {
  closeProfileMenu();
  showMiniModal('👤 Your Bio', `
    <textarea id="mmBio" maxlength="100" placeholder="Tell others about yourself...">${state.user.bio || ''}</textarea>
  `, () => {
    state.user.bio = document.getElementById('mmBio').value.trim();
    saveUserToFirebase();
    showNotif('Bio saved! 👤');
  });
}

// ===== COLOR PICKER =====
const PRESET_COLORS = ['#00e5a0','#ff4b6e','#4b9fff','#ffd700','#a855f7','#ff6b2b',
  '#00d4ff','#ff1493','#39ff14','#ff6ec7','#00ffff','#ff4500'];
function openColorPicker() {
  closeProfileMenu();
  const swatches = PRESET_COLORS.map(c =>
    `<div class="color-swatch${c===state.user.color?' selected':''}" style="background:${c}" data-hex="${c}" onclick="selectColor('${c}',this)"></div>`
  ).join('');
  showMiniModal('🎨 Territory Color', `
    <div class="color-grid">${swatches}</div>
    <div class="custom-color-row">
      <input type="color" id="mmCustomColor" value="${state.user.color}">
      <label>Or pick any custom color</label>
    </div>
  `, () => {
    const custom = document.getElementById('mmCustomColor').value;
    const selected = document.querySelector('.color-swatch.selected');
    const color = selected ? (selected.dataset.hex || custom) : custom;
    state.user.color = color;
    saveUserToFirebase();
    updateHeaderUI();
    if (territoryStore[state.userId]) { territoryStore[state.userId].color = color; redrawTerritory(state.userId); }
    showNotif('Territory color updated! 🎨');
  });
}
function selectColor(color, el) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('mmCustomColor').value = color;
}

// ===== ACCESSORIES =====
const ACCESSORIES = [
  {id:'none', emoji:'✖️', label:'None'}, {id:'cowboy', emoji:'🤠', label:'Cowboy'},
  {id:'crown', emoji:'👑', label:'Crown'}, {id:'tophat', emoji:'🎩', label:'Top Hat'},
  {id:'halo', emoji:'😇', label:'Halo'}, {id:'glasses', emoji:'🕶️', label:'Shades'},
  {id:'cap', emoji:'🧢', label:'Cap'}, {id:'santa', emoji:'🎅', label:'Santa'},
];
function openAccessories() {
  closeProfileMenu();
  const cur = state.user.accessory || 'none';
  const grid = ACCESSORIES.map(a =>
    `<div class="acc-option${a.id===cur?' selected':''}" onclick="selectAcc('${a.id}',this)">${a.emoji}<span>${a.label}</span></div>`
  ).join('');
  showMiniModal('🎩 Accessories', `<div class="acc-grid">${grid}</div>`, () => {
    const sel = document.querySelector('.acc-option.selected');
    if (sel) {
      state.user.accessory = sel.dataset.accId || ACCESSORIES.find(a => sel.textContent.includes(a.label))?.id || 'none';
      saveUserToFirebase();
      updateHeaderUI();
      showNotif('Accessory equipped! 🎩');
    }
  });
}
function selectAcc(id, el) {
  document.querySelectorAll('.acc-option').forEach(a => a.classList.remove('selected'));
  el.classList.add('selected');
  el.dataset.accId = id;
}

// ===== ZONE NAME =====
function openZoneName() {
  closeProfileMenu();
  showMiniModal('📍 Name Your Zone', `
    <input id="mmZone" type="text" maxlength="30" placeholder="e.g. The Neon District" value="${state.user.zoneName || ''}"/>
  `, () => {
    const val = document.getElementById('mmZone').value.trim();
    state.user.zoneName = val;
    saveUserToFirebase();
    if (territoryStore[state.userId]) redrawTerritory(state.userId);
    showNotif(val ? 'Zone named: ' + val + ' 📍' : 'Zone name cleared');
  });
  setTimeout(() => document.getElementById('mmZone')?.focus(), 100);
}

// ===== WALK GOAL =====
const GOAL_PRESETS = [3000, 5000, 8000, 10000, 15000, 20000];
function openWalkGoal() {
  closeProfileMenu();
  const cur = state.user.walkGoal || 5000;
  const opts = GOAL_PRESETS.map(g =>
    `<div class="goal-option${g===cur?' selected':''}" onclick="selectGoal(${g},this)">${g.toLocaleString()}</div>`
  ).join('');
  showMiniModal('🎯 Daily Walk Goal', `
    <div class="goal-options">${opts}</div>
    <input id="mmGoalCustom" type="number" min="500" max="50000" placeholder="Or type custom steps" style="margin-top:4px"/>
  `, () => {
    const sel = document.querySelector('.goal-option.selected');
    const custom = parseInt(document.getElementById('mmGoalCustom').value);
    const goal = custom > 0 ? custom : (sel ? parseInt(sel.textContent.replace(/,/g,'')) : 5000);
    state.user.walkGoal = goal;
    saveUserToFirebase();
    updateProfileMenu();
    showNotif('Goal set: ' + goal.toLocaleString() + ' steps 🎯');
  });
}
function selectGoal(val, el) {
  document.querySelectorAll('.goal-option').forEach(g => g.classList.remove('selected'));
  el.classList.add('selected');
}

// ===== MINI MODAL HELPER =====
function showMiniModal(title, bodyHtml, onSave) {
  const existing = document.getElementById('miniModalOverlay');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'mini-modal-overlay';
  el.id = 'miniModalOverlay';
  el.innerHTML = `
    <div class="mini-modal">
      <h3>${title}</h3>
      ${bodyHtml}
      <div class="mini-modal-btns">
        <button class="btn-cancel" onclick="closeMiniModal()">Cancel</button>
        <button class="btn-save" onclick="saveMiniModal()">Save</button>
      </div>
    </div>`;
  el.addEventListener('click', e => { if (e.target === el) closeMiniModal(); });
  document.body.appendChild(el);
  el._onSave = onSave;
}
function closeMiniModal() { const el = document.getElementById('miniModalOverlay'); if (el) el.remove(); }
function saveMiniModal() {
  const el = document.getElementById('miniModalOverlay');
  if (el && el._onSave) el._onSave();
  closeMiniModal();
}

// ===== SHARE / INVITE =====
function shareApp() {
  closeProfileMenu();
  const url   = 'https://terrawalk.vercel.app';
  const title = 'TerraWalk — Claim the streets!';
  const text  = `I'm playing TerraWalk — walk around your city to claim territory and battle rivals for turf. Join me! 🗺️⚔️`;
  if (navigator.share) {
    navigator.share({ title, text, url }).then(() => showNotif('Thanks for sharing! 🙌')).catch(() => {});
    return;
  }
  navigator.clipboard.writeText(url).then(() => showShareModal(url, text)).catch(() => showShareModal(url, text));
}

function showShareModal(url, text) {
  const encoded = encodeURIComponent(text + ' ' + url);
  const waLink  = `https://wa.me/?text=${encoded}`;
  const tgLink  = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const twLink  = `https://twitter.com/intent/tweet?text=${encoded}`;
  const existing = document.getElementById('miniModalOverlay');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'mini-modal-overlay'; el.id = 'miniModalOverlay';
  el.innerHTML = `
    <div class="mini-modal">
      <h3>🔗 Invite Friends</h3>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
        <a href="${waLink}" target="_blank" class="share-btn share-wa" onclick="closeMiniModal()"><span>💬</span> Share on WhatsApp</a>
        <a href="${tgLink}" target="_blank" class="share-btn share-tg" onclick="closeMiniModal()"><span>✈️</span> Share on Telegram</a>
        <a href="${twLink}" target="_blank" class="share-btn share-tw" onclick="closeMiniModal()"><span>🐦</span> Share on Twitter / X</a>
        <div class="share-link-row">
          <span class="share-link-text">${url}</span>
          <button class="share-copy-btn" onclick="copyShareLink('${url}', this)">Copy</button>
        </div>
      </div>
      <button class="btn-cancel" style="width:100%" onclick="closeMiniModal()">Done</button>
    </div>`;
  el.addEventListener('click', e => { if (e.target === el) closeMiniModal(); });
  document.body.appendChild(el);
}

function copyShareLink(url, btn) {
  navigator.clipboard.writeText(url).then(() => {
    btn.textContent = 'Copied!';
    btn.style.background = 'var(--accent)'; btn.style.color = '#000';
    setTimeout(() => { btn.textContent = 'Copy'; btn.style.background = ''; btn.style.color = ''; }, 2000);
  });
}

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem('tw_uid'); localStorage.removeItem('tw_phone'); localStorage.removeItem('tw_user');
  if (state.userId) localStorage.removeItem('tw_geojson_' + state.userId);
  if (gpsWatcher) { navigator.geolocation.clearWatch(gpsWatcher); gpsWatcher = null; }
  if (walkInterval) { clearInterval(walkInterval); walkInterval = null; }
  if (decayInterval) { clearInterval(decayInterval); decayInterval = null; }
  window.location.reload();
}

function updateHeaderUI() {
  const acc = state.user.accessory && state.user.accessory !== 'none'
    ? ACCESSORIES.find(a => a.id === state.user.accessory)?.emoji || '' : '';
  const avatarEmoji = getAvatarEmoji(state.user.avatar || 'Person');
  const avatarEl = document.getElementById('headerAvatar');
  avatarEl.innerHTML = acc || avatarEmoji;
  avatarEl.style.background = state.user.color + '33';
  avatarEl.style.border = '2px solid ' + state.user.color;
  avatarEl.style.fontSize = '14px';
  document.getElementById('headerName').textContent = state.user.name;
}

function persistState() {
  if (state.userId && territoryStore[state.userId] && territoryStore[state.userId].geojson) {
    try { localStorage.setItem('tw_geojson_' + state.userId, JSON.stringify(territoryStore[state.userId].geojson)); }
    catch(e) {}
  }
}

// ===== MAP INIT =====
function initMap(onReady) {
  map = L.map('map', { zoomControl: true, attributionControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
  setTimeout(() => { map.invalidateSize(); }, 300);
  updateGpsStatus('searching', 'Searching for GPS signal...');
  map.on('zoomend', () => { if (state.currentLat) placeUserMarker(state.currentLat, state.currentLng); });
  startAutoWalkGPS();
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      state.currentLat = lat; state.currentLng = lng; state.gpsLocked = true;
      map.setView([lat, lng], 17);
      placeUserMarker(lat, lng);
      updateGpsStatus('locked', 'GPS Locked ✓');
      showNotif('📍 GPS locked! Walk to claim territory 🚶');
      if (onReady) onReady();
      setTimeout(spawnDummyPolygons, 2000);
    },
    err => {
      updateGpsStatus('searching', 'Allow location access for GPS tracking');
      map.setView([20.5937, 78.9629], 5);
      showNotif('📍 Please allow location access so we can track your walk');
      if (onReady) onReady();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function updateGpsStatus(status, text) {
  const dot = document.getElementById('gpsDot');
  const label = document.getElementById('gpsLabel');
  dot.className = 'gps-dot ' + status;
  label.textContent = text;
}

function getAvatarEmoji(avatarName) {
  const idx = AVATAR_NAMES.indexOf(avatarName);
  return idx >= 0 ? AVATARS_EMOJI[idx] : '🧍';
}

(function ensureWalkKeyframes() {
  if (document.getElementById('tw-walk-keyframes')) return;
  const s = document.createElement('style');
  s.id = 'tw-walk-keyframes';
  s.textContent = `
    @keyframes twWalk {
      0%   { transform: translateY(0px)   rotate(-4deg) scaleY(1);   }
      15%  { transform: translateY(-5px)  rotate(0deg)  scaleY(1.04); }
      30%  { transform: translateY(-2px)  rotate(4deg)  scaleY(1);   }
      45%  { transform: translateY(0px)   rotate(0deg)  scaleY(0.97); }
      50%  { transform: translateY(0px)   rotate(-4deg) scaleY(1);   }
      65%  { transform: translateY(-5px)  rotate(0deg)  scaleY(1.04); }
      80%  { transform: translateY(-2px)  rotate(4deg)  scaleY(1);   }
      95%  { transform: translateY(0px)   rotate(0deg)  scaleY(0.97); }
      100% { transform: translateY(0px)   rotate(-4deg) scaleY(1);   }
    }
    @keyframes twShadowPulse {
      0%,100% { transform: scaleX(1);   opacity: 0.35; }
      50%      { transform: scaleX(0.7); opacity: 0.15; }
    }
    @keyframes twWalkIdle {
      0%,100% { transform: translateY(0px); }
      50%      { transform: translateY(-1px); }
    }
    .tw-walking-body { animation: twWalk 0.5s ease-in-out infinite !important; transform-origin: bottom center; }
    .tw-shadow-pulse  { animation: twShadowPulse 0.5s ease-in-out infinite !important; }
    .tw-idle-body     { animation: twWalkIdle 2s ease-in-out infinite; transform-origin: bottom center; }
    @keyframes mapTagFade {
      0%   { opacity:0; transform:translateY(0px); }
      15%  { opacity:1; transform:translateY(-8px); }
      70%  { opacity:1; transform:translateY(-16px); }
      100% { opacity:0; transform:translateY(-24px); }
    }
  `;
  document.head.appendChild(s);
})();

function getZoomAvatarSize() {
  const zoom = map ? map.getZoom() : 17;
  if (zoom <= 13) return 18; if (zoom <= 14) return 22; if (zoom <= 15) return 28;
  if (zoom <= 16) return 34; if (zoom <= 17) return 40; if (zoom <= 18) return 46;
  return 52;
}

function placeUserMarker(lat, lng) {
  const name      = state.user ? state.user.name : 'You';
  const isWalking = state.walking || demoRunning;
  const emoji     = getAvatarEmoji(state.user ? state.user.avatar : 'Person');
  const sz        = getZoomAvatarSize();
  const fontSize  = Math.round(sz * 0.82);
  const facingLeft  = currentHeading > 90 && currentHeading < 270;
  const flipX       = facingLeft ? 'scaleX(-1)' : 'scaleX(1)';
  const avatarClass  = isWalking ? 'tw-walking-body' : 'tw-idle-body';
  const shadowClass  = isWalking ? 'tw-shadow-pulse'  : '';
  const shadowOpacity = isWalking ? 0.35 : 0.2;
  const shadowW      = Math.round(sz * 0.7);
  const shadowH      = Math.round(sz * 0.18);
  const zoom = map ? map.getZoom() : 17;
  const nameLabel = zoom >= 15
    ? `<div style="background:rgba(0,0,0,0.85);color:white;font-size:${Math.max(7,Math.round(sz/5))}px;font-weight:700;padding:1px 6px;border-radius:5px;white-space:nowrap;max-width:${sz*2}px;overflow:hidden;text-overflow:ellipsis;border:1px solid ${state.user.color};margin-top:2px;letter-spacing:0.3px">${name}</div>`
    : '';
  const speedDots = isWalking
    ? `<div style="display:flex;gap:2px;margin-bottom:1px;opacity:0.7">
        <div style="width:3px;height:3px;border-radius:50%;background:${state.user.color};animation:twWalkIdle 0.5s 0s infinite"></div>
        <div style="width:3px;height:3px;border-radius:50%;background:${state.user.color};animation:twWalkIdle 0.5s 0.17s infinite"></div>
        <div style="width:3px;height:3px;border-radius:50%;background:${state.user.color};animation:twWalkIdle 0.5s 0.33s infinite"></div>
       </div>`
    : '';
  const icon = L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 0 5px ${state.user.color})">
      ${speedDots}
      <div class="${avatarClass}" style="font-size:${fontSize}px;line-height:1;display:inline-block;transform-origin:bottom center">
        <span style="display:inline-block;transform:${flipX}">${emoji}</span>
      </div>
      <div class="${shadowClass}" style="width:${shadowW}px;height:${shadowH}px;background:radial-gradient(ellipse,rgba(0,0,0,0.5) 0%,transparent 70%);border-radius:50%;margin-top:-2px;opacity:${shadowOpacity}"></div>
      ${nameLabel}
    </div>`,
    iconSize: [sz * 1.6, sz + 28], iconAnchor: [sz * 0.8, sz + 20], className: ''
  });
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.marker([lat, lng], { icon }).addTo(map);
}

// ===== AUTO-WALK DETECTION =====
const WALK_SPEED_MIN = 0.3;
const WALK_SPEED_MAX = 6.0;
const WALK_DIST_MIN  = 0.8;
const STILL_TIMEOUT  = 30000;
let stillTimer = null;
let lastGPSLat = null, lastGPSLng = null;

function isVehicleSpeed(speed) { return speed > WALK_SPEED_MAX; }

function gpsDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function startAutoWalkGPS() {
  if (gpsWatcher) return;
  gpsWatcher = navigator.geolocation.watchPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const speed = pos.coords.speed || 0;

      if (state.currentLat !== null && state.currentLng !== null) {
        const dLng = lng - state.currentLng;
        const dLat = lat - state.currentLat;
        if (Math.abs(dLat) > 0.000005 || Math.abs(dLng) > 0.000005) {
          const angle = Math.atan2(dLng, dLat) * 180 / Math.PI;
          currentHeading = (angle + 360) % 360;
        }
      }
      state.currentLat = lat;
      state.currentLng = lng;

      // Update marker position
      if (state.user) placeUserMarker(lat, lng);
      // Check if user crossed into a new grid cell — refreshes dummy competitors
      checkDummyCellChange(lat, lng);
      // Pan map only while walking
      if (map && state.walking) map.panTo([lat, lng]);

      const distMoved = (lastGPSLat !== null) ? gpsDistance(lastGPSLat, lastGPSLng, lat, lng) : 0;
      lastGPSLat = lat; lastGPSLng = lng;

      if (isVehicleSpeed(speed) && distMoved > 20) {
        if (state.walking) { stopWalk(); showNotif('🚗 Vehicle detected — walk tracking paused'); }
        document.getElementById('statusBadge').textContent = '🚗 IN VEHICLE';
        return;
      }

      const isWalkingNow = (speed >= WALK_SPEED_MIN && distMoved >= 1.5)
                        || (speed >= 0.5 && distMoved >= 2.0);

      if (isWalkingNow) {
        if (stillTimer) { clearTimeout(stillTimer); stillTimer = null; }
        if (!state.walking) startWalk(true);
        addWalkPoint(lat, lng);
        const newSteps = estimateSteps(distMoved);
        const newDist  = distMoved / 1000;
        state.steps += newSteps; state.distance += newDist;
        state.todaySteps += newSteps; state.todayDistance += newDist;
        state.sessionSteps += newSteps; state.sessionDist += newDist;
        updateStats();
      } else if (state.walking) {
        if (!stillTimer) {
          stillTimer = setTimeout(() => { stopWalk(); stillTimer = null; }, STILL_TIMEOUT);
        }
      }
    },
    err => console.warn('GPS error:', err),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
  );
}

function toggleWalk() { state.walking ? stopWalk() : startWalk(false); }

function startWalk(auto = false) {
  state.walking = true;
  state.walkPath = []; state.sessionGain = 0; state.sessionDist = 0; state.sessionSteps = 0;
  markWalkedToday();
  document.getElementById('walkBtn').textContent = '⏹ STOP WALK';
  document.getElementById('walkBtn').classList.add('active');
  document.getElementById('walkingHud').classList.add('visible');
  document.getElementById('statusBadge').textContent = '🔴 WALKING';
  const fab = document.getElementById('stopWalkFab');
  if (fab) fab.style.display = 'block';
  if (state.currentLat) placeUserMarker(state.currentLat, state.currentLng);
  if (!auto) showNotif('Walk started! Every step counts — indoors or outdoors 🚶');
  else showNotif('🚶 Walking detected! Claiming territory...');
}

function stopWalk() {
  state.walking = false;
  state.lastActivity = Date.now();
  state.health = Math.min(100, state.health + 20);

  if (demoRunning) {
    clearInterval(demoInterval); demoInterval = null; demoRunning = false;
    const btn = document.getElementById('devDemoBtn');
    if (btn) btn.textContent = '🚶 Demo Walk';
  }

  if (stillTimer) { clearTimeout(stillTimer); stillTimer = null; }
  if (walkInterval) clearInterval(walkInterval);
  try {
    if (state.walkPath.length > 2) { closeTerritory(); }
  } catch(e) { console.warn('closeTerritory error:', e); state.sessionGain = 0; }
  state.walkPath = [];
  if (currentPolyline) { try { map.removeLayer(currentPolyline); } catch(_){} currentPolyline = null; }

  document.getElementById('walkBtn').textContent = '▶ START WALK';
  document.getElementById('walkBtn').classList.remove('active');
  document.getElementById('walkingHud').classList.remove('visible');
  document.getElementById('statusBadge').textContent = '🟢 READY';
  const fab = document.getElementById('stopWalkFab');
  if (fab) fab.style.display = 'none';
  if (state.currentLat) placeUserMarker(state.currentLat, state.currentLng);

  updateStats(); checkAchievements(); persistState(); saveUserToFirebase(); saveMergedTerritoryToFirebase();
  const gained = state.sessionGain;
  state.sessionGain = 0; state.sessionDist = 0; state.sessionSteps = 0;
  if (gained > 0) showNotif(`Walk done! +${gained} m² claimed 🎉`);
  else showNotif('Walk stopped. Keep walking to claim territory! 🗺️');
}

function estimateSteps(distMetres) {
  if (!distMetres || distMetres <= 0) return 0;
  return Math.max(1, Math.floor(distMetres / 0.80));
}

function addWalkPoint(lat, lng) {
  state.walkPath.push([lat, lng]);
  if (currentPolyline) map.removeLayer(currentPolyline);
  currentPolyline = L.polyline(state.walkPath, {
    color: state.user.color, weight: 1, opacity: 0.5, dashArray: '3,8'
  }).addTo(map);
}

// ===== TERRITORY STORE =====
let territoryStore = {};

// ===== TURF HELPERS =====
function pathToGeoJSON(path) {
  const coords = path.map(p => [p[1], p[0]]);
  if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) {
    coords.push(coords[0]);
  }
  return turf.polygon([coords]);
}

function geojsonToLeaflet(geojson) {
  const geometry = geojson.geometry || geojson;
  if (!geometry || !geometry.type) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates[0].map(c => [c[1], c[0]])];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.map(poly => poly[0].map(c => [c[1], c[0]]));
  return [];
}

function redrawTerritory(uid) {
  const entry = territoryStore[uid];
  if (!entry) return;
  if (uid === state.userId && state.user) entry.zoneName = state.user.zoneName || '';
  if (entry.layer) { map.removeLayer(entry.layer); entry.layer = null; }
  if (!entry.geojson) return;

  const isMe = uid === state.userId;
  const paths = geojsonToLeaflet(entry.geojson);
  if (!paths.length) return;

  const totalAreaM2 = Math.floor(turf.area(entry.geojson));
  const areaLabel = totalAreaM2 >= 1000000
    ? (totalAreaM2 / 1000000).toFixed(2) + ' km²' : totalAreaM2 + ' m²';

  const polyLayers = paths.map(path =>
    L.polygon(path, {
      color: entry.color, fillColor: entry.color,
      fillOpacity: isMe ? 0.45 : 0.25, weight: isMe ? 3 : 1.5, smoothFactor: 1
    })
  );

  const stepsCount = isMe ? state.steps : (entry.steps || 0);
  const textColor = entry.color;

  // ONE label only — at the largest polygon fragment, avoids name repeating for MultiPolygon
  let largestPath = paths[0];
  if (paths.length > 1) {
    let largestArea = 0;
    paths.forEach(path => {
      try {
        const coords = path.map(c => [c[1], c[0]]);
        coords.push(coords[0]);
        const a = turf.area(turf.polygon([coords]));
        if (a > largestArea) { largestArea = a; largestPath = path; }
      } catch(e) {}
    });
  }
  const labelCenter = L.polygon(largestPath).getBounds().getCenter();
  const singleLabelIcon = L.divIcon({
    html: `<div style="pointer-events:none;text-align:center;line-height:1.6;white-space:nowrap;transform:translate(-50%, -50%);text-shadow: 0 0 8px ${entry.color}, 0 0 2px rgba(0,0,0,0.9);">
        <div style="font-size:12px;font-weight:900;color:${textColor};letter-spacing:0.3px">${entry.name}${entry.zoneName ? ' · <span style=\'font-size:9px;font-weight:500\'>' + entry.zoneName + '</span>' : ''}</div>
        <div style="font-size:10px;font-weight:700;color:${textColor}">${areaLabel}</div>
        <div style="font-size:9px;font-weight:600;color:${textColor}">${stepsCount.toLocaleString()} steps</div>
      </div>`,
    className: '', iconAnchor: [0, 0]
  });
  const singleLabel = L.marker(labelCenter, { icon: singleLabelIcon, interactive: false });

  entry.layer = L.layerGroup([...polyLayers, singleLabel]).addTo(map);
}

// ===== CLOSE TERRITORY =====
function closeTerritory() {
  if (state.walkPath.length < 3) return;
  const newPath = [...state.walkPath];
  const uid = state.userId;
  let newGeoJSON;
  try { newGeoJSON = pathToGeoJSON(newPath); }
  catch(e) { console.warn('Invalid polygon', e); return; }

  if (!territoryStore[uid]) {
    territoryStore[uid] = { uid, name: state.user.name, color: state.user.color, geojson: null, layer: null };
  }

  let capturedThisWalk = 0;
  Object.keys(territoryStore).forEach(rivalUid => {
    if (rivalUid === uid) return;
    const rival = territoryStore[rivalUid];
    if (!rival.geojson) return;
    try {
      const intersection = turf.intersect(newGeoJSON, rival.geojson);
      if (!intersection) return;
      const capturedM2 = Math.floor(turf.area(intersection));
      if (capturedM2 < 10) return;
      const remaining = turf.difference(rival.geojson, newGeoJSON);
      rival.geojson = remaining || null;
      redrawTerritory(rivalUid);
      capturedThisWalk += capturedM2;
      state.territory += capturedM2; state.todayTerritory += capturedM2;
      state.sessionGain += capturedM2; state.captures++; state.todayCaptures++;
      showNotif(`⚔️ Captured ${capturedM2} m² from ${rival.name}!`);
      notifyRivalCapture(rivalUid, state.user.name, capturedM2);
      if (window._twLocalCaptures) window._twLocalCaptures.add(rivalUid);
      if (db) {
        if (rival.geojson) {
          db.ref(`territory_snapshot/${rivalUid}`).update({ geojson: JSON.stringify(rival.geojson), updatedAt: Date.now() });
        } else {
          db.ref(`territory_snapshot/${rivalUid}`).remove();
        }
      }
    } catch(e) { console.warn('Capture error:', e); }
  });

  try {
    if (territoryStore[uid].geojson) {
      const merged = turf.union(territoryStore[uid].geojson, newGeoJSON);
      territoryStore[uid].geojson = merged || newGeoJSON;
    } else {
      territoryStore[uid].geojson = newGeoJSON;
    }
  } catch(e) { territoryStore[uid].geojson = newGeoJSON; }

  const rawArea  = Math.floor(turf.area(newGeoJSON));
  const newArea  = Math.max(0, rawArea - capturedThisWalk);
  state.territory += newArea; state.todayTerritory += newArea; state.sessionGain += newArea;

  redrawTerritory(uid);
  persistTerritoryStore(uid);
  saveTerritoryToFirebase(newPath);
  saveMergedTerritoryToFirebase();

  if (currentPolyline) { map.removeLayer(currentPolyline); currentPolyline = null; }

  const flash = document.getElementById('captureFlash');
  flash.classList.add('flash');
  setTimeout(() => flash.classList.remove('flash'), 300);

  const safe = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  safe('hudSteps', state.sessionSteps.toLocaleString());
  safe('hudDist',  formatSessionDist(state.sessionDist));
  updateStats();

  if (state.currentLat && newArea > 0) {
    showMapTag(state.currentLat, state.currentLng, `+${newArea} m² 🗺️`, state.user.color);
  }
}

function showMapTag(lat, lng, text, color) {
  const tagIcon = L.divIcon({
    html: `<div style="background:rgba(0,0,0,0.82);color:${color};border:1px solid ${color};border-radius:20px;padding:4px 10px;font-size:12px;font-weight:800;white-space:nowrap;pointer-events:none;animation:mapTagFade 2.2s ease forwards;text-shadow:0 0 6px ${color};font-family:var(--font-body);">${text}</div>`,
    className: '', iconAnchor: [0, 0]
  });
  const marker = L.marker([lat, lng], { icon: tagIcon, interactive: false }).addTo(map);
  setTimeout(() => { try { map.removeLayer(marker); } catch(_) {} }, 2300);
}

function persistTerritoryStore(uid) {
  try {
    const entry = territoryStore[uid];
    if (entry && entry.geojson) localStorage.setItem('tw_geojson_' + uid, JSON.stringify(entry.geojson));
  } catch(e) {}
}

// ===== DECAY =====
function startDecay() {
  decayInterval = setInterval(() => {
    if (state.walking) return;
    const inactiveMins = (Date.now() - state.lastActivity) / 60000;
    if (inactiveMins > 1) { state.health = Math.max(0, state.health - 0.1); persistState(); }
  }, 10000);
}

function formatSessionDist(km) {
  if (km < 1) return Math.round(km * 1000) + ' m';
  return km.toFixed(2) + ' km';
}

// ===== STATS =====
function updateStats() {
  const today = new Date().toDateString();
  if (state.todayDate !== today) {
    state.todayDate = today;
    state.todayTerritory = 0; state.todaySteps = 0; state.todayDistance = 0; state.todayCaptures = 0;
  }
  const safe = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  safe('statTerritory', formatNum(state.territory));
  safe('statSteps', formatNum(state.steps));
  safe('statDist', state.distance.toFixed(1));
  safe('statTodayTerritory', formatNum(state.todayTerritory));
  safe('statTodaySteps', formatNum(state.todaySteps));
  safe('statTodayDist', state.todayDistance.toFixed(1));
  safe('hudSteps', state.sessionSteps.toLocaleString());
  safe('hudDist',  formatSessionDist(state.sessionDist));
}

function formatNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return n.toString();
}

// ===== LEADERBOARD =====
function renderLeaderboards() {
  if (db) { return; }
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
function toggleAchievements() { document.getElementById('achievementsPanel').classList.toggle('open'); }
document.addEventListener('click', e => {
  const panel = document.getElementById('achievementsPanel');
  const btn   = document.getElementById('achievementsOverlay');
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) panel.classList.remove('open');
});

function checkAchievements() {
  const all = [
    { icon: '👟', label: '100 Steps!',       cond: state.steps >= 100 },
    { icon: '🗺️', label: 'Explorer',          cond: state.territory >= 500 },
    { icon: '⚔️', label: 'First Capture',     cond: state.captures >= 1 },
    { icon: '🏃', label: '0.5km Walker',      cond: state.distance >= 0.5 },
    { icon: '🔥', label: '1km Warrior',       cond: state.distance >= 1 },
    { icon: '👑', label: 'Territory King',    cond: state.territory >= 5000 },
    { icon: '💪', label: '10k Steps',         cond: state.steps >= 10000 },
    { icon: '🌍', label: '5km Legend',        cond: state.distance >= 5 },
  ];
  const earned = all.filter(a => a.cond);
  const badge = document.getElementById('achieveCount');
  if (badge) badge.textContent = earned.length;
  const el = document.getElementById('achievementsList');
  if (!el) return;
  el.innerHTML = earned.length
    ? earned.map(a => `<div style="display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:12px;margin-bottom:4px"><span style="font-size:15px">${a.icon}</span><span>${a.label}</span></div>`).join('')
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
let _notifQueue = [];
let _notifShowing = false;
function showNotif(msg) {
  _notifQueue.push(msg);
  if (!_notifShowing) _drainNotifQueue();
}
function _drainNotifQueue() {
  if (!_notifQueue.length) { _notifShowing = false; return; }
  _notifShowing = true;
  const el = document.getElementById('notif');
  el.textContent = _notifQueue.shift();
  el.classList.add('show');
  setTimeout(() => { el.classList.remove('show'); setTimeout(_drainNotifQueue, 300); }, 2800);
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
function dismissInstall() { document.getElementById('installBanner').classList.remove('show'); }

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW registration failed:', e));
}

// ===== NOTIFICATION PROMPT =====
function checkNotifPrompt() {
  if (!('Notification' in window)) return;
  const prompt = document.getElementById('notifPrompt');
  if (!prompt) return;
  if (Notification.permission === 'granted') { prompt.style.display = 'none'; return; }
  if (Notification.permission === 'denied') { prompt.style.display = 'none'; return; }
  const dismissedAt = localStorage.getItem('tw_notif_dismissed');
  if (dismissedAt) {
    const hoursSince = (Date.now() - parseInt(dismissedAt)) / 3600000;
    if (hoursSince < 24) { prompt.style.display = 'none'; return; }
  }
  prompt.style.display = 'flex';
}

async function promptEnableNotifications() {
  const prompt = document.getElementById('notifPrompt');
  if (prompt) prompt.style.display = 'none';
  await initNotifications();
  if (Notification.permission === 'granted') showNotif('🔔 Notifications on! Rivals will not catch you off guard.');
  else showNotif('Notifications blocked. Enable in browser settings to get alerts.');
}

function dismissNotifPrompt() {
  const prompt = document.getElementById('notifPrompt');
  if (prompt) prompt.style.display = 'none';
  localStorage.setItem('tw_notif_dismissed', Date.now().toString());
}

// ===== PUSH NOTIFICATIONS =====
let messaging = null;
async function initNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (typeof firebase === 'undefined' || !firebase.messaging) return;
  if (VAPID_KEY === 'PASTE_YOUR_VAPID_KEY_HERE') return;
  try {
    messaging = firebase.messaging();
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { console.log('Notification permission denied'); return; }
    const token = await messaging.getToken({ vapidKey: VAPID_KEY });
    if (token && state.userId && db) {
      db.ref(`fcm_tokens/${state.userId}`).set({ token, updatedAt: Date.now(), name: state.user?.name || '' });
      localStorage.setItem('tw_fcm_token', token);
    }
    messaging.onMessage(payload => {
      const { title, body } = payload.notification || {};
      showNotif(`🔔 ${body || title}`);
    });
    registerDailyReminder();
  } catch(e) { console.warn('Notification init failed:', e); }
}

async function registerDailyReminder() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in reg) {
      await reg.periodicSync.register('tw-daily-reminder', { minInterval: 12 * 60 * 60 * 1000 });
    } else { scheduleInAppReminder(); }
  } catch(e) { scheduleInAppReminder(); }
}

function scheduleInAppReminder() {
  const now = new Date();
  const hour = now.getHours();
  let next = new Date(now);
  if (hour < 8) next.setHours(8, 0, 0, 0);
  else if (hour < 18) next.setHours(18, 0, 0, 0);
  else { next.setDate(next.getDate() + 1); next.setHours(8, 0, 0, 0); }
  setTimeout(() => {
    if ((state.todaySteps || 0) < 100) {
      sendLocalNotification('TerraWalk 🗺️', "You haven't walked today — your territory is waiting! 🚶", 'tw-daily');
    }
    scheduleInAppReminder();
  }, next.getTime() - now.getTime());
}

async function sendLocalNotification(title, body, tag = 'tw-notif') {
  try {
    if (Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(title, {
      body, icon: '/icons/icon-192.png', badge: '/icons/icon-72.png',
      tag, renotify: true, vibrate: [200, 100, 200], data: { url: '/' }
    });
  } catch(e) { console.warn('Local notification failed:', e); }
}

async function notifyRivalCapture(victimUid, attackerName, capturedM2) {
  if (!db) return;
  db.ref(`notifications/${victimUid}`).push({
    type: 'capture', title: 'Territory Under Attack! ⚔️',
    body: `${attackerName} captured ${capturedM2} m² of your territory!`,
    createdAt: Date.now(), read: false
  });
}

function listenForNotifications() {
  if (!db || !state.userId) return;
  const sessionStart = Date.now();
  db.ref(`notifications/${state.userId}`)
    .orderByChild('createdAt').startAt(sessionStart - 5000)
    .on('child_added', snap => {
      const n = snap.val();
      if (!n || n.read) return;
      if (n.createdAt < sessionStart - 5000) { snap.ref.update({ read: true }); return; }
      if (Notification.permission === 'granted') sendLocalNotification(n.title, n.body, 'tw-capture-' + snap.key);
      else showNotif(`⚔️ ${n.body}`);
      snap.ref.update({ read: true });
    });
}

async function markWalkedToday() {
  try {
    const req = indexedDB.open('terrawalk-sw', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    req.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(new Date().toDateString(), 'walkedToday');
    };
  } catch(_) {}
}

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
  buildProfileModal();
  initFirebase();
  setTimeout(initRecaptcha, 500);

  const storedVersion = localStorage.getItem('tw_version');
  if (storedVersion !== APP_VERSION) {
    localStorage.clear();
    localStorage.setItem('tw_version', APP_VERSION);
    try {
      const req = indexedDB.open('terrawalk-sw', 1);
      req.onsuccess = e => {
        try { e.target.result.transaction('kv','readwrite').objectStore('kv').delete('walkedToday'); } catch(_){}
      };
    } catch(_) {}
    document.getElementById('loginModal').classList.add('open');
    showNotif('App updated! Please log in again 🔄');
    return;
  }

  const savedUid = localStorage.getItem('tw_uid');
  const savedPhone = localStorage.getItem('tw_phone');
  if (savedUid && savedPhone) {
    currentPhone = savedPhone;
    state.userId = savedUid;
    loadUserFromFirebase(savedUid);
  }
});
