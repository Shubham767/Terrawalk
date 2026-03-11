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

// ===== APP VERSION =====
// Bump this number every time you deploy new changes
// App will auto-clear cache and force fresh login when version changes
const APP_VERSION = '1.5';

// ===== CONSTANTS =====
const AVATARS = [
  '🤠','🦸','🕵️','👩‍💼','👨‍🚀',  // human: cowboy, superhero, detective, corporate, astronaut
  '👦','🧙','🥷','👩‍🔬','🤴',       // human: kid, wizard, ninja, scientist, prince
  '🐺','🦊','🐻','🦁','🐯',         // animals: wolf, fox, bear, lion, tiger
  '🦅','🐘','🦓','🦒','🐆'          // animals: eagle, elephant, zebra, giraffe, leopard
];
const AVATAR_NAMES = ["Cowboy", "Superhero", "Ninja", "The Suit", "Astronaut", "Kid", "Wizard", "Detective", "Scientist", "Prince", "Wolf", "Fox", "Bear", "Lion", "Tiger"];

const AVATARS_SVG = [
  `<svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg"> <ellipse cx="28" cy="10" rx="14" ry="3" fill="#7a5c0f"/> <rect x="18" y="4" width="18" height="9" rx="3" fill="#9a7520"/> <circle cx="30" cy="22" r="9" fill="#FDBCB4"/> <circle cx="33" cy="20" r="1.5" fill="#333"/> <ellipse cx="35" cy="23" rx="3" ry="2" fill="#e8a898"/> <rect x="20" y="30" width="14" height="18" rx="3" fill="#c0392b"/> <g class="tw-arm-left"><rect x="16" y="30" width="6" height="14" rx="3" fill="#c0392b"/><circle cx="16" cy="44" r="4" fill="#FDBCB4"/></g> <g class="tw-arm-right"><rect x="30" y="30" width="6" height="12" rx="3" fill="#c0392b"/><circle cx="34" cy="42" r="4" fill="#FDBCB4"/></g> <g class="tw-leg-left"><rect x="20" y="47" width="7" height="17" rx="3" fill="#2c3e50"/><rect x="17" y="61" width="11" height="6" rx="3" fill="#5D3A1A"/></g> <g class="tw-leg-right"><rect x="28" y="47" width="7" height="14" rx="3" fill="#2c3e50"/><rect x="26" y="58" width="10" height="6" rx="3" fill="#5D3A1A"/></g> </svg>`,
  `<svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg"> <path d="M34 32 Q42 45 38 68" stroke="#8B0000" stroke-width="8" fill="none" stroke-linecap="round"/> <circle cx="30" cy="21" r="9" fill="#FDBCB4"/> <rect x="16" y="13" width="18" height="7" rx="3" fill="#1a237e"/> <circle cx="33" cy="19" r="1.5" fill="#1a237e"/> <rect x="18" y="30" width="16" height="18" rx="3" fill="#1565C0"/> <text x="26" y="43" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffd700">S</text> <g class="tw-arm-left"><rect x="14" y="30" width="6" height="15" rx="3" fill="#1565C0"/><circle cx="14" cy="45" r="4" fill="#FDBCB4"/></g> <g class="tw-arm-right"><rect x="30" y="30" width="6" height="12" rx="3" fill="#1565C0"/><circle cx="34" cy="41" r="4" fill="#FDBCB4"/></g> <g class="tw-leg-left"><rect x="19" y="47" width="7" height="17" rx="3" fill="#1565C0"/><rect x="16" y="61" width="11" height="6" rx="3" fill="#B71C1C"/></g> <g class="tw-leg-right"><rect x="27" y="47" width="7" height="14" rx="3" fill="#1565C0"/><rect x="25" y="58" width="10" height="6" rx="3" fill="#B71C1C"/></g> </svg>`,
  `<svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg"> <circle cx="29" cy="21" r="9" fill="#2c2c2c"/> <rect x="19" y="17" width="18" height="6" rx="2" fill="#1a1a1a"/> <circle cx="33" cy="20" r="1.5" fill="white"/> <rect x="18" y="30" width="14" height="18" rx="3" fill="#1a1a1a"/> <g class="tw-arm-left"><rect x="13" y="30" width="7" height="14" rx="3" fill="#1a1a1a"/><rect x="10" y="38" width="5" height="12" rx="2" fill="#c0392b"/></g> <g class="tw-arm-right"><rect x="29" y="30" width="7" height="12" rx="3" fill="#1a1a1a"/><rect x="34" y="33" width="5" height="12" rx="2" fill="#c0392b"/></g> <g class="tw-leg-left"><rect x="19" y="47" width="7" height="17" rx="3" fill="#1a1a1a"/><rect x="16" y="61" width="11" height="6" rx="3" fill="#111"/></g> <g class="tw-leg-right"><rect x="27" y="47" width="7" height="14" rx="3" fill="#1a1a1a"/><rect x="25" y="58" width="10" height="6" rx="3" fill="#111"/></g> </svg>`,
  `<svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg"> <circle cx="30" cy="19" r="9" fill="#FDBCB4"/> <rect x="20" y="8" width="18" height="8" rx="2" fill="#2c3e50"/> <circle cx="33" cy="18" r="1.2" fill="#333"/> <rect x="18" y="28" width="16" height="20" rx="3" fill="#2c3e50"/> <rect x="25" y="28" width="5" height="20" fill="#ecf0f1"/> <circle cx="27" cy="34" r="1.2" fill="#e74c3c"/> <circle cx="27" cy="39" r="1.2" fill="#e74c3c"/> <path d="M20 28 L24 36 L18 36Z" fill="#1a252f"/> <g class="tw-arm-left"><rect x="13" y="28" width="7" height="14" rx="3" fill="#2c3e50"/><circle cx="13" cy="42" r="4" fill="#FDBCB4"/></g> <g class="tw-arm-right"><rect x="30" y="28" width="7" height="12" rx="3" fill="#2c3e50"/><circle cx="35" cy="39" r="4" fill="#FDBCB4"/></g> <g class="tw-leg-left"><rect x="19" y="47" width="7" height="17" rx="3" fill="#1a252f"/><rect x="16" y="61" width="11" height="6" rx="3" fill="#111"/></g> <g class="tw-leg-right"><rect x="27" y="47" width="7" height="14" rx="3" fill="#1a252f"/><rect x="25" y="58" width="10" height="6" rx="3" fill="#111"/></g> </svg>`,
  `<svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg"> <circle cx="29" cy="20" r="12" fill="#ecf0f1"/> <circle cx="30" cy="20" r="8" fill="#85c1e9"/> <circle cx="33" cy="18" r="1.5" fill="#1a1a1a"/> <rect x="3" y="26" width="6" height="10" rx="3" fill="#95a5a6"/> <rect x="16" y="30" width="20" height="22" rx="6" fill="#ecf0f1"/> <rect x="19" y="35" width="12" height="8" rx="2" fill="#3498db"/> <g class="tw-arm-left"><rect x="10" y="30" width="8" height="14" rx="4" fill="#ecf0f1"/></g> <g class="tw-arm-right"><rect x="32" y="30" width="8" height="12" rx="4" fill="#ecf0f1"/></g> <g class="tw-leg-left"><rect x="18" y="51" width="8" height="15" rx="4" fill="#bdc3c7"/><ellipse cx="22" cy="66" rx="7" ry="3" fill="#95a5a6"/></g> <g class="tw-leg-right"><rect x="27" y="51" width="8" height="12" rx="4" fill="#bdc3c7"/><ellipse cx="31" cy="63" rx="7" ry="3" fill="#95a5a6"/></g> </svg>`,
  `<svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg"> <rect x="19" y="3" width="18" height="8" rx="5" fill="#e74c3c"/> <circle cx="29" cy="21" r="9" fill="#FDBCB4"/> <circle cx="33" cy="20" r="1.5" fill="#333"/> <circle cx="34" cy="23" r="2" fill="#ffb3b3" opacity="0.7"/> <path d="M31 25 Q33 27 35 25" stroke="#c07868" stroke-width="1" fill="none"/> <rect x="18" y="30" width="14" height="16" rx="3" fill="#3498db"/> <g class="tw-arm-left"><rect x="13" y="30" width="7" height="13" rx="3" fill="#3498db"/><circle cx="13" cy="43" r="4" fill="#FDBCB4"/></g> <g class="tw-arm-right"><rect x="29" y="30" width="7" height="11" rx="3" fill="#3498db"/><circle cx="34" cy="40" r="4" fill="#FDBCB4"/></g> <g class="tw-leg-left"><rect x="19" y="45" width="7" height="17" rx="3" fill="#e74c3c"/><rect x="16" y="59" width="11" height="6" rx="4" fill="#c0392b"/></g> <g class="tw-leg-right"><rect x="27" y="45" width="7" height="14" rx="3" fill="#e74c3c"/><rect x="25" y="56" width="10" height="6" rx="4" fill="#c0392b"/></g> </svg>`,
  `<svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg"> <polygon points="29,2 36,20 22,20" fill="#6c3483"/> <ellipse cx="29" cy="20" rx="11" ry="3.5" fill="#6c3483"/> <circle cx="29" cy="28" r="9" fill="#FDBCB4"/> <circle cx="33" cy="27" r="1.2" fill="#333"/> <rect x="18" y="37" width="16" height="18" rx="4" fill="#6c3483"/> <path d="M20 37 Q29 32 37 37" stroke="#f39c12" stroke-width="1.5" fill="none"/> <g class="tw-arm-left"><rect x="12" y="37" width="8" height="14" rx="3" fill="#6c3483"/><circle cx="12" cy="51" r="4" fill="#FDBCB4"/></g> <g class="tw-arm-right"><rect x="30" y="37" width="8" height="12" rx="3" fill="#6c3483"/><rect x="36" y="38" width="5" height="18" rx="2" fill="#8B6914"/><circle cx="38" cy="37" r="5" fill="#f1c40f"/></g> <g class="tw-leg-left"><rect x="19" y="54" width="7" height="14" rx="3" fill="#4a235a"/><rect x="16" y="65" width="11" height="6" rx="3" fill="#3b1a47"/></g> <g class="tw-leg-right"><rect x="27" y="54" width="7" height="11" rx="3" fill="#4a235a"/><rect x="25" y="62" width="10" height="6" rx="3" fill="#3b1a47"/></g> </svg>`,
  `<svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg"> <ellipse cx="29" cy="10" rx="14" ry="3.5" fill="#2c2c2c"/> <rect x="18" y="4" width="18" height="9" rx="2" fill="#3d3d3d"/> <circle cx="30" cy="22" r="9" fill="#FDBCB4"/> <circle cx="33" cy="21" r="1.2" fill="#333"/> <rect x="18" y="31" width="15" height="19" rx="3" fill="#5d4037"/> <path d="M20 31 L24 39 L18 39Z" fill="#3e2723"/> <g class="tw-arm-left"><rect x="12" y="31" width="8" height="14" rx="3" fill="#5d4037"/><rect x="10" y="39" width="5" height="11" rx="2" fill="#8B6914"/></g> <g class="tw-arm-right"><rect x="29" y="31" width="7" height="12" rx="3" fill="#5d4037"/><circle cx="34" cy="42" r="4" fill="#FDBCB4"/></g> <g class="tw-leg-left"><rect x="19" y="49" width="7" height="17" rx="3" fill="#3e2723"/><rect x="16" y="63" width="11" height="6" rx="3" fill="#1a0f0a"/></g> <g class="tw-leg-right"><rect x="27" y="49" width="7" height="14" rx="3" fill="#3e2723"/><rect x="25" y="60" width="10" height="6" rx="3" fill="#1a0f0a"/></g> </svg>`,
  `<svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg"> <circle cx="30" cy="19" r="9" fill="#FDBCB4"/> <ellipse cx="28" cy="18" rx="4" ry="3" fill="none" stroke="#555" stroke-width="1.5"/> <ellipse cx="35" cy="18" rx="4" ry="3" fill="none" stroke="#555" stroke-width="1.5"/> <circle cx="28" cy="18" r="1.2" fill="#1a6baa"/> <circle cx="35" cy="18" r="1.2" fill="#1a6baa"/> <rect x="17" y="28" width="17" height="20" rx="3" fill="white" stroke="#ddd" stroke-width="1"/> <rect x="20" y="32" width="11" height="11" rx="2" fill="#d6eaf8"/> <g class="tw-arm-left"><rect x="11" y="28" width="8" height="14" rx="3" fill="white" stroke="#ddd" stroke-width="1"/><circle cx="11" cy="42" r="4" fill="#FDBCB4"/></g> <g class="tw-arm-right"><rect x="30" y="28" width="8" height="12" rx="3" fill="white" stroke="#ddd" stroke-width="1"/><circle cx="36" cy="37" r="5" fill="#85c1e9" opacity="0.9"/></g> <g class="tw-leg-left"><rect x="18" y="47" width="7" height="17" rx="3" fill="#1a252f"/><rect x="15" y="61" width="11" height="6" rx="3" fill="#111"/></g> <g class="tw-leg-right"><rect x="26" y="47" width="7" height="14" rx="3" fill="#1a252f"/><rect x="24" y="58" width="10" height="6" rx="3" fill="#111"/></g> </svg>`,
  `<svg width="52" height="72" viewBox="0 0 52 72" xmlns="http://www.w3.org/2000/svg"> <polygon points="29,2 33,10 40,8 35,15 38,23 29,18 20,23 23,15 18,8 25,10" fill="#ffd700"/> <circle cx="29" cy="25" r="9" fill="#FDBCB4"/> <circle cx="33" cy="23" r="1.2" fill="#333"/> <rect x="18" y="33" width="16" height="19" rx="3" fill="#1565C0"/> <rect x="23" y="33" width="7" height="19" fill="#0d47a1"/> <g class="tw-arm-left"><rect x="12" y="33" width="8" height="14" rx="3" fill="#1565C0"/><circle cx="12" cy="47" r="4" fill="#FDBCB4"/></g> <g class="tw-arm-right"><rect x="30" y="33" width="8" height="12" rx="3" fill="#1565C0"/><circle cx="36" cy="44" r="4" fill="#FDBCB4"/></g> <g class="tw-leg-left"><rect x="19" y="51" width="7" height="16" rx="3" fill="#0d47a1"/><rect x="16" y="64" width="11" height="6" rx="3" fill="#ffd700"/></g> <g class="tw-leg-right"><rect x="27" y="51" width="7" height="13" rx="3" fill="#0d47a1"/><rect x="25" y="61" width="10" height="6" rx="3" fill="#ffd700"/></g> </svg>`,
  `<svg width="68" height="56" viewBox="0 0 68 56" xmlns="http://www.w3.org/2000/svg"> <path d="M58 8 Q68 2 66 16" stroke="#95a5a6" stroke-width="4" fill="none" stroke-linecap="round"/> <ellipse cx="38" cy="30" rx="22" ry="14" fill="#95a5a6"/> <ellipse cx="38" cy="33" rx="13" ry="8" fill="#bdc3c7"/> <polygon points="54,18 58,6 62,18" fill="#7f8c8d"/> <polygon points="62,18 66,6 68,18" fill="#7f8c8d"/> <polygon points="55,18 58,9 61,18" fill="#ecdbcf"/> <polygon points="63,18 66,9 68,18" fill="#ecdbcf"/> <ellipse cx="58" cy="24" rx="12" ry="10" fill="#95a5a6"/> <ellipse cx="64" cy="28" rx="6" ry="4" fill="#bdc3c7"/> <ellipse cx="63" cy="25" rx="2.5" ry="2" fill="#2c3e50"/> <circle cx="66" cy="23" r="2" fill="#f39c12"/><circle cx="66" cy="23" r="1" fill="#111"/> <g class="tw-leg-left"><rect x="18" y="41" width="7" height="14" rx="3" fill="#7f8c8d"/><ellipse cx="21" cy="55" rx="6" ry="2.5" fill="#6d7d7e"/></g> <g class="tw-leg-right"><rect x="28" y="41" width="7" height="11" rx="3" fill="#7f8c8d"/><ellipse cx="31" cy="52" rx="6" ry="2.5" fill="#6d7d7e"/></g> <g class="tw-arm-left"><rect x="44" y="41" width="7" height="14" rx="3" fill="#7f8c8d"/><ellipse cx="47" cy="55" rx="6" ry="2.5" fill="#6d7d7e"/></g> <g class="tw-arm-right"><rect x="52" y="41" width="7" height="11" rx="3" fill="#7f8c8d"/><ellipse cx="55" cy="52" rx="6" ry="2.5" fill="#6d7d7e"/></g> </svg>`,
  `<svg width="68" height="56" viewBox="0 0 68 56" xmlns="http://www.w3.org/2000/svg"> <path d="M5 8 Q0 2 2 18" stroke="#e67e22" stroke-width="5" fill="none" stroke-linecap="round"/> <circle cx="2" cy="18" r="5" fill="#fff3e0"/> <ellipse cx="30" cy="30" rx="22" ry="13" fill="#e67e22"/> <ellipse cx="30" cy="33" rx="12" ry="7" fill="#fdebd0"/> <polygon points="53,18 57,5 61,18" fill="#e67e22"/> <polygon points="61,18 65,5 67,18" fill="#e67e22"/> <polygon points="54,18 57,8 60,18" fill="#fff3e0"/> <polygon points="62,18 65,8 67,18" fill="#fff3e0"/> <ellipse cx="57" cy="24" rx="12" ry="10" fill="#e67e22"/> <ellipse cx="63" cy="28" rx="6" ry="4" fill="#fdebd0"/> <ellipse cx="62" cy="25" rx="2.5" ry="2" fill="#1a1a1a"/> <circle cx="65" cy="22" r="2" fill="#2c3e50"/><circle cx="65" cy="22" r="1" fill="#111"/> <g class="tw-leg-left"><rect x="16" y="40" width="7" height="14" rx="3" fill="#d35400"/><ellipse cx="19" cy="54" rx="6" ry="2.5" fill="#c0392b"/></g> <g class="tw-leg-right"><rect x="26" y="40" width="7" height="11" rx="3" fill="#d35400"/><ellipse cx="29" cy="51" rx="6" ry="2.5" fill="#c0392b"/></g> <g class="tw-arm-left"><rect x="42" y="40" width="7" height="14" rx="3" fill="#d35400"/><ellipse cx="45" cy="54" rx="6" ry="2.5" fill="#c0392b"/></g> <g class="tw-arm-right"><rect x="50" y="40" width="7" height="11" rx="3" fill="#d35400"/><ellipse cx="53" cy="51" rx="6" ry="2.5" fill="#c0392b"/></g> </svg>`,
  `<svg width="68" height="60" viewBox="0 0 68 60" xmlns="http://www.w3.org/2000/svg"> <ellipse cx="34" cy="34" rx="23" ry="17" fill="#795548"/> <ellipse cx="34" cy="38" rx="14" ry="10" fill="#a1887f"/> <circle cx="54" cy="17" r="8" fill="#795548"/><circle cx="64" cy="17" r="8" fill="#795548"/> <circle cx="54" cy="17" r="5" fill="#a1887f"/><circle cx="64" cy="17" r="5" fill="#a1887f"/> <circle cx="58" cy="26" r="13" fill="#795548"/> <ellipse cx="64" cy="31" rx="7" ry="5" fill="#a1887f"/> <ellipse cx="63" cy="27" rx="3" ry="2.5" fill="#1a1a1a"/> <circle cx="66" cy="25" r="2.5" fill="#1a1a1a"/><circle cx="67" cy="24" r="1" fill="white"/> <g class="tw-leg-left"><rect x="14" y="47" width="9" height="13" rx="4" fill="#6d4c41"/><ellipse cx="18" cy="60" rx="7" ry="3" fill="#5d4037"/></g> <g class="tw-leg-right"><rect x="26" y="47" width="9" height="10" rx="4" fill="#6d4c41"/><ellipse cx="30" cy="57" rx="7" ry="3" fill="#5d4037"/></g> <g class="tw-arm-left"><rect x="40" y="47" width="9" height="13" rx="4" fill="#6d4c41"/><ellipse cx="44" cy="60" rx="7" ry="3" fill="#5d4037"/></g> <g class="tw-arm-right"><rect x="50" y="47" width="9" height="10" rx="4" fill="#6d4c41"/><ellipse cx="54" cy="57" rx="7" ry="3" fill="#5d4037"/></g> </svg>`,
  `<svg width="68" height="58" viewBox="0 0 68 58" xmlns="http://www.w3.org/2000/svg"> <path d="M5 10 Q0 2 2 18" stroke="#d4890a" stroke-width="5" fill="none" stroke-linecap="round"/> <circle cx="2" cy="18" r="5" fill="#d4890a"/> <ellipse cx="34" cy="34" rx="22" ry="14" fill="#e8b86d"/> <ellipse cx="34" cy="38" rx="13" ry="8" fill="#f5cba7"/> <circle cx="55" cy="22" r="14" fill="#d4890a"/> <circle cx="55" cy="22" r="10" fill="#e8b86d"/> <ellipse cx="61" cy="27" rx="6" ry="4" fill="#f5cba7"/> <ellipse cx="60" cy="23" rx="2.5" ry="2" fill="#c0392b"/> <circle cx="63" cy="20" r="2.5" fill="#27ae60"/><circle cx="63" cy="20" r="1.2" fill="#111"/> <g class="tw-leg-left"><rect x="14" y="44" width="8" height="14" rx="4" fill="#d4a843"/><ellipse cx="18" cy="58" rx="7" ry="3" fill="#c8973c"/></g> <g class="tw-leg-right"><rect x="25" y="44" width="8" height="11" rx="4" fill="#d4a843"/><ellipse cx="29" cy="55" rx="7" ry="3" fill="#c8973c"/></g> <g class="tw-arm-left"><rect x="40" y="44" width="8" height="14" rx="4" fill="#d4a843"/><ellipse cx="44" cy="58" rx="7" ry="3" fill="#c8973c"/></g> <g class="tw-arm-right"><rect x="50" y="44" width="8" height="11" rx="4" fill="#d4a843"/><ellipse cx="54" cy="55" rx="7" ry="3" fill="#c8973c"/></g> </svg>`,
  `<svg width="68" height="58" viewBox="0 0 68 58" xmlns="http://www.w3.org/2000/svg"> <path d="M5 10 Q0 2 2 18" stroke="#e67e22" stroke-width="5" fill="none" stroke-linecap="round"/> <ellipse cx="34" cy="33" rx="22" ry="14" fill="#e67e22"/> <ellipse cx="34" cy="37" rx="13" ry="8" fill="#fdebd0"/> <line x1="22" y1="23" x2="25" y2="34" stroke="#c0392b" stroke-width="2"/> <line x1="32" y1="21" x2="32" y2="33" stroke="#c0392b" stroke-width="2"/> <line x1="42" y1="23" x2="39" y2="34" stroke="#c0392b" stroke-width="2"/> <circle cx="52" cy="18" r="7" fill="#e67e22"/><circle cx="62" cy="18" r="7" fill="#e67e22"/> <circle cx="52" cy="18" r="4" fill="#fdebd0"/><circle cx="62" cy="18" r="4" fill="#fdebd0"/> <circle cx="56" cy="26" r="12" fill="#e67e22"/> <line x1="50" y1="18" x2="53" y2="26" stroke="#c0392b" stroke-width="1.5"/> <line x1="56" y1="16" x2="56" y2="24" stroke="#c0392b" stroke-width="1.5"/> <line x1="62" y1="18" x2="59" y2="26" stroke="#c0392b" stroke-width="1.5"/> <ellipse cx="62" cy="30" rx="6" ry="4" fill="#fdebd0"/> <ellipse cx="61" cy="27" rx="2.5" ry="2" fill="#1a1a1a"/> <circle cx="64" cy="24" r="2.5" fill="#2c3e50"/><circle cx="64" cy="24" r="1.2" fill="#111"/> <g class="tw-leg-left"><rect x="14" y="43" width="8" height="14" rx="4" fill="#d35400"/><ellipse cx="18" cy="57" rx="7" ry="3" fill="#c0392b"/></g> <g class="tw-leg-right"><rect x="25" y="43" width="8" height="11" rx="4" fill="#d35400"/><ellipse cx="29" cy="54" rx="7" ry="3" fill="#c0392b"/></g> <g class="tw-arm-left"><rect x="40" y="43" width="8" height="14" rx="4" fill="#d35400"/><ellipse cx="44" cy="57" rx="7" ry="3" fill="#c0392b"/></g> <g class="tw-arm-right"><rect x="50" y="43" width="8" height="11" rx="4" fill="#d35400"/><ellipse cx="54" cy="54" rx="7" ry="3" fill="#c0392b"/></g> </svg>`,
];
const COLORS = ['#00e5a0','#ff4b6e','#4b9fff','#ffd700','#ff6b35','#a855f7','#ec4899','#14b8a6','#f97316','#84cc16'];
const CITIES = ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Pune','Kolkata','Ahmedabad','Jaipur','Surat'];
const DECAY_INTERVAL_MS = 48 * 60 * 60 * 1000; // 48 hours
const DECAY_RATE = 0.10; // 10% per 48hr inactive

