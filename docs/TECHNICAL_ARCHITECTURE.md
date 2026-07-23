# FitScan Technical Architecture & Explanation

FitScan is a full-stack web application designed to provide users with detailed nutritional analysis of food products based on their personal health profiles. It leverages AI (Google Gemini) to analyze food images and ingredients, offering personalized verdicts and health insights.

## 1. High-Level Architecture

FitScan follows a classic client-server architecture with a relational database:

*   **Frontend:** A Single Page Application (SPA) built with React and Vite.
*   **Backend:** A RESTful API server built with Node.js and Express.
*   **Database:** PostgreSQL database, managed and queried using both raw SQL (via `pg`) and Prisma ORM.
*   **External APIs:**
    *   **Google Gemini API:** For analyzing food images and ingredients lists.
    *   **Open Food Facts API:** For fetching product data via barcode scanning.
    *   **Cloudinary:** For storing uploaded food images.

---

## 2. Frontend Application (React + Vite)

The frontend is located in the `src` directory and is built using modern React (Hooks, Functional Components).

### Key Technologies:
*   **Framework:** React 19 + Vite for fast bundling.
*   **Styling:** Tailwind CSS (v4) for utility-first styling, supplemented by custom CSS variables for theming (`index.css`).
*   **Routing:** Custom state-based routing (`currentView` in `App.jsx`).
*   **Internationalization:** `i18next` and `react-i18next` with locales (en, hi, es, de).
*   **Authentication:** JWT tokens stored in `localStorage` + `@react-oauth/google` for Google Sign-In.

### Core Components:
*   `App.jsx`: The main entry point that manages the global application state (current view, user session, active analysis result) and handles routing between different views.
*   `Home.jsx` / `Dashboard.jsx`: Primary user interfaces for initiating scans and viewing summaries.
*   `BarcodeScanner.jsx`: Uses `html5-qrcode` to scan product barcodes directly from the browser.
*   `Results.jsx`: Displays the detailed AI analysis, nutritional breakdown, and verdict.
*   `geminiService.js`: Acts as a client wrapper to communicate with the backend proxy for Gemini AI analysis.

---

## 3. Backend API Server (Node.js + Express)

The backend is located in the `server` directory and serves as a secure proxy for AI calls, manages user sessions, and handles database operations.

### Key Technologies:
*   **Framework:** Express.js.
*   **Database Access:** `pg` (node-postgres) for complex/custom queries and `prisma` for schema management.
*   **Authentication:** `bcrypt` for password hashing and `jsonwebtoken` for secure session management.
*   **File Storage:** Cloudinary integration for hosting scan images.

### API Routes:
*   `/auth` (`routes/auth.js`): Handles registration, login, Google OAuth, and profile management (including medical conditions and health goals).
*   `/api/analyze` (`routes/analyze.js`): The core AI proxy. It formats the user's profile and product data into a strict prompt for the Gemini API (`gemini-2.5-flash-lite`, etc.) to generate personalized nutritional verdicts.
*   `/scans` (`routes/scans.js`): Handles saving scan results, uploading images to Cloudinary, and managing the shared product database.
*   `/features` (`routes/features.js`): Manages the community feature request and voting system.

---

## 4. Database Schema (PostgreSQL)

The database schema is defined in `server/prisma/schema.prisma` and extended manually in `server.js` (initDb).

### Core Tables:
*   **`users`**: Stores authentication details, points, streak info, and a flexible `profile` JSONB column for UI preferences.
*   **`scans`**: Stores individual scan history for users, including the AI verdict, extracted ingredients, and nutritional data.
*   **`product_database`**: A shared cache of scanned products to reduce AI API calls. It uses a unique `product_key` (brand + name) to aggregate data.
*   **`user_medical_conditions` & `user_health_goals`**: Relational tables storing specific health parameters used to personalize the AI prompt.
*   **`feature_requests`**: Stores user-submitted ideas and their vote counts.

---

## 5. Core Workflows

### A. The Scanning & Analysis Workflow
1.  **Input:** The user either uploads/takes a photo of a food product or scans a barcode.
2.  **Data Gathering:**
    *   If barcode: The frontend fetches product data from the Open Food Facts API.
    *   If image: The image is compressed into a base64 string.
3.  **AI Analysis (Proxy):** The frontend sends the data (image or text) + the user's medical profile to the backend (`/api/analyze/image` or `/api/analyze/text`).
4.  **Prompt Engineering:** The backend constructs a highly specific prompt instructing Gemini to act as a "brutally honest nutrition analyst", forcing it to return a strict JSON structure containing a score, verdict, and side effects tailored to the user's conditions (e.g., Diabetes, Hypertension).
5.  **Result Generation:** The backend parses the JSON response, attempts repairs if the AI response is truncated, and sends the structured data back to the frontend.
6.  **Storage:** The frontend initiates a request to `/scans` to save the result. The backend uploads the image to Cloudinary, saves the scan to the user's history, and updates the shared `product_database`.

### B. User Personalization Workflow
The power of FitScan lies in its personalization. When a user updates their profile (Age, Goals, Medical Conditions with severity levels), this data is stored relationally in the database. During any scan, this profile is injected into the Gemini prompt, ensuring that a product might be marked "Good" for a bodybuilder but "Bad" for someone with high blood pressure.

---

## 6. Technical Design Decisions

*   **Backend AI Proxy:** Gemini API calls are routed through the backend rather than the frontend. This secures the API key, avoids CORS issues, and allows for server-side logic like rate-limit handling, automatic model fallback (e.g., trying `gemini-2.0-flash-lite` if `2.5` fails), and JSON response repair.
*   **Shared Food Database:** To minimize expensive/slow AI calls, products are cached in `product_database`. If a user searches for an already scanned product, they can use the existing data.
*   **JSONB Storage:** Heavy use of JSONB columns (`profile`, `raw_product_data`, `nutriments`) in PostgreSQL allows for flexible storage of unstructured data (like raw Open Food Facts payloads) without requiring constant schema migrations.
*   **Graceful Degradation:** The UI incorporates fallback mechanisms (e.g., if Cloudinary upload fails, it attempts to use the base64 string; if Canvas downscaling fails, it uses the original image).
