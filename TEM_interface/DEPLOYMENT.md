# Complete Deployment Guide: TEM Dashboard

This guide outlines how to deploy both the **frontend** (Vite + React + TS) and the **backend** (Node.js + Express API + Python calculation engine) to free hosting services (Vercel and Render) and keep them synchronized.

---

## 🏗️ Architecture Overview

The system is comprised of three parts:
1. **Frontend**: Vite SPA (React + TypeScript). To be deployed on **Vercel** (recommended) or **Render Static Site**.
2. **Backend**: Express API server which triggers a Python calculation engine (`calculate_tem.py`). Because it runs a persistent server and executes a Python process, it is deployed on **Render** using a custom **Dockerfile** (provided in the repository root).
3. **Database**: MongoDB (already cloud-hosted on MongoDB Atlas). Both the local and production servers connect to it via `MONGODB_URI`.

---

## 1. 🗄️ Database Setup (MongoDB Atlas)

Your database is already hosted on MongoDB Atlas (free tier) using the connection string:
`mongodb+srv://rishikakalidas:KNris$0068@tem.khdmanp.mongodb.net/?appName=tem`

- **Action Required**: None. You can reuse this same database connection string in your production backend environment variables.
- **Tip**: If you wish to use a different database for production, create a new cluster on MongoDB Atlas, whitelist all IP addresses (`0.0.0.0/0`) under Network Access, and grab the new `mongodb+srv://...` URL.

---

## 2. 🔌 Backend Deployment (Render)

Since the backend API needs to spin up a Python child process (`calculate_tem.py`), standard Serverless platforms (like Vercel or Netlify) are not suitable. **Render Web Services** is the best free option.

To ensure both Node and Python are installed seamlessly, we have created a `Dockerfile` in the root of the repository. Render will automatically detect this Dockerfile and build a container with the correct runtimes.

### Steps to Deploy on Render:
1. **Push your code to GitHub/GitLab**.
2. Sign in to [Render](https://render.com/) and click **New** ➡️ **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   - **Name**: `tem-api-backend` (or similar)
   - **Region**: Choose the closest one to your users
   - **Branch**: `main`
   - **Root Directory**: `.` (leave empty or set as `/` so the builder sees the root `Dockerfile`)
   - **Runtime**: **Docker** (Render will auto-detect this when you select the repo)
   - **Instance Type**: **Free**
5. Add the following **Environment Variables** (click "Advanced" and add them):
   - `NODE_ENV` ➡️ `production`
   - `MONGODB_URI` ➡️ `mongodb+srv://rishikakalidas:KNris$0068@tem.khdmanp.mongodb.net/?appName=tem` (or your production MongoDB URI)
   - `DATABASE_NAME` ➡️ `tem`
   - `PORT` ➡️ `4000`
6. Click **Deploy Web Service**.
7. Copy your deployed backend service URL once it is ready (e.g., `https://tem-api-backend.onrender.com`).

---

## 3. 💻 Frontend Deployment (Vercel or Render)

The frontend is a Vite SPA. It needs to know the URL of your Render backend API to make requests.

### Option A: Deploying on Vercel (Recommended)
Vercel is exceptionally fast for Vite static assets and automatically handles edge routing.

1. Sign in to [Vercel](https://vercel.com/) and click **Add New** ➡️ **Project**.
2. Import your GitHub repository.
3. Configure the Project settings:
   - **Framework Preset**: **Vite**
   - **Root Directory**: `TEM_interface/frontend` (click Edit and select the `frontend` subfolder)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the **Environment Variables** (crucial for linking the frontend to the backend):
   - **Key**: `VITE_API_BASE`
   - **Value**: Your Render backend URL (e.g., `https://tem-api-backend.onrender.com`) **without** trailing slash or `/api`.
5. Click **Deploy**.
6. **SPA Routing Support**: We have created a `vercel.json` file inside `TEM_interface/frontend` to handle rewrite routing. Vercel will pick it up automatically, so page reloads will not throw 404 errors.

---

### Option B: Deploying on Render (Static Site)
If you prefer to keep both frontend and backend on Render:

1. Click **New** ➡️ **Static Site** on Render.
2. Select your repository.
3. Configure the settings:
   - **Name**: `tem-dashboard`
   - **Branch**: `main`
   - **Root Directory**: `TEM_interface/frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Add **Environment Variables**:
   - `VITE_API_BASE` ➡️ Your Render backend URL (e.g., `https://tem-api-backend.onrender.com`)
5. Configure **Redirects/Rewrites** (to prevent 404 on page reload):
   - Go to your static site dashboard ➡️ **Redirects/Rewrites** ➡️ **Add Rule**:
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: `Rewrite`
6. Click **Save Changes** and deploy.

---

## ⚡ Synchronizing Updates & Recalculations

1. **How it links**: The frontend Vite app builds the production assets injecting `import.meta.env.VITE_API_BASE` as the API host URL.
2. **CORS**: The Node backend uses the wildcard CORS configuration (`app.use(cors())`), meaning it automatically accepts requests from your deployed Vercel/Render frontend domain.
3. **Database recalculation**:
   - When you click "Recalculate" in the admin dashboard, the frontend calls the backend's `/api/recalculate` route.
   - The backend runs `python3 calculate_tem.py`, which fetches input parameters from the database, computes all scenarios, and writes them back.
   - Since the Docker container on Render has Python 3 and all necessary packages pre-installed, this calculation will run exactly like it does on your local machine.

---

## ⚠️ Troubleshooting & Common Free-Tier Gotchas

* **Render Cold Starts**: Because Render's Web Service is on the free tier, it spins down after 15 minutes of inactivity. When you open the frontend for the first time in a while, the backend API might take **50–90 seconds** to wake up. This is normal for Render's free tier. 
* **Calculation Timeouts**: If a calculation takes longer than 30–60 seconds, the frontend HTTP request might time out. However, the backend calculation script runs asynchronously on the server, meaning it will finish running and update the database even if the frontend page reports a timeout.
* **Environment Variable Updates**: If you update `VITE_API_BASE` in Vercel/Render, you **must trigger a rebuild/redeployment** of the frontend, as Vite environment variables are embedded at build time.