// ===== STATE =====
let state = {
  user: null,
  walking: false,
  // Lifetime stats
  territory: 0,
  steps: 0,
  distance: 0,
  captures: 0,
  // Today stats (reset each day)
  todayTerritory: 0,
  todaySteps: 0,
  todayDistance: 0,
  todayCaptures: 0,
  todayDate: new Date().toDateString(),
  // Walk session
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
let currentHeading = 0; // degrees: 0=north/right, 90=south, 180=west (flipped)
let walkInterval, decayInterval, gpsWatcher;
let db = null; // Firebase database reference
let deferredInstallPrompt = null;

// ===== FIREBASE INIT =====
let auth = null;
let confirmationResult = null;

(function injectWalkCSS() {
  const style = document.createElement('style');
  style.textContent = `/* ===== WALKING ANIMATION ===== */
.tw-avatar-walking .tw-leg-left  { transform-origin: 50% 0%; animation: twWalkLeg 0.5s ease-in-out infinite; }
.tw-avatar-walking .tw-leg-right { transform-origin: 50% 0%; animation: twWalkLeg 0.5s ease-in-out infinite reverse; }
.tw-avatar-walking .tw-arm-left  { transform-origin: 50% 0%; animation: twWalkArm 0.5s ease-in-out infinite reverse; }
.tw-avatar-walking .tw-arm-right { transform-origin: 50% 0%; animation: twWalkArm 0.5s ease-in-out infinite; }
.tw-avatar-walking               { animation: twBounce 0.5s ease-in-out infinite; }
@keyframes twWalkLeg { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(22deg)} 75%{transform:rotate(-22deg)} }
@keyframes twWalkArm { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(18deg)} 75%{transform:rotate(-18deg)} }
@keyframes twBounce  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }`;
  document.head.appendChild(style);
})();

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      return;
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    // Auth is handled via Twilio OTP — no Firebase Auth needed
  } catch (e) {
  }
}

