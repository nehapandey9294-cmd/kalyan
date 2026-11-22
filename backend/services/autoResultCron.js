const db = require('../config/db');
const { executeAutoDeclareSync } = require('../controllers/adminController');

// Interval configuration (Default 30 seconds)
const CRON_INTERVAL_MS = process.env.AUTO_RESULT_CRON_INTERVAL_MS 
  ? parseInt(process.env.AUTO_RESULT_CRON_INTERVAL_MS, 10) 
  : 30000;

let cronTimer = null;
let isProcessing = false;

const cronState = {
  isInitialized: false,
  isCronRunning: false,
  intervalSeconds: Math.round(CRON_INTERVAL_MS / 1000),
  autoDeclareStatus: '0',
  lastCheckTime: null,
  lastSyncTime: null,
  lastSyncStatus: 'idle', // 'idle' | 'success' | 'error' | 'syncing'
  lastSyncMessage: 'Waiting for initial check...',
  lastDeclaredCount: 0,
  totalDeclarationsToday: 0,
  recentLogs: []
};

function addCronLog(type, message, details = null) {
  const logEntry = {
    time: new Date().toISOString(),
    type, // 'info' | 'success' | 'error' | 'declare'
    message,
    details
  };
  cronState.recentLogs.unshift(logEntry);
  if (cronState.recentLogs.length > 30) {
    cronState.recentLogs.pop();
  }
}

/**
 * Checks if auto declare is enabled in admin_settings table
 */
async function checkIsAutoDeclareEnabled() {
  try {
    await db.query(`ALTER TABLE admin_settings ADD COLUMN auto_declare_status VARCHAR(10) DEFAULT '0'`).catch(() => {});
    const [rows] = await db.query('SELECT auto_declare_status FROM admin_settings LIMIT 1');
    const status = rows && rows.length > 0 ? (rows[0].auto_declare_status || '0') : '0';
    cronState.autoDeclareStatus = status;
    return status === '1';
  } catch (err) {
    console.error('[AutoResultCron] Error checking auto_declare_status:', err.message);
    return false;
  }
}

/**
 * Perform one cycle of auto-result check and declaration
 */
async function runAutoResultCycle(isManualTrigger = false) {
  if (isProcessing) {
    if (isManualTrigger) {
      return { success: '0', msg: 'Sync already in progress, please wait a moment' };
    }
    return;
  }

  isProcessing = true;
  cronState.lastCheckTime = new Date().toISOString();
  cronState.lastSyncStatus = 'syncing';

  try {
    const isEnabled = await checkIsAutoDeclareEnabled();

    // If manual trigger, run regardless of isEnabled, but if scheduled tick, only run if enabled
    if (!isEnabled && !isManualTrigger) {
      cronState.lastSyncStatus = 'idle';
      cronState.lastSyncMessage = 'Auto Declare is DEACTIVE. Enable in Admin Auto Result page to automatically sync.';
      isProcessing = false;
      return { success: '1', msg: 'Auto declare is deactive', declaredCount: 0 };
    }

    console.log(`[AutoResultCron] Running background sync (${isEnabled ? 'ACTIVE 24/7' : 'MANUAL'})...`);
    cronState.lastSyncMessage = 'Fetching and evaluating market results from API...';

    const syncResult = await executeAutoDeclareSync();

    cronState.lastSyncTime = new Date().toISOString();
    cronState.lastSyncStatus = syncResult && syncResult.success === '1' ? 'success' : 'error';
    cronState.lastDeclaredCount = syncResult ? (syncResult.declaredCount || 0) : 0;
    cronState.lastSyncMessage = syncResult ? syncResult.msg : 'Sync finished';

    if (syncResult && syncResult.declaredCount > 0) {
      cronState.totalDeclarationsToday += syncResult.declaredCount;
      console.log(`[AutoResultCron] ⚡ Auto-declared ${syncResult.declaredCount} market result(s) successfully!`);
      addCronLog('declare', `Auto-declared ${syncResult.declaredCount} market result(s)`, syncResult.declaredEvents);
    } else {
      addCronLog('info', syncResult?.msg || 'Sync completed, no new undeclared results found');
    }

    isProcessing = false;
    return syncResult;
  } catch (err) {
    console.error('[AutoResultCron] Error in auto result sync cycle:', err.message);
    cronState.lastSyncStatus = 'error';
    cronState.lastSyncMessage = 'Error: ' + err.message;
    addCronLog('error', 'Sync failed: ' + err.message);
    isProcessing = false;
    if (isManualTrigger) {
      return { success: '0', error: err.message };
    }
  }
}

/**
 * Schedule next tick recursively to avoid overlapping intervals
 */
function scheduleNextTick() {
  if (cronTimer) {
    clearTimeout(cronTimer);
    cronTimer = null;
  }

  cronTimer = setTimeout(async () => {
    try {
      await runAutoResultCycle(false);
    } catch (e) {
      console.error('[AutoResultCron] Tick error:', e.message);
    } finally {
      if (cronState.isCronRunning) {
        scheduleNextTick();
      }
    }
  }, CRON_INTERVAL_MS);
}

/**
 * Start the background cron worker
 */
function initAutoResultCron() {
  if (cronState.isCronRunning) {
    console.log('[AutoResultCron] Background worker is already running.');
    return;
  }

  console.log(`[AutoResultCron] Starting Server Background Auto-Result Cron (Interval: ${CRON_INTERVAL_MS / 1000}s)...`);
  cronState.isInitialized = true;
  cronState.isCronRunning = true;

  // Run initial cycle after 5 seconds of server startup
  setTimeout(async () => {
    try {
      await runAutoResultCycle(false);
    } catch (err) {
      console.error('[AutoResultCron] Initial startup cycle error:', err.message);
    } finally {
      scheduleNextTick();
    }
  }, 5000);
}

/**
 * Stop background cron
 */
function stopAutoResultCron() {
  if (cronTimer) {
    clearTimeout(cronTimer);
    cronTimer = null;
  }
  cronState.isCronRunning = false;
  console.log('[AutoResultCron] Background worker stopped.');
}

/**
 * Get current cron status
 */
function getCronStatus() {
  return {
    ...cronState,
    isProcessing,
    serverTimeIST: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  };
}

module.exports = {
  initAutoResultCron,
  stopAutoResultCron,
  runAutoResultCycle,
  getCronStatus
};

