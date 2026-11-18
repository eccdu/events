# Economics Cultural Club (ECC) - Event Registration System

A 100% free ($0), zero-cloud-console registration portal built for **GitHub Pages** connected directly to **Google Sheets via Google Apps Script**.

## System Architecture (100% Free / $0 Setup)

```
                    ┌─────────────────────────┐
                    │  Zero-Cloud Identity    │
                    │  Direct Google/Gmail    │
                    └───────────┬─────────────┘
                                │ (Session Profile)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│               GitHub Pages (Static Client-Side)                 │
│  - index.html (Semantic UI, Bangla & English, Hind Siliguri)     │
│  - style.css (Quiet Chrome, zero-AI-slop, 4/8px grid scale)     │
│  - app.js (Dynamic Age calculation, group limits, pricing)      │
│  - config.js (Pre-configured Google Apps Script Web App URL)    │
└───────────────────────────────┬─────────────────────────────────┘
                                │ POST JSON (text/plain payload)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google Apps Script Web App (Code.gs)               │
│  - doPost(e) handler with LockService (anti-race condition)     │
│  - Auto-formatting headers (Frozen top row, styling)            │
└───────────────┬─────────────────────────────────┬───────────────┘
                │                                 │
                ▼                                 ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│  Art-camp 'চিত্রপট' Sheet    │ │ Movie 'উৎসব' Sheet            │
│  - Age, Group, Paper/Canvas   │ │ - Institution, Session        │
│  - Auto-computed Fee, TrxID   │ │ - Dynamic 50/100 TK Fee       │
└───────────────────────────────┘ └───────────────────────────────┘
```

---

## Deliverables & File Structure

```
ecc-registration/
├── index.html         # Main portal (Auth, Menu, Art-camp & Movie Screening forms)
├── style.css          # Editorial styling with quiet chrome, crisp borders, tabular numbers
├── app.js             # Form reactivity, age/group validation, dynamic pricing & API calls
├── config.js          # User configuration (Google Client ID & GAS Web App URL)
├── bangla-qr.svg      # Clean fallback placeholder for Bangla QR
├── bangla-qr.png      # (Optional) Drop your real Bangla QR code PNG here
├── Code.gs            # Google Apps Script backend code
└── README.md          # Complete deployment & setup instructions
```

---

## Business Logic Summary

### 1. 'চিত্রপট' (Art-camp) Booking
- **Age Calculation:** Calculated dynamically from the selected birthday in full years.
- **Group Availability:**
  - **কুঁড়ি (৩–১৫ বছর):** Medium: কার্ট্রিজ পেপার | Fee: **500 TK**
  - **কলি (কার্টিজ পেপার) (১৬–২৫ বছর):** Medium: কার্ট্রিজ পেপার | Fee: **800 TK**
  - **কলি (ক্যানভাস) (১৬–২৫ বছর):** Medium: ক্যানভাস | Fee: **1,000 TK**
- Groups outside the calculated age are automatically greyed out / disabled and cannot be submitted.
- The registration fee is automatically populated based on group selection.

### 2. 'উৎসব' (Movie Screening) Booking
- **Pricing Conditions:**
  - **50 TK:** strictly `Institution === 'EconDU'` AND `Session in ['25/26', '24/25', '23/24', '22/23']`.
  - **100 TK:** All other combinations (including non-EconDU, other sessions, or "Other").
- Selecting "Other" under Institution or Session dynamically reveals a text input for specification.

### 3. Shared Payment Component
- **Bank Details:** Economics Cultural Club, A/C: `4405702001651`, Sonali Bank PLC, DU Campus Corporate Branch, Routing: `200271750`, SWIFT: `BSONBDDH`
- **MFS Details:** `01753932582` (bKash / Nagad / Rocket / Upay)
- Built-in one-click copy buttons for Account Number and MFS number.
- Image placeholder for `<Bangla QR png>` (with SVG fallback).
- Transaction ID (TrxID) & payment method validation.

---

## Step-by-Step Setup Instructions

### Step 1: Create the Google Sheets
1. Open [Google Sheets](https://sheets.new) and create two sheets (or two tabs in one spreadsheet):
   - **Sheet 1:** Name it `ECC_ArtCamp_Registrations`
   - **Sheet 2:** Name it `ECC_MovieScreening_Registrations`
2. Copy the **Spreadsheet ID** from the browser address bar for both sheets:
   `https://docs.google.com/spreadsheets/d/`**`<SPREADSHEET_ID>`**`/edit`

---

### Step 2: Deploy Google Apps Script (`Code.gs`)
1. Go to [Google Apps Script](https://script.new).
2. Replace any default code in `Code.gs` with the provided `Code.gs` file.
3. The constants at the top of `Code.gs` are already configured with your Sheet IDs:
   ```javascript
   const ART_CAMP_SHEET_ID = "1miYxJzCtdYe7MKDb47N0mnne-w-fOUKiY3owOswNdFI";
   const MOVIE_SCREENING_SHEET_ID = "1heyv8bStl-evXOMdQJ-00X4O08OpvX9zmen3mCQzxAE";
   ```
4. Click **Deploy** &rarr; **New deployment**.
5. Click the gear icon next to "Select type" and choose **Web app**.
6. Set the settings:
   - **Description:** `ECC Registration API`
   - **Execute as:** `Me (your email)`
   - **Who has access:** `Anyone` *(Crucial so static GitHub Pages can POST data)*
7. Click **Deploy**, authorize permissions when prompted.
8. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 3: Frontend Configuration (Pre-Configured!)
Your [**`config.js`**](file:///C:/Users/Admin/.gemini/antigravity/scratch/ecc-registration/config.js) is already pre-configured with your active Google Apps Script Web App URL:
```javascript
window.APP_CONFIG = {
  GOOGLE_APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxcSjKf3Igu3r0tGcA_Dan8qEiHtfazgwb1n3ydM-ssPMkHIrXT9_nB6f5SzNKDsMVAgA/exec"
};
```
No Google Cloud Console, no API keys, and no billing accounts are required!

---

### Step 4: Deploy to GitHub Pages (100% Free)
1. Initialize git and push this folder to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Deploy ECC Registration Portal"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. On GitHub, navigate to your repository &rarr; **Settings** &rarr; **Pages**.
3. Under **Build and deployment**, set Source to **Deploy from a branch**, choose `main` branch and `/ (root)` folder, then click **Save**.
4. In 1–2 minutes, your portal will be live at `https://<your-username>.github.io/<repo-name>/`.
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. On GitHub, navigate to your repository &rarr; **Settings** &rarr; **Pages**.
3. Under **Build and deployment**, set Source to **Deploy from a branch**, choose `main` branch and `/ (root)` folder, then click **Save**.
4. In 1–2 minutes, your portal will be live at `https://<your-username>.github.io/<repo-name>/`.
