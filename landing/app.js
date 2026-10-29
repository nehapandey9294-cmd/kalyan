/**
 * SARA 777 - OFFICIAL LANDING PAGE JAVASCRIPT
 * Features:
 * - Brand: Sara 777
 * - Every Action Button downloads the APK (sara-777.apk)
 * - Fetches 100% dynamic live data from Backend API:
 *   - Real-time market results & timings (/api/landing/markets)
 *   - Game payout rates from DB (/api/landing/rates & /api/landing/info)
 *   - Notice ticker, contact numbers & APK link (/api/landing/info)
 *   - Interactive weekly historical Jodi & Panel charts (/api/landing/chart)
 */

// 1. Dynamic API Base URL Resolution with Smart Multi-Host Auto-Fallback
const CANDIDATE_API_BASES = (() => {
  const origin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : '';
  const hostname = (typeof window !== 'undefined' && window.location.hostname) ? window.location.hostname : '';
  const port = (typeof window !== 'undefined' && window.location.port) ? window.location.port : '';
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');

  const candidates = [];

  // A. Check explicit ?api= parameter in URL
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const explicitApi = urlParams.get('api');
    if (explicitApi) {
      if (explicitApi === 'local') candidates.push('http://localhost:5001/api');
      else if (explicitApi === 'live') candidates.push('https://gama567.biz/api');
      else candidates.push(explicitApi.replace(/\/$/, ''));
    }
  }

  // B. If running on local development port
  if (isLocal) {
    if (port === '5001' || port === '5000') {
      candidates.push('/api');
    }
    candidates.push('http://localhost:5001/api');
    candidates.push('http://localhost:5000/api');
  }

  // C. If hosted on live domain (e.g. gama567.biz, app.gama567.biz)
  // Priority 1: Current origin's own /api (Same-origin avoids CORS, DNS & SSL issues)
  if (origin && !isLocal) {
    candidates.push(`${origin}/api`);
    candidates.push('/api');
  }

  // D. Known production endpoints
  if (hostname.includes('gama567.biz')) {
    candidates.push('https://gama567.biz/api');
    candidates.push('https://app.gama567.biz/api');
    candidates.push('https://api.gama567.biz/api');
  } else {
    candidates.push('https://gama567.biz/api');
    candidates.push('https://app.gama567.biz/api');
    candidates.push('https://api.gama567.biz/api');
  }

  // E. Cloud fallback (Render / Airoapp)
  candidates.push('https://ww7ncvv5bk.c24.airoapp.ai/api');

  // De-duplicate candidates while preserving order
  return [...new Set(candidates)];
})();

let activeApiBase = CANDIDATE_API_BASES[0] || '/api';
console.log('🔗 Priority API Candidate:', activeApiBase);
console.log('📋 All API Fallback Candidates:', CANDIDATE_API_BASES);

// Helper to verify if response is genuine JSON (not Apache index.html rewrite)
async function isValidJsonResponse(res) {
  if (!res || !res.ok) return false;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return true;
  try {
    const clone = res.clone();
    const text = await clone.text();
    const trimmed = text.trim();
    if (trimmed.startsWith('<') || trimmed.startsWith('<!doctype') || trimmed.startsWith('<!DOCTYPE')) {
      return false;
    }
    JSON.parse(trimmed);
    return true;
  } catch (e) {
    return false;
  }
}

