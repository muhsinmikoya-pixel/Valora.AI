# Valora backend

## What this adds
- Express backend with `/api/search`
- `/api/ask` AI endpoint
- Live OpenStreetMap/Nominatim geocoding
- Live OpenStreetMap/Overpass hotel and food discovery
- Product catalog isolated from the UI so a retailer API can be plugged in later
- Optional OpenAI-compatible AI provider via environment variables
- Frontend now talks to the backend instead of pretending local demo data is live

## Run on a computer
1. Install Node.js 18+.
2. Open this folder in a terminal.
3. Run `npm install`
4. Run `npm start`
5. Open `http://localhost:3000`

## Important
The backend can provide live place data without a paid key. Real shopping prices/stock require a retailer/product data provider. The app does not fabricate those prices.

For real AI answers, put an OpenAI-compatible endpoint and API key in `.env`. If you leave them empty, Valora uses a grounded fallback that only answers from the result data.


## Deploy with Render (phone-friendly)

1. Create a GitHub repository and upload this entire folder.
2. In Render, choose **New → Web Service** and connect that repository.
3. Render can use the included `render.yaml`; otherwise use:
   - Build command: `npm install`
   - Start command: `npm start`
4. Deploy.
5. Open the generated `https://...onrender.com` address.
6. Because the site is HTTPS, browser location permission can work normally.
7. Do not put an AI API key into the frontend. Keep it in the backend environment variables.

The backend is designed to work without an AI key for basic grounded answers. Add an AI-compatible endpoint/key later when you want natural-language answers beyond the built-in fallback.
