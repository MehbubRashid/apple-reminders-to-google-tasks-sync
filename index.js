const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const { authorize } = require('./auth');
const tasksApi = require('./tasks');

const SYNC_STATE_FILE = path.join(__dirname, 'sync_state.json');
const SWIFT_BIN = path.join(__dirname, 'fetch_reminders');

// Map of Apple Reminder ID -> { googleTaskId, lastSyncedCompletedStatus, lastSyncedDueDate }
let syncState = {};

async function loadSyncState() {
  try {
    const data = await fs.readFile(SYNC_STATE_FILE, 'utf8');
    syncState = JSON.parse(data);
  } catch (e) {
    syncState = {};
  }
}

function getTimestamp() {
  const now = new Date();
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  return `[${now.toLocaleString('en-ZA', options).replace(',', '')}]`;
}

async function saveSyncState() {
  await fs.writeFile(SYNC_STATE_FILE, JSON.stringify(syncState, null, 2));
}

function fetchAppleReminders() {
  try {
      console.log("Fetching Apple Reminders...");
      const output = execSync(`"${SWIFT_BIN}"`, { encoding: 'utf-8', timeout: 30000 });
      const parsed = JSON.parse(output);
      
      if (parsed && parsed.error) {
          console.error("Apple Reminders Access Error:", parsed.error);
          return null;
      }
      
      return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
      console.error("Failed to fetch Apple Reminders:", e.message);
      return null;
  }
}

async function sync() {
    console.log(`${getTimestamp()} --- Starting Sync ---`);
    await loadSyncState();
    
    const auth = await authorize();
    // Cache for List IDs: Apple List Name -> Google List ID
    const listIdMap = {};
    
    const reminders = fetchAppleReminders();
    if (!reminders || !Array.isArray(reminders)) {
        console.error(`${getTimestamp()} Aborting sync: Could not fetch reminders (likely permission denied or empty result).`);
        return;
    }
    console.log(`${getTimestamp()} Found ${reminders.length} reminders.`);

    for (const reminder of reminders) {
        const rId = reminder.id;
        const state = syncState[rId];
        const listName = reminder.listName || "Apple Reminders Sync";
        
        // Get or Create the specific list for this reminder
        if (!listIdMap[listName]) {
            listIdMap[listName] = await tasksApi.getOrCreateTaskList(auth, listName);
        }
        const listId = listIdMap[listName];
        
        if (!state) {
            // New reminder we haven't synced yet
            // Only sync incomplete reminders to avoid filling Google Tasks with old history
            if (reminder.completed) continue;
            
            console.log(`[NEW] Syncing "${reminder.title}" to list "${listName}"`);
            const newTask = await tasksApi.createTask(auth, listId, reminder);
            
            if (newTask) {
                syncState[rId] = {
                    googleTaskId: newTask.id,
                    googleListId: listId,
                    lastSyncedCompletedStatus: false,
                    lastSyncedDueDate: reminder.dueDate || null,
                    isRecurring: reminder.isRecurring
                };
            }
        } else {
            // Already synced. Check for updates.
            // Note: If a user moves a reminder to a DIFFERENT list in Apple Reminders,
            // Google Tasks API doesn't easily support moving tasks between lists.
            // For simplicity, we just update it in its original synced list.
            const gTaskId = state.googleTaskId;
            const originalListId = state.googleListId || listId; // Fallback to current if missing in old state
            let stateUpdated = false;
            
            // Check completed status
            if (reminder.completed && !state.lastSyncedCompletedStatus) {
                console.log(`[COMPLETED] Marking "${reminder.title}" as completed.`);
                await tasksApi.markTaskCompleted(auth, originalListId, gTaskId, reminder.completionDate);
                
                state.lastSyncedCompletedStatus = true;
                stateUpdated = true;
            }
            
            // Handle recurrence logic
            if (!reminder.completed && state.isRecurring) {
                if (state.lastSyncedCompletedStatus || (reminder.dueDate || null) !== state.lastSyncedDueDate) {
                    console.log(`[RECURRENCE] New instance of "${reminder.title}" found. Creating new Google Task.`);
                    
                    if (!state.lastSyncedCompletedStatus) {
                        await tasksApi.markTaskCompleted(auth, originalListId, gTaskId);
                    }
                    
                    const newTask = await tasksApi.createTask(auth, listId, reminder); // Create in current list
                    if (newTask) {
                        syncState[rId] = {
                            googleTaskId: newTask.id,
                            googleListId: listId,
                            lastSyncedCompletedStatus: false,
                            lastSyncedDueDate: reminder.dueDate || null,
                            isRecurring: true
                        };
                        stateUpdated = true;
                    }
                }
            } else if (!reminder.completed) {
                // Regular update
                if ((reminder.dueDate || null) !== state.lastSyncedDueDate) {
                     console.log(`[UPDATE] Updating due date for "${reminder.title}".`);
                     await tasksApi.updateTask(auth, originalListId, gTaskId, reminder);
                     state.lastSyncedDueDate = reminder.dueDate || null;
                     stateUpdated = true;
                }
            }
        }
    }
    
    await saveSyncState();
    console.log(`${getTimestamp()} --- Sync Complete ---`);
}

sync().catch(err => {
    if (err.message === 'invalid_grant' || (err.response && err.response.data && err.response.data.error === 'invalid_grant')) {
        console.error(`${getTimestamp()} [AUTHORIZATION ERROR] Google OAuth token expired or revoked.`);
        console.error(`${getTimestamp()} Please run 'node index.js' manually in your terminal to re-authenticate.`);
    } else {
        console.error(`${getTimestamp()} [ERROR]`, err);
    }
});
