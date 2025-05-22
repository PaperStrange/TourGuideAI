# TourAI Platform

This folder contains the fullstack codebase for the TourGuideAI project, organized for easy deployment on Render using infrastructure-as-code.

## Folder Structure

- **backend/**: Node.js/Express backend API server
- **frontend/**: React frontend application
- **models/**: (Optional) ML models, data, or related code (not deployed to Render)
- **render.yaml**: Render blueprint for automated deployment of backend and frontend as separate services

---

## Deployment on Render

You can deploy both the backend and frontend as separate services on Render using the provided `render.yaml` blueprint.

### 1. Prerequisites
- Push this folder (with all contents) to your GitHub repository.
- Make sure your backend `.env` file is set up (see `backend/.env`).

### 2. Deploy with Render Blueprints
1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New Blueprint** and connect your GitHub repo.
3. Render will auto-detect `render.yaml` and set up two services:
   - **tourguideai-backend** (Node.js web service)
   - **tourguideai-frontend** (Static site)
4. Fill in required environment variables for the backend (see `backend/.env`).
5. Click **Apply** to deploy both services.

### 3. Service Details
- **Backend**
  - Root: `backend/`
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Set environment variables as needed (see `.env`)
- **Frontend**
  - Root: `frontend/`
  - Build Command: `npm install && npm run build`
  - Publish Directory: `build`
  - (Optional) Set `REACT_APP_API_URL` to your backend's Render URL if needed

### 4. Connecting Frontend to Backend
- Update your frontend code to use the backend's Render URL for API requests (e.g., via `REACT_APP_API_URL`).
- Set this variable in the frontend service's environment settings on Render if needed.

---

## Notes
- The `models/` folder is not deployed to Render, but can be used for local development or future ML service integration.
- For advanced configuration, edit `render.yaml` as needed.

---

For any issues, consult the main project documentation or Render's deployment docs. 