// ===== PHONE LOGIN (no OTP — mobile number as unique ID) =====
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

  // Generate unique ID from phone number
  const uid = 'ph_' + btoa(currentPhone).replace(/[^a-zA-Z0-9]/g,'');
  state.userId = uid;

  // Save session so user stays logged in on refresh
  localStorage.setItem('tw_uid', uid);
  localStorage.setItem('tw_phone', currentPhone);

  // Check if returning user
  loadUserFromFirebase(uid);
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
      // Load today stats — reset if stored date != today
      const storedDate = data.todayDate || '';
      const todayStr = new Date().toDateString();
      if (storedDate === todayStr) {
        state.todayTerritory = data.todayTerritory || 0;
        state.todaySteps     = data.todaySteps || 0;
        state.todayDistance  = data.todayDistance || 0;
        state.todayCaptures  = data.todayCaptures || 0;
        state.todayDate      = todayStr;
      } else {
        state.todayTerritory = 0; state.todaySteps = 0;
        state.todayDistance  = 0; state.todayCaptures = 0;
        state.todayDate      = todayStr;
      }

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
      const btn = document.getElementById('submitPhoneBtn');
      if (btn) { btn.innerHTML = 'CONTINUE →'; btn.disabled = false; }
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
          territoryStore[uid] = { uid, name: state.user.name, color: state.user.color, zoneName: state.user.zoneName || '', geojson: null, layer: null };
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

  // First load all users to get their steps
  const userStepsMap = {};
  db.ref('users').once('value').then(snap => {
    snap.forEach(child => { userStepsMap[child.key] = child.val().steps || 0; });
  });

  db.ref('territories').on('value', snapshot => {
    const allTerritories = snapshot.val() || {};
    Object.entries(allTerritories).forEach(([uid, polygons]) => {
      if (uid === state.userId) return; // skip self
      const rivalSteps = userStepsMap[uid] || 0;
      Object.values(polygons).forEach(poly => {
        if (poly && poly.path && poly.color && poly.name) {
          registerRivalTerritory(uid, poly.name, poly.color, poly.path, rivalSteps);
        }
      });
    });
  });

  // Listen for leaderboard updates
  db.ref('users').orderByChild('territory').limitToLast(20).on('value', snapshot => {
    const users = [];
    snapshot.forEach(child => users.push({ uid: child.key, ...child.val() }));
    users.reverse();
    // Store steps in territoryStore so polygon labels can show them
    users.forEach(u => {
      if (u.uid !== state.userId && territoryStore[u.uid]) {
        territoryStore[u.uid].steps = u.steps || 0;
        redrawTerritory(u.uid);
      }
    });
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
  AVATAR_NAMES.forEach((name, i) => {
    const el = document.createElement('div');
    el.className = 'avatar-option' + (i === 0 ? ' selected' : '');
    el.dataset.avatar = name;
    const svg = AVATARS_SVG[i] || '';
    el.innerHTML = `<div style="width:40px;height:56px;display:flex;align-items:center;justify-content:center;overflow:hidden">${svg}</div><span class="av-label">${name}</span>`;
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

function logout() {
  // Clear all session data
  localStorage.removeItem('tw_uid');
  localStorage.removeItem('tw_phone');
  localStorage.removeItem('tw_user');
  // Clear territory cache
  if (state.userId) localStorage.removeItem('tw_geojson_' + state.userId);
  // Stop all watchers
  if (gpsWatcher) { navigator.geolocation.clearWatch(gpsWatcher); gpsWatcher = null; }
  if (walkInterval) { clearInterval(walkInterval); walkInterval = null; }
  if (decayInterval) { clearInterval(decayInterval); decayInterval = null; }
  // Reset state
  state.user = null;
  state.userId = null;
  state.walking = false;
  currentPhone = '';
  // Reload page fresh
  window.location.reload();
}

// ===== PROFILE MENU =====
function toggleProfileMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('profileMenu');
  menu.classList.toggle('open');
  if (menu.classList.contains('open')) updateProfileMenu();
}
function closeProfileMenu() {
  document.getElementById('profileMenu').classList.remove('open');
}
document.addEventListener('click', e => {
  if (!document.getElementById('profileMenu').contains(e.target) &&
      !document.getElementById('profileChip').contains(e.target)) {
    closeProfileMenu();
  }
});
function updateProfileMenu() {
  if (!state.user) return;
  document.getElementById('pmColorSwatch').style.background = state.user.color;
  document.getElementById('pmZoneName').textContent = state.user.zoneName || '';
  document.getElementById('pmWalkGoal').textContent = formatNum(state.user.walkGoal || 5000) + ' steps';
  document.getElementById('pmBio').textContent = state.user.bio || 'Tap to add your bio...';
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
    `<div class="color-swatch${c===state.user.color?' selected':''}" style="background:${c}" onclick="selectColor('${c}',this)"></div>`
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
    const color = selected ? selected.style.background : custom;
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
  {id:'none', emoji:'✖️', label:'None'},
  {id:'cowboy', emoji:'🤠', label:'Cowboy'},
  {id:'crown', emoji:'👑', label:'Crown'},
  {id:'tophat', emoji:'🎩', label:'Top Hat'},
  {id:'halo', emoji:'😇', label:'Halo'},
  {id:'glasses', emoji:'🕶️', label:'Shades'},
  {id:'cap', emoji:'🧢', label:'Cap'},
  {id:'santa', emoji:'🎅', label:'Santa'},
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
function closeMiniModal() {
  const el = document.getElementById('miniModalOverlay');
  if (el) el.remove();
}
function saveMiniModal() {
  const el = document.getElementById('miniModalOverlay');
  if (el && el._onSave) el._onSave();
  closeMiniModal();
}

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem('tw_uid');
  localStorage.removeItem('tw_phone');
  localStorage.removeItem('tw_user');
  if (state.userId) localStorage.removeItem('tw_geojson_' + state.userId);
  if (gpsWatcher) { navigator.geolocation.clearWatch(gpsWatcher); gpsWatcher = null; }
  if (walkInterval) { clearInterval(walkInterval); walkInterval = null; }
  if (decayInterval) { clearInterval(decayInterval); decayInterval = null; }
  window.location.reload();
}

function updateHeaderUI() {
  const acc = state.user.accessory && state.user.accessory !== 'none'
    ? ACCESSORIES.find(a => a.id === state.user.accessory)?.emoji || '' : '';
  const avatarEl = document.getElementById('headerAvatar');
  avatarEl.innerHTML = acc || '🚶';
  avatarEl.style.background = state.user.color + '33';
  avatarEl.style.border = '2px solid ' + state.user.color;
  avatarEl.style.fontSize = '14px';
  // Show only the name — clean, no extra clutter
  document.getElementById('headerName').textContent = state.user.name;
}

function loadSavedProfile() {
  // Profile is now loaded from Firebase via onAuthStateChanged
  // This function is kept as no-op for compatibility
  return false;
}

// ===== DEV TOOLS =====
function devResetProgress() {
  if (!confirm('Reset ALL your progress? This cannot be undone.')) return;
  if (!state.userId || !db) return;
  db.ref('users/' + state.userId).remove();
  db.ref('territories/' + state.userId).remove();
  db.ref('territory_snapshot/' + state.userId).remove();
  localStorage.removeItem('tw_uid');
  localStorage.removeItem('tw_phone');
  showNotif('Progress reset! Reloading...');
  setTimeout(() => window.location.reload(), 1500);
}
function devSpawnRivals() {
  if (!state.currentLat) { showNotif('Need GPS first'); return; }
  const rivals = [
    { name: 'Arjun', color: '#ff4b6e' },
    { name: 'Priya', color: '#a855f7' },
    { name: 'Karan', color: '#ffd700' },
    { name: 'Rahul', color: '#00d4ff' },
  ];
  rivals.forEach((r, i) => {
    const offLat = (Math.random() - 0.5) * 0.002;
    const offLng = (Math.random() - 0.5) * 0.002;
    const cLat = state.currentLat + offLat;
    const cLng = state.currentLng + offLng;
    const path = generatePolygon(cLat, cLng, 0.0006, 8);
    if (!territoryStore['dev_' + i]) {
      territoryStore['dev_' + i] = { uid: 'dev_' + i, name: r.name, color: r.color, geojson: null, layer: null, steps: Math.floor(Math.random()*5000) };
    }
    try {
      const gj = pathToGeoJSON(path);
      territoryStore['dev_' + i].geojson = gj;
      redrawTerritory('dev_' + i);
    } catch(e) {}
  });
  showNotif('4 rivals spawned nearby 👥');
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
      updateGpsStatus('locked', 'GPS Locked — auto-walk ON ✓');
      startAutoWalkGPS(); // auto-detect walking from now on
      showNotif('📍 GPS ready! Walk and territory claims automatically 🚶');
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
      document.getElementById('walkBtn').style.display = 'block'; // manual only without GPS
      showNotif('📍 Enable location for real GPS tracking');
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

function getAvatarSVG(avatarName) {
  const idx = AVATAR_NAMES.indexOf(avatarName);
  if (idx >= 0 && AVATARS_SVG[idx]) {
    // Replace class names with tw- prefixed versions for scoped CSS
    return AVATARS_SVG[idx]
      .replace(/class="arm-left"/g, 'class="tw-arm-left"')
      .replace(/class="arm-right"/g, 'class="tw-arm-right"')
      .replace(/class="leg-left"/g, 'class="tw-leg-left"')
      .replace(/class="leg-right"/g, 'class="tw-leg-right"');
  }
  return `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="${state.user ? state.user.color : '#00e5a0'}"/></svg>`;
}

// Inject walk keyframes into document head once — Leaflet strips <style> inside divIcon
(function ensureWalkKeyframes() {
  if (document.getElementById('tw-walk-keyframes')) return;
  const s = document.createElement('style');
  s.id = 'tw-walk-keyframes';
  s.textContent = `
    @keyframes twWalkLeg{0%,100%{transform:rotate(0deg)}25%{transform:rotate(25deg)}75%{transform:rotate(-25deg)}}
    @keyframes twWalkArm{0%,100%{transform:rotate(0deg)}25%{transform:rotate(20deg)}75%{transform:rotate(-20deg)}}
    @keyframes twBounce{0%,100%{transform:translateY(0px)}50%{transform:translateY(-4px)}}
    .tw-walking-leg-l{transform-origin:50% 0%;animation:twWalkLeg 0.45s ease-in-out infinite !important;}
    .tw-walking-leg-r{transform-origin:50% 0%;animation:twWalkLeg 0.45s ease-in-out infinite reverse !important;}
    .tw-walking-arm-l{transform-origin:50% 0%;animation:twWalkArm 0.45s ease-in-out infinite reverse !important;}
    .tw-walking-arm-r{transform-origin:50% 0%;animation:twWalkArm 0.45s ease-in-out infinite !important;}
    .tw-walking-body{animation:twBounce 0.45s ease-in-out infinite !important;}
  `;
  document.head.appendChild(s);
})();

function placeUserMarker(lat, lng) {
  const name = state.user ? state.user.name : 'You';
  const isWalking = state.walking;
  let svgContent = getAvatarSVG(state.user ? state.user.avatar : '');

  if (isWalking) {
    // Replace tw- class names with animated class names (injected into document head above)
    svgContent = svgContent
      .replace(/class="tw-leg-left"/g,  'class="tw-walking-leg-l"')
      .replace(/class="tw-leg-right"/g, 'class="tw-walking-leg-r"')
      .replace(/class="tw-arm-left"/g,  'class="tw-walking-arm-l"')
      .replace(/class="tw-arm-right"/g, 'class="tw-walking-arm-r"');
  }

  const bodyClass = isWalking ? 'tw-walking-body' : '';

  // Rotate avatar based on movement direction
  // SVG avatars face right (east=90deg). Flip horizontally if heading is westward.
  const headingDeg = currentHeading;
  const facingLeft = headingDeg > 90 && headingDeg < 270; // moving west-ish
  const rotateY = facingLeft ? 'scaleX(-1)' : 'scaleX(1)';
  // Tilt slightly for north/south movement
  const tiltAngle = (() => {
    if (headingDeg <= 45 || headingDeg >= 315) return -15;  // heading north
    if (headingDeg >= 135 && headingDeg <= 225) return 15;  // heading south
    return 0;
  })();
  const transform = `${rotateY} rotate(${tiltAngle}deg)`;

  const icon = L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;filter:drop-shadow(0 0 6px ${state.user.color})">
      <div class="${bodyClass}" style="width:52px;height:72px;display:flex;align-items:center;justify-content:center;transform:${transform};transition:transform 0.3s ease;">${svgContent}</div>
      <div style="background:rgba(0,0,0,0.8);color:white;font-size:9px;font-weight:700;padding:1px 6px;border-radius:6px;white-space:nowrap;max-width:70px;overflow:hidden;text-overflow:ellipsis;border:1px solid ${state.user.color}">${name}</div>
    </div>`,
    iconSize: [72, 92], iconAnchor: [36, 72], className: ''
  });
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.marker([lat, lng], { icon }).addTo(map);
}

function generatePolygon(cLat, cLng, size, pts) {
  return Array.from({ length: pts }, (_, i) => {
    const angle = (i / pts) * 2 * Math.PI;
    const r = size * (0.7 + Math.random() * 0.6);
    return [cLat + r * Math.cos(angle), cLng + r * Math.sin(angle)];
  });
}

// ===== WALK =====
// ===== AUTO-WALK DETECTION =====
// GPS speed > 0.8 m/s = walking detected, auto starts
// Speed thresholds
const WALK_SPEED_MIN = 0.3;   // m/s — very low, catches indoor GPS drift walking
const WALK_SPEED_MAX = 6.0;   // m/s — above this = vehicle (~21 km/h)
const WALK_DIST_MIN  = 0.8;   // metres between GPS pings — sensitive for indoor coverage
const STILL_TIMEOUT  = 30000; // 30 sec still = auto stop walk

let stillTimer = null;
let lastGPSLat = null, lastGPSLng = null;

function isVehicleSpeed(speed) { return speed > WALK_SPEED_MAX; }

// Haversine distance in metres between two coords
function gpsDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function startAutoWalkGPS() {
  if (gpsWatcher) return; // already watching
  gpsWatcher = navigator.geolocation.watchPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const speed = pos.coords.speed || 0;

      // Compute heading from previous position
      if (state.currentLat !== null && state.currentLng !== null) {
        const dLng = lng - state.currentLng;
        const dLat = lat - state.currentLat;
        if (Math.abs(dLat) > 0.000005 || Math.abs(dLng) > 0.000005) {
          // atan2 gives angle from east, convert to compass bearing
          const angle = Math.atan2(dLng, dLat) * 180 / Math.PI;
          currentHeading = (angle + 360) % 360;
        }
      }
      state.currentLat = lat;
      state.currentLng = lng;

      // Always update marker position with current heading
      if (state.user) placeUserMarker(lat, lng);
      if (map) map.panTo([lat, lng]);

      // ===== VEHICLE CHECK — ignore completely if in car/bike =====
      // Distance moved since last GPS ping (works indoors when speed=0)
      const distMoved = (lastGPSLat !== null)
        ? gpsDistance(lastGPSLat, lastGPSLng, lat, lng) : 0;
      lastGPSLat = lat; lastGPSLng = lng;

      // Vehicle check — distance too large for walking AND speed confirms it
      if (isVehicleSpeed(speed) && distMoved > 20) {
        if (state.walking) {
          stopWalk();
          showNotif('🚗 Vehicle detected — walk tracking paused');
        }
        document.getElementById('statusBadge').textContent = '🚗 IN VEHICLE';
        return;
      }

      // Detect walking via speed OR distance moved between pings
      const isWalkingNow = speed >= WALK_SPEED_MIN || distMoved >= WALK_DIST_MIN;

      if (isWalkingNow) {
        // Moving — clear still timer
        if (stillTimer) { clearTimeout(stillTimer); stillTimer = null; }

        // Auto start walk if not already walking
        if (!state.walking) startWalk(true);

        // Record path + count steps (lifetime + today)
        addWalkPoint(lat, lng);
        const newSteps = estimateSteps(speed || (distMoved / 2));
        const newDist  = Math.max(speed * 2, distMoved) / 1000;
        state.steps    += newSteps;
        state.distance += newDist;
        state.todaySteps    += newSteps;
        state.todayDistance += newDist;
        updateStats();

      } else if (state.walking) {
        // Not moving — start still timer
        if (!stillTimer) {
          stillTimer = setTimeout(() => {
            stopWalk();
            stillTimer = null;
          }, STILL_TIMEOUT);
        }
      }
    },
    err => console.warn('GPS error:', err),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
}

function toggleWalk() { state.walking ? stopWalk() : startWalk(false); }

function startWalk(auto = false) {
  state.walking = true;
  state.walkPath = state.walkPath.length ? state.walkPath : [];
  state.sessionGain = state.sessionGain || 0;

  document.getElementById('walkBtn').textContent = '⏹ STOP WALK';
  document.getElementById('walkBtn').classList.add('active');
  document.getElementById('walkingHud').classList.add('visible');
  document.getElementById('statusBadge').textContent = '🔴 WALKING';
  if (state.currentLat) placeUserMarker(state.currentLat, state.currentLng);

  if (!auto) {
    // Manual start — force record GPS points even indoors with weak signal
    showNotif('Walk started! Every step counts — indoors or outdoors 🚶');
  } else {
    showNotif('🚶 Walking detected! Claiming territory...');
  }
}

function stopWalk() {
  state.walking = false;
  state.lastActivity = Date.now();
  state.health = Math.min(100, state.health + 20);

  if (stillTimer) { clearTimeout(stillTimer); stillTimer = null; }
  if (walkInterval) clearInterval(walkInterval);
  if (state.walkPath.length > 2) { closeTerritory(); state.walkPath = []; }

  document.getElementById('walkBtn').textContent = '▶ START WALK';
  document.getElementById('walkBtn').classList.remove('active');
  document.getElementById('walkingHud').classList.remove('visible');
  document.getElementById('statusBadge').textContent = '🟢 READY';
  if (state.currentLat) placeUserMarker(state.currentLat, state.currentLng);

  updateStats();
  checkAchievements();
  persistState();
  saveUserToFirebase();
  saveMergedTerritoryToFirebase();
  const gained = state.sessionGain;
  state.sessionGain = 0;
  if (gained > 0) showNotif(`Walk done! +${gained} m² claimed 🎉`);
  else showNotif('Walk stopped. Keep walking to claim territory! 🗺️');
}

function estimateSteps(speed) {
  if (!speed || speed <= 0) return Math.floor(Math.random() * 5) + 8;
  return Math.floor(speed * 1.4 * 2); // ~1.4 steps/meter
}

function addWalkPoint(lat, lng) {
  state.walkPath.push([lat, lng]);
  if (currentPolyline) map.removeLayer(currentPolyline);
  currentPolyline = L.polyline(state.walkPath, {
    color: state.user.color, weight: 1, opacity: 0.5, dashArray: '3,8'
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
  // Safely get geometry whether it's a Feature or raw geometry
  const geometry = geojson.geometry || geojson;
  if (!geometry || !geometry.type) return [];

  if (geometry.type === 'Polygon') {
    // Each ring: outer boundary is index 0
    return [geometry.coordinates[0].map(c => [c[1], c[0]])];
  } else if (geometry.type === 'MultiPolygon') {
    // Each sub-polygon's outer ring
    return geometry.coordinates.map(poly => poly[0].map(c => [c[1], c[0]]));
  }
  return [];
}

// Redraw territory for a uid — always removes old layer first, draws fresh from GeoJSON
function redrawTerritory(uid) {
  const entry = territoryStore[uid];
  if (!entry) return;
  // Sync latest zoneName for own territory
  if (uid === state.userId && state.user) entry.zoneName = state.user.zoneName || '';

  // Always remove existing layer cleanly
  if (entry.layer) {
    map.removeLayer(entry.layer);
    entry.layer = null;
  }

  // Nothing to draw if no geojson or null (fully captured)
  if (!entry.geojson) return;

  const isMe = uid === state.userId;
  const paths = geojsonToLeaflet(entry.geojson);
  if (!paths.length) return;

  // Calculate TOTAL area across the entire merged territory (one number for all polygons)
  const totalAreaM2 = Math.floor(turf.area(entry.geojson));
  const areaLabel = totalAreaM2 >= 1000000
    ? (totalAreaM2 / 1000000).toFixed(2) + ' km²'
    : totalAreaM2 + ' m²';

  // Draw all polygon shapes
  const polyLayers = paths.map(path =>
    L.polygon(path, {
      color: entry.color,
      fillColor: entry.color,
      fillOpacity: isMe ? 0.45 : 0.25,
      weight: isMe ? 3 : 1.5,
      smoothFactor: 1
    })
  );

  // Label at center of EVERY polygon — no box, just text in player's color
  const stepsCount = isMe ? state.steps : (entry.steps || 0);

  // Use exact border color with fluorescent glow — same vivid color as polygon border
  const textColor = entry.color;

  const labelMarkers = paths.map(path => {
    const center = L.polygon(path).getBounds().getCenter();
    const labelIcon = L.divIcon({
      html: `<div style="
          pointer-events:none;
          text-align:center;
          line-height:1.6;
          white-space:nowrap;
          text-shadow: 0 0 8px ${entry.color}, 0 0 2px rgba(0,0,0,0.9);
        ">
          <div style="font-size:12px;font-weight:900;color:${textColor};letter-spacing:0.3px">${entry.name}${entry.zoneName ? ' · <span style=\'font-size:9px;font-weight:500\'>' + entry.zoneName + '</span>' : ''}</div>
          <div style="font-size:10px;font-weight:700;color:${textColor}">${areaLabel}</div>
          <div style="font-size:9px;font-weight:600;color:${textColor}">${stepsCount.toLocaleString()} steps</div>
        </div>`,
      className: '',
      iconAnchor: [40, 24]
    });
    return L.marker(center, { icon: labelIcon, interactive: false });
  });

  // Group all polygon shapes + all labels into one removable group
  entry.layer = L.layerGroup([...polyLayers, ...labelMarkers]).addTo(map);
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

      const capturedM2 = Math.floor(turf.area(intersection));
      if (capturedM2 < 10) return; // ignore tiny overlaps

      // Subtract captured area from rival — null means fully consumed
      const remaining = turf.difference(rival.geojson, newGeoJSON);
      rival.geojson = remaining || null;
      redrawTerritory(rivalUid); // redraw rival with reduced territory

      state.territory += capturedM2;
      state.todayTerritory += capturedM2;
      state.sessionGain += capturedM2;
      state.captures++;
      state.todayCaptures++;
      showNotif(`⚔️ Captured ${capturedM2} m² from ${rival.name}!`);
    } catch(e) { console.warn('Capture error:', e); }
  });

  // ---- MERGE: union new walk polygon into user's existing territory ----
  try {
    if (territoryStore[uid].geojson) {
      const merged = turf.union(territoryStore[uid].geojson, newGeoJSON);
      if (merged) {
        territoryStore[uid].geojson = merged;
      } else {
        territoryStore[uid].geojson = newGeoJSON;
      }
    } else {
      territoryStore[uid].geojson = newGeoJSON;
    }
  } catch(e) {
    territoryStore[uid].geojson = newGeoJSON;
  }

  // Add new walk area to stats
  const realArea = Math.floor(turf.area(newGeoJSON));
  state.territory += realArea;
  state.todayTerritory += realArea;
  state.sessionGain += realArea;

  // Redraw user territory as one clean merged polygon
  redrawTerritory(uid);
  persistTerritoryStore(uid);
  saveTerritoryToFirebase(newPath);
  saveMergedTerritoryToFirebase();

  // Clear the walk trail line
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
function registerRivalTerritory(uid, name, color, path, steps = 0) {
  if (uid === state.userId) return;
  try {
    const newGeoJSON = pathToGeoJSON(path);
    if (!territoryStore[uid]) {
      territoryStore[uid] = { uid, name, color, geojson: null, layer: null, steps };
    } else {
      territoryStore[uid].steps = steps; // update steps if already exists
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
  // Auto-reset today stats if it's a new day
  const today = new Date().toDateString();
  if (state.todayDate !== today) {
    state.todayDate = today;
    state.todayTerritory = 0;
    state.todaySteps = 0;
    state.todayDistance = 0;
    state.todayCaptures = 0;
  }

  // Lifetime
  document.getElementById('statTerritory').textContent = formatNum(state.territory);
  document.getElementById('statSteps').textContent = formatNum(state.steps);
  document.getElementById('statDist').textContent = state.distance.toFixed(1);
  document.getElementById('statCaptures').textContent = state.captures;

  // Today
  document.getElementById('statTodayTerritory').textContent = formatNum(state.todayTerritory);
  document.getElementById('statTodaySteps').textContent = formatNum(state.todaySteps);
  document.getElementById('statTodayDist').textContent = state.todayDistance.toFixed(1);
  document.getElementById('statTodayCaptures').textContent = state.todayCaptures;

  // HUD
  document.getElementById('hudDist').textContent = state.distance.toFixed(2) + ' km';
  document.getElementById('hudTerritory').textContent = '+' + state.sessionGain + ' m²';

  // Refresh polygon label so steps count updates live on map
  if (state.userId && territoryStore[state.userId]) redrawTerritory(state.userId);
}

function formatNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return n.toString();
}

// ===== LEADERBOARD =====
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
function toggleAchievements() {
  document.getElementById('achievementsPanel').classList.toggle('open');
}
// Close achievements panel on map click
document.addEventListener('click', e => {
  const panel = document.getElementById('achievementsPanel');
  const btn   = document.getElementById('achievementsOverlay');
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.remove('open');
  }
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
  // Update count badge
  const badge = document.getElementById('achieveCount');
  if (badge) badge.textContent = earned.length;
  // Render list
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
        .catch(e => console.warn('SW registration failed:', e));
}

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
  buildProfileModal();
  initFirebase();
  setTimeout(initRecaptcha, 500);

  // ===== VERSION CHECK — clears cache if app was updated =====
  const storedVersion = localStorage.getItem('tw_version');
  if (storedVersion !== APP_VERSION) {
    // New version detected — clear all local storage and force fresh login
    localStorage.clear();
    localStorage.setItem('tw_version', APP_VERSION);
    document.getElementById('loginModal').classList.add('open');
    showNotif('App updated! Please log in again 🔄');
    return; // stop here, show login screen
  }

  // ===== AUTO-LOGIN: restore session from localStorage =====
  const savedUid = localStorage.getItem('tw_uid');
  const savedPhone = localStorage.getItem('tw_phone');
  if (savedUid && savedPhone) {
    currentPhone = savedPhone;
    state.userId = savedUid;
    loadUserFromFirebase(savedUid);
  }
});

