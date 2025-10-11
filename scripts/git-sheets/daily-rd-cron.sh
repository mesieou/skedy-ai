#!/bin/bash

# Daily R&D logging cron job
# Runs at midnight to log the previous day's R&D activities

# Get yesterday's date
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)

# Change to project directory
cd /Users/juanbernal/Coding/skedy-ai

# Log yesterday's R&D activities
echo "$(date): Logging R&D activities for $YESTERDAY" >> /tmp/rd-cron.log
npx tsx scripts/git-sheets/simple-rd-system.ts log-daily --date=$YESTERDAY >> /tmp/rd-cron.log 2>&1

if [ $? -eq 0 ]; then
    echo "$(date): ✅ R&D activities logged successfully for $YESTERDAY" >> /tmp/rd-cron.log
else
    echo "$(date): ❌ Failed to log R&D activities for $YESTERDAY" >> /tmp/rd-cron.log
fi
