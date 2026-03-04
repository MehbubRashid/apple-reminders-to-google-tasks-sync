#!/bin/bash

# Configuration
PROJECT_DIR="/Users/rabu/Projects/sync reminders"
LOG_FILE="$PROJECT_DIR/sync.log"
NODE_PATH=$(which node)

# Create the wrapper script
cat << EOF > "$PROJECT_DIR/run_sync.sh"
#!/bin/bash
cd "$PROJECT_DIR"
$NODE_PATH index.js >> "$LOG_FILE" 2>&1
EOF

chmod +x "$PROJECT_DIR/run_sync.sh"

echo "Wrapper script created at $PROJECT_DIR/run_sync.sh"
echo "------------------------------------------------"
echo "To run this automatically every 15 minutes, add this line to your crontab:"
echo ""
echo "*/15 * * * * \"$PROJECT_DIR/run_sync.sh\""
echo ""
echo "You can edit your crontab by running: crontab -e"
