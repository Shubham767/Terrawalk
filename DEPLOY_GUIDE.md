# 🚀 TerraWalk – Go Live Guide
## Step-by-step for non-technical founders

---

## STEP 1 — Create a GitHub Account (5 min)
GitHub is where your app code lives online.

1. Go to https://github.com
2. Click "Sign up" → create a free account
3. Verify your email

---

## STEP 2 — Upload Your App to GitHub (10 min)

1. Once logged in, click the **+** button (top right) → "New repository"
2. Name it: `terrawalk`
3. Set it to **Public**
4. Click "Create repository"
5. On the next page, click **"uploading an existing file"**
6. Drag and drop ALL the TerraWalk files:
   - `index.html`
   - `manifest.json`
   - `sw.js`
   - `css/style.css`
   - `js/app.js`
7. Click **"Commit changes"**

Your code is now live on GitHub! ✅

---

## STEP 3 — Set Up Firebase (Free Backend) (15 min)
Firebase stores all your users, territories, and leaderboards.

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Name it `terrawalk` → Continue → Continue → Create project
4. Once inside, click **"Realtime Database"** (left sidebar)
5. Click **"Create Database"** → Start in test mode → Enable
6. Now click the **⚙️ Settings gear** → "Project Settings"
7. Scroll down to "Your apps" → click **</>** (Web app icon)
8. Name it `terrawalk-web` → Register app
9. You'll see a config block like this — **COPY IT**:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "terrawalk-xxx.firebaseapp.com",
  databaseURL: "https://terrawalk-xxx-default-rtdb.firebaseio.com",
  projectId: "terrawalk-xxx",
  ...
};
```

10. Open `js/app.js` → Find `FIREBASE_CONFIG` at the top → **Replace the values** with your copied config
11. Go back to GitHub → open `js/app.js` → click the pencil ✏️ icon → paste the updated code → Commit

Firebase is ready! ✅

---

## STEP 4 — Deploy to Vercel (Free Hosting) (5 min)
Vercel gives your app a real URL like `terrawalk.vercel.app`

1. Go to https://vercel.com
2. Click **"Sign Up"** → Continue with GitHub
3. Click **"Add New Project"**
4. You'll see your GitHub repos — click **"Import"** next to `terrawalk`
5. Leave all settings as default
6. Click **"Deploy"**
7. Wait 60 seconds ⏳
8. 🎉 **Your app is LIVE!** Vercel gives you a URL like `https://terrawalk-abc.vercel.app`

---

## STEP 5 — Test on Your Phone (2 min)

1. Open the Vercel URL on your Android phone in Chrome
2. Chrome will show a banner: **"Add to Home Screen"** — tap it
3. TerraWalk installs like a real app on your phone!
4. Open it, create your profile, and start walking

---

## STEP 6 — Share With Friends!

Share your Vercel URL via WhatsApp, Instagram, wherever.
Anyone can open it in their browser and start playing immediately.
No app store needed.

---

## 🔒 Firebase Security (Do Before Going Public)

Once you have real users, update Firebase Database Rules:
Go to Firebase → Realtime Database → Rules → paste this:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": true,
        ".write": "$uid === auth.uid"
      }
    },
    "territories": {
      "$uid": {
        ".read": true,
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

---

## 📊 Custom Domain (Optional — ₹800/year)

1. Buy a domain at https://godaddy.com or https://namecheap.com
   (suggested: `terrawalk.in` or `walkandclaim.com`)
2. In Vercel → your project → Settings → Domains → Add your domain
3. Follow Vercel's DNS instructions (copy-paste, takes 10 min)

---

## 🆘 Stuck? 
Ask Claude — share the error message and I'll fix it immediately!
