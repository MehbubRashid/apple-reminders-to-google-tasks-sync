# Apple Reminders to Google Tasks Sync

A Node.js utility to automatically synchronize your Apple Reminders to Google Tasks. This script maintains the list structure, creates new tasks for recurrences, and syncs completion status.

> [!IMPORTANT]
> **Requirement:** This script requires a **macOS** environment to run, as it utilizes a native Swift binary to interface with the macOS `EventKit` framework.

## Features

- **Multi-list Support:** Automatically creates and syncs tasks into the corresponding lists in Google Tasks.
- **Recurrence Handling:** Since the Google Tasks API does not support creating recurring tasks, this script detects when a recurring Apple Reminder is completed and generates the next instance in Google Tasks.
- **Completion Sync:** Marking a reminder as complete on your Mac will mark the corresponding task as complete in Google Tasks.
- **Native Performance:** Uses a compiled Swift helper for fast and reliable access to the Reminders database.

## Prerequisites

- **macOS** (Tested on Sequoia/Sonoma)
- **Node.js** (v18+)
- **Swift** (included with Xcode Command Line Tools)
- A Google Cloud Project with the **Google Tasks API** enabled.

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mehbubrashid/apple-reminders-to-google-tasks-sync.git
   cd apple-reminders-to-google-tasks-sync
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile the Swift helper:**
   ```bash
   swiftc reminders.swift -o fetch_reminders
   ```

4. **Add Google Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com).
   - Create a project and enable **Google Tasks API**.
   - Create **OAuth 2.0 Client ID** (Desktop App).
   - Download the JSON and save it as `credentials.json` in the project root.

5. **Authorize:**
   Run the script once to authorize your Google account:
   ```bash
   node index.js
   ```
   Follow the URL in the terminal, authenticate, and paste the code back into the prompt.

## Automation (Cron Job)

To keep your tasks synced automatically in the background, you can set up a cron job.

1. Run the setup script to create a wrapper:
   ```bash
   chmod +x setup-cron.sh
   ./setup-cron.sh
   ```
2. Copy the resulting cron line and add it to your crontab:
   ```bash
   crontab -e
   ```
   Example line (runs every 15 mins):
   ```bash
   */15 * * * * "/Users/rabu/Projects/sync reminders/run_sync.sh"
   ```

## License
MIT
