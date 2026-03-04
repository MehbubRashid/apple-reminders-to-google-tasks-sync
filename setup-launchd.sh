#!/bin/bash

PROJECT_DIR="/Users/rabu/Projects/sync reminders"
PLIST_NAME="com.user.remindersync.plist"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "Setting up launchd for Reminders Sync..."

# 1. Copy plist to LaunchAgents
cp "$PROJECT_DIR/$PLIST_NAME" "$PLIST_PATH"

# 2. Set permissions
chmod 644 "$PLIST_PATH"

# 3. Unload if already loaded
launchctl unload "$PLIST_PATH" 2>/dev/null

# 4. Load the agent
launchctl load "$PLIST_PATH"

echo "------------------------------------------------"
echo "LaunchAgent loaded successfully!"
echo "The script will run every 15 minutes."
echo ""
echo "To check status: launchctl list | grep remindersync"
echo "To run immediately: launchctl start com.user.remindersync"
echo "To stop: launchctl unload $PLIST_PATH"
echo ""
echo "IMPORTANT: Please remove the old cron job by running 'crontab -e' and deleting the line: */15 * * * * \"$PROJECT_DIR/run_sync.sh\""
echo "------------------------------------------------"
