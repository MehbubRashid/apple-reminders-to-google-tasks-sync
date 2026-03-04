const { google } = require('googleapis');

/**
 * Ensures a specific task list exists or creates it, returning its ID.
 */
async function getOrCreateTaskList(auth, listName) {
  const service = google.tasks({ version: 'v1', auth });
  
  // Try to find the list first
  const res = await service.tasklists.list({ maxResults: 100 });
  const taskLists = res.data.items;
  
  if (taskLists) {
    const list = taskLists.find(l => l.title === listName);
    if (list) return list.id;
  }
  
  // Need to create it
  console.log(`Creating new Google Tasks List: ${listName}`);
  const created = await service.tasklists.insert({
    requestBody: {
      title: listName
    }
  });
  
  return created.data.id;
}

/**
 * Creates a new task in the specified list.
 */
async function createTask(auth, listId, taskData) {
  const service = google.tasks({ version: 'v1', auth });
  
  const payload = {
    title: taskData.title,
    notes: taskData.notes || '',
  };
  
  if (taskData.dueDate) {
    // Google Tasks API requires RFC 3339 format, which ISO string provides
    payload.due = taskData.dueDate;
  }
  
  if (taskData.completed) {
      payload.status = 'completed';
      if (taskData.completionDate) {
          payload.completed = taskData.completionDate;
      }
  }

  const res = await service.tasks.insert({
    tasklist: listId,
    requestBody: payload
  });
  
  return res.data;
}

/**
 * Updates an existing task by marking it as completed.
 */
async function markTaskCompleted(auth, listId, taskId, completionDate) {
  const service = google.tasks({ version: 'v1', auth });
  
  try {
      // First get the task to retain other properties if needed (Tasks API update overwrites)
      const getRes = await service.tasks.get({
          tasklist: listId,
          task: taskId
      });
      
      const task = getRes.data;
      task.status = 'completed';
      if (completionDate) task.completed = completionDate;
      
      const res = await service.tasks.update({
        tasklist: listId,
        task: taskId,
        requestBody: task
      });
      
      return res.data;
  } catch (e) {
      console.error(`Failed to mark task ${taskId} completed:`, e.message);
      return null;
  }
}

/**
 * Updates an existing task.
 */
async function updateTask(auth, listId, taskId, taskData) {
    const service = google.tasks({ version: 'v1', auth });
    
    try {
        const getRes = await service.tasks.get({
            tasklist: listId,
            task: taskId
        });
        
        const task = getRes.data;
        task.title = taskData.title;
        task.notes = taskData.notes || '';
        
        if (taskData.dueDate) {
          task.due = taskData.dueDate;
        } else {
            task.due = null;
        }
        
        const res = await service.tasks.update({
          tasklist: listId,
          task: taskId,
          requestBody: task
        });
        
        return res.data;
    } catch (e) {
        console.error(`Failed to update task ${taskId}:`, e.message);
        return null;
    }
}

module.exports = {
    getOrCreateTaskList,
    createTask,
    markTaskCompleted,
    updateTask
};
