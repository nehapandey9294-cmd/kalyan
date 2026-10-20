# GAMA567 Application Setup

## Environment Configuration

### Production URL
- **Production Base URL:** `https://ww7ncvv5bk.preview.c24.airoapp.ai`
- **Production API URL:** `https://ww7ncvv5bk.preview.c24.airoapp.ai/api`

### Local Development URL
- **Local Backend Port:** `5001`
- **Local API URL:** `http://localhost:5001/api`

---

## Environment Files Setup

### 1. Frontend (`frontend/`)
- `.env`: Default local config (`VITE_API_URL=http://localhost:5001/api`)
- `.env.development`: Used during `npm run dev` (`VITE_API_URL=http://localhost:5001/api`)
- `.env.production`: Used during `npm run build` (`VITE_API_URL=https://ww7ncvv5bk.preview.c24.airoapp.ai/api`)

### 2. Landing (`landing/`)
- `.env`: Default local config (`VITE_API_URL=http://localhost:5001/api`)
- `.env.development`: Used during `npm run dev` (`VITE_API_URL=http://localhost:5001/api`)
- `.env.production`: Used during `npm run build` (`VITE_API_URL=https://ww7ncvv5bk.preview.c24.airoapp.ai/api`)

---

## Running Locally

1. **Backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Frontend App:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Landing Page:**
   ```bash
   cd landing
   npm install
   npm run dev
   ```