// Resilient API Fetch Helper with automatic candidate probing & caching
async function fetchFromApi(endpoint) {
  // 1. First attempt with active candidate
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${activeApiBase}${endpoint}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (await isValidJsonResponse(res)) return res;
    console.warn(`⚠️ Candidate ${activeApiBase}${endpoint} returned non-JSON/HTML, checking fallbacks...`);
  } catch (err) {
    console.warn(`Primary candidate ${activeApiBase}${endpoint} failed (${err.message}), trying fallbacks...`);
  }

  // 2. Probing other candidate URLs sequentially
  for (const candidate of CANDIDATE_API_BASES) {
    if (candidate === activeApiBase) continue;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const testRes = await fetch(`${candidate}${endpoint}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (await isValidJsonResponse(testRes)) {
        console.log(`✅ Connected successfully to working API endpoint: ${candidate}`);
        activeApiBase = candidate;
        return testRes;
      }
    } catch (e) {
      // Continue to next candidate
    }
  }

  // 3. Last attempt: Direct relative /api
  return fetch(`/api${endpoint}`);
}


// State Configuration
const APK_STORE_FILE = 'apk/sara-777.apk';

let appConfig = {
  appName: 'Kalyan Matka',
  appLink: APK_STORE_FILE,
  mobile: '',
  wpMobile: '',
  alertMessage: "⚡ Welcome to Kalyan Matka! India's No.1 Live Matka Result Portal. Download Official Android App now for fastest Kalyan, Time Bazar & Main Bazar results! Fast automatic withdrawals & 24x7 Live Chat support available.",
  privacyPolicyUrl: '/privacy-policy',
  dataDeletionUrl: '/data-deletion'
};

let allMarkets = [];
let allRates = [];
let currentFilter = 'all';
let searchQuery = '';

// Dedicated APK Trigger Helper (downloads the stored APK file from apk/ folder)
function triggerApkDownload(e) {
  if (e) {
    e.preventDefault();
  }
  const a = document.createElement('a');
  a.href = APK_STORE_FILE;
  a.setAttribute('download', 'sara-777.apk');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
window.triggerApkDownload = triggerApkDownload;

// Icons mapping for game types
const RATE_ICONS = {
  'single digit': '🎯',
  'jodi digit': '🎲',
  'single pana': '🃏',
  'double pana': '👑',
  'tripple pana': '💎',
  'triple pana': '💎',
  'half sangam': '⭐',
  'full sangam': '🏆'
};

function getRateIcon(typeName) {
  if (!typeName) return '🎯';
  const clean = typeName.toLowerCase().trim();
  for (const [key, icon] of Object.entries(RATE_ICONS)) {
    if (clean.includes(key)) return icon;
  }
  return '💰';
}

// =========================================================================
// INITIALIZATION
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadAllDynamicData();

  // Auto-refresh live market results every 15 seconds
  setInterval(loadLiveMarkets, 15000);
});

async function loadAllDynamicData() {
  await Promise.allSettled([
    loadAppInfo(),
    loadGameRates(),
    loadLiveMarkets()
  ]);
}

// =========================================================================
// 1. FETCH APP INFO & BRANDING DYNAMICALLY
// =========================================================================
async function loadAppInfo() {
  try {
    const res = await fetchFromApi('/landing/info');
    const data = await res.json();
    if (data && data.success === '1' && data.data) {
      const d = data.data;
      // App name resolution: Kalyan Matka
      appConfig.appName = d.app_name || 'Kalyan Matka';
      if (d.alert_message) appConfig.alertMessage = d.alert_message;
      if (d.mobile) appConfig.mobile = d.mobile;
      if (d.wp_mobile) appConfig.wpMobile = d.wp_mobile;
      if (d.app_link) appConfig.appLink = d.app_link;
      if (d.privacy_policy_url) appConfig.privacyPolicyUrl = d.privacy_policy_url;
      if (d.data_deletion_url) appConfig.dataDeletionUrl = d.data_deletion_url;

      // If rates returned inside info, update rates
      if (Array.isArray(d.rates) && d.rates.length > 0 && allRates.length === 0) {
        allRates = d.rates;
        renderDynamicRates(allRates);
      }

      applyBrandingDOM();
    }
  } catch (err) {
    console.warn('Could not fetch /landing/info:', err.message);
    applyBrandingDOM();
  }
}

function applyBrandingDOM() {
  // Update App Name
  document.querySelectorAll('.dyn-app-name').forEach(el => {
    el.textContent = appConfig.appName;
  });
  document.title = `${appConfig.appName} Official App | India's #1 Live Matka Results & APK Download`;

  // Update Notice Bar
  const noticeEl = document.getElementById('tickerMarquee');
  if (noticeEl && appConfig.alertMessage) {
    noticeEl.textContent = appConfig.alertMessage;
  }

  // Update Legal & Compliance URLs
  document.querySelectorAll('.dyn-privacy-link').forEach(el => {
    el.setAttribute('href', appConfig.privacyPolicyUrl || '/privacy-policy');
  });
  document.querySelectorAll('.dyn-deletion-link').forEach(el => {
    el.setAttribute('href', appConfig.dataDeletionUrl || '/data-deletion');
  });

  // Ensure all APK Download Buttons link directly to stored apk file in apk/ folder
  document.querySelectorAll('.apk-download-btn, a[download], .btn-download-nav, .btn-hero-apk, .btn-login-sm, .btn-hero-web, .btn-sticky-download, .btn-play-card').forEach(el => {
    el.setAttribute('href', APK_STORE_FILE);
    el.setAttribute('download', 'sara-777.apk');
  });

  // Update Live Chat Support Links
  document.querySelectorAll('.dyn-whatsapp-link, .dyn-chat-link').forEach(el => {
    el.setAttribute('href', '/support');
  });

  // Update Phone Helpline
  const telNum = (appConfig.mobile || appConfig.wpMobile || '919876543210').replace(/\D/g, '');
  document.querySelectorAll('.dyn-call-link').forEach(el => {
    el.setAttribute('href', `tel:${telNum}`);
  });
}

// =========================================================================
// 2. FETCH LIVE GAME RATES DYNAMICALLY FROM DB
// =========================================================================
async function loadGameRates() {
  try {
    let res = await fetchFromApi('/landing/rates');
    let data = await res.json();

    if (!data || data.success !== '1' || !Array.isArray(data.data) || data.data.length === 0) {
      res = await fetchFromApi('/landing/info');
      data = await res.json();
      if (data && data.data && Array.isArray(data.data.rates)) {
        data.data = data.data.rates;
      }
    }

    if (data && Array.isArray(data.data) && data.data.length > 0) {
      allRates = data.data;
      renderDynamicRates(allRates);
    }
  } catch (err) {
    console.warn('Error fetching dynamic game rates:', err.message);
  }
}

function renderDynamicRates(rates) {
  const container = document.getElementById('ratesGrid');
  if (!container || !rates || rates.length === 0) return;

  container.innerHTML = rates.map((r) => {
    const typeName = r.type || r.name || 'Game Rate';
    const minVal = Number(r.min_value) || 10;
    const maxVal = Number(r.max_value) || (r.rate ? Number(r.rate) : 950);
    const multiplierVal = r.multiplier || `${(maxVal / minVal).toFixed(0)}x`;
    const ratioStr = r.ratio || `${minVal} Ka ${maxVal}`;
    const icon = getRateIcon(typeName);

    return `
      <div class="rate-card">
        <div class="rate-icon-badge">${icon}</div>
        <h4 class="rate-name">${typeName}</h4>
        <div class="rate-ratio">Rate: <strong>${ratioStr}</strong></div>
        <div class="rate-value-pill">${multiplierVal}</div>
      </div>
    `;
  }).join('');

  updateMockupRates(rates);
}

function updateMockupRates(rates) {
  const miniGrid = document.querySelector('.phone-grid-games');
  if (!miniGrid || !rates || rates.length === 0) return;

  const previewRates = rates.slice(0, 4);
  miniGrid.innerHTML = previewRates.map(r => {
    const typeName = r.type || r.name || 'Game';
    const minVal = Number(r.min_value) || 10;
    const maxVal = Number(r.max_value) || 950;
    return `
      <div class="phone-game-box">
        <div style="font-size: 0.65rem; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${typeName}</div>
        <div class="rate">${minVal} Ka ${maxVal}</div>
      </div>
    `;
  }).join('');
}

// =========================================================================
// 3. FETCH TODAY'S LIVE SERVER RESULTS DYNAMICALLY
// =========================================================================
async function loadLiveMarkets() {
  try {
    const res = await fetchFromApi('/landing/markets');
    const data = await res.json();

    if (data && data.success === '1' && Array.isArray(data.data) && data.data.length > 0) {
      allMarkets = data.data;
      renderLiveMarketsDOM();
      updateHeroLiveMockup(allMarkets);
    }
  } catch (err) {
    console.warn('Error fetching live markets:', err.message);
    const container = document.getElementById('marketsGrid');
    if (container && (!allMarkets || allMarkets.length === 0)) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--gold-primary); background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-light);">
          <div class="live-beacon" style="margin: 0 auto 14px auto; width: 14px; height: 14px; background: #f59e0b;"></div>
          <h4 style="color: #fff; font-size: 1.1rem; margin-bottom: 6px;">Live Server Connecting...</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
            Connecting to live backend API. If the server is waking up, please wait a moment.
          </p>
          <button onclick="loadLiveMarkets()" style="background: linear-gradient(135deg, var(--gold-primary), #f59e0b); color: #000; border: none; padding: 8px 22px; border-radius: 20px; font-weight: 700; cursor: pointer;">
            <i class="fa-solid fa-rotate-right"></i> Retry Connection
          </button>
        </div>
      `;
    }
  }
}

function renderLiveMarketsDOM() {
  const container = document.getElementById('marketsGrid');
  if (!container) return;

  const filtered = allMarkets.filter(m => {
    const nameMatch = !searchQuery || m.market_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!nameMatch) return false;

    if (currentFilter === 'declared') return m.is_declared_today;
    if (currentFilter === 'open') return m.is_betting_open && !m.is_declared_today;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--text-muted); background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-light);">
        <i class="fa-solid fa-clock-rotate-left" style="font-size: 2rem; color: var(--gold-primary); margin-bottom: 12px; display: block;"></i>
        <h4 style="color: #fff; font-size: 1.15rem; margin-bottom: 6px;">No markets found</h4>
        <button onclick="clearSearch()" style="margin-top: 14px; background: rgba(251, 191, 36, 0.15); border: 1px solid var(--border-gold); color: var(--gold-primary); padding: 7px 18px; border-radius: 20px; font-weight: 700; cursor: pointer;">
          View All Markets
        </button>
      </div>
    `;
    return;
  }

  const apkUrl = appConfig.appLink || 'apk/sara-777.apk';

  container.innerHTML = filtered.map(m => {
    const isDeclared = m.is_declared_today;
    const isBettingOpen = m.is_betting_open;

    let statusClass = 'status-closed';
    let statusText = '🔴 CLOSED FOR TODAY';

    if (isDeclared) {
      statusClass = 'status-declared';
      statusText = '🟡 DECLARED TODAY';
    } else if (isBettingOpen) {
      statusClass = 'status-open';
      statusText = '🟢 OPEN FOR BETTING';
    }

    const resultStr = m.result_display || '***-**-***';

    return `
      <div class="market-card">
        <div class="market-card-top">
          <div class="market-name-wrap">
            <h3>${m.market_name}</h3>
          </div>
          <span class="market-status-badge ${statusClass}">
            ${statusText}
          </span>
        </div>

        <div class="market-result-display">
          <span class="result-number">${resultStr}</span>
          <span class="result-updated-time">
            ${isDeclared ? '🏆 Official Result Declared' : (isBettingOpen ? '⚡ Live Market Active' : '🕒 Market Closed')}
          </span>
        </div>

        <div class="market-timings">
          <div class="timing-item">Open: <strong>${m.open_time || '--:--'}</strong></div>
          <div class="timing-item">Close: <strong>${m.close_time || '--:--'}</strong></div>
        </div>

        <div class="market-actions">
          <button type="button" class="btn-chart-sm" onclick="openChartModal('jodi', '${encodeURIComponent(m.market_name)}')">
            <i class="fa-solid fa-table-list"></i> Jodi
          </button>
          <button type="button" class="btn-chart-sm" onclick="openChartModal('panel', '${encodeURIComponent(m.market_name)}')">
            <i class="fa-solid fa-chart-simple"></i> Panel
          </button>
          <!-- Play Now triggers APK download from apk/ folder -->
          <a href="${APK_STORE_FILE}" download="sara-777.apk" class="btn-play-card apk-download-btn">
            <i class="fa-solid fa-download"></i> Play Now
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function updateHeroLiveMockup(markets) {
  if (!markets || markets.length === 0) return;

  const activeMarket = markets.find(m => m.is_declared_today) || markets.find(m => m.is_betting_open) || markets[0];
  if (!activeMarket) return;

  const banner = document.querySelector('.phone-market-banner');
  if (!banner) return;

  const tag = activeMarket.is_declared_today ? '🔥 LIVE DECLARED TODAY' : '🟢 OPEN FOR BETTING';
  banner.innerHTML = `
    <span class="market-tag">${tag}</span>
    <div class="market-name">${activeMarket.market_name}</div>
    <div class="market-digits">${activeMarket.result_display || '*** - ** - ***'}</div>
    <div style="font-size: 0.68rem; color: #94a3b8; margin-top: 4px;">
      Open: ${activeMarket.open_time || '--'} | Close: ${activeMarket.close_time || '--'}
    </div>
  `;
}

// =========================================================================
// 4. INTERACTIVE JODI & PANEL CHARTS (FETCH FROM DB)
// =========================================================================
window.openChartModal = async (chartType, encodedGame) => {
  const gameName = decodeURIComponent(encodedGame);
  const modal = document.getElementById('chartModal');
  const modalTitle = document.getElementById('chartModalTitle');
  const modalBody = document.getElementById('chartModalBody');

  if (!modal || !modalTitle || !modalBody) return;

  const typeLabel = chartType === 'jodi' ? 'Jodi Chart' : 'Panel Chart';
  modalTitle.textContent = `${gameName} - Official ${typeLabel}`;
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 48px; color: var(--gold-primary);">
      <div class="live-beacon" style="margin: 0 auto 14px auto; width: 14px; height: 14px;"></div>
      <p style="font-weight: 700; font-size: 1rem;">Fetching live historical ${typeLabel} data from server...</p>
    </div>
  `;
  modal.classList.add('active');

  try {
    const res = await fetchFromApi(`/landing/chart/${chartType}/${encodeURIComponent(gameName)}`);
    const data = await res.json();

    if (data && data.success === '1' && Array.isArray(data.weeks) && data.weeks.length > 0) {
      renderChartTable(data.weeks, chartType);
    } else {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fa-solid fa-database" style="font-size: 2rem; margin-bottom: 12px; color: var(--gold-primary); display: block;"></i>
          <p style="font-size: 1rem; font-weight: 700; color: #fff;">No records found for ${gameName}</p>
          <p style="font-size: 0.85rem; margin-top: 4px;">Chart data will appear once game results are recorded.</p>
        </div>
      `;
    }
  } catch (err) {
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ef4444;">
        <p>Failed to load chart data from server. Please try again.</p>
      </div>
    `;
  }
};

window.closeChartModal = () => {
  const modal = document.getElementById('chartModal');
  if (modal) modal.classList.remove('active');
};

function renderChartTable(weeks, chartType) {
  const modalBody = document.getElementById('chartModalBody');
  if (!modalBody) return;

  const daysHeader = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  let html = `
    <div style="overflow-x: auto;">
      <table class="chart-table">
        <thead>
          <tr>
            <th>Week Date</th>
            ${daysHeader.map(d => `<th>${d}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  weeks.slice(0, 20).forEach(w => {
    html += `<tr><td style="font-weight: 700; color: #94a3b8; font-size: 0.78rem;">${w.weekStart}</td>`;

    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    dayOrder.forEach(dayIdx => {
      const d = w.days ? w.days[dayIdx] : null;
      if (d) {
        if (chartType === 'jodi') {
          html += `<td class="chart-jodi-cell">${d.jodi || '**'}</td>`;
        } else {
          html += `<td>
            <div style="font-size: 0.7rem; color: #94a3b8;">${d.open_pana || '***'}</div>
            <div class="chart-jodi-cell">${d.jodi || '**'}</div>
            <div style="font-size: 0.7rem; color: #94a3b8;">${d.close_pana || '***'}</div>
          </td>`;
        }
      } else {
        html += `<td style="color: var(--text-dim); font-size: 0.8rem;">**</td>`;
      }
    });

    html += `</tr>`;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  modalBody.innerHTML = html;
}

// =========================================================================
// 5. SEARCH, FILTER & GLOBAL DOWNLOAD LISTENER
// =========================================================================
window.clearSearch = () => {
  searchQuery = '';
  const searchInput = document.getElementById('marketSearchInput');
  if (searchInput) searchInput.value = '';
  currentFilter = 'all';
  updateFilterButtons();
  renderLiveMarketsDOM();
};

function updateFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.getAttribute('data-filter') === currentFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function initEventListeners() {
  // Live search input
  const searchInput = document.getElementById('marketSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderLiveMarketsDOM();
    });
  }

  // Filter tabs
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.getAttribute('data-filter');
      updateFilterButtons();
      renderLiveMarketsDOM();
    });
  });

  // Global APK Download button interceptor:
  // Every action button (Play, Download, Hero CTA, Sticky CTA) triggers APK download of stored file
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.apk-download-btn, .btn-play-card, .btn-login-sm, .btn-hero-web, .btn-download-nav, .btn-hero-apk, .btn-sticky-download, a[href*="apk"]');
    if (btn) {
      btn.setAttribute('href', APK_STORE_FILE);
      btn.setAttribute('download', 'sara-777.apk');
    }
  });

  // FAQ Accordion
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        if (!isActive) item.classList.add('active');
      });
    }
  });

  // Chart modal backdrop click to close
  const modal = document.getElementById('chartModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeChartModal();
    });
  }
}
