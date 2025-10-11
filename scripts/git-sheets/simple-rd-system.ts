#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';
import { execSync } from 'child_process';

// Load configuration
const configPath = path.join(__dirname, 'rd-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

interface DailyLogEntry {
  date: string;           // YYYY-MM-DD
  engineer: string;       // Developer name
  rdActivity: string;     // Main R&D activity for the day
  taskSummary: string;    // Summary of R&D work done that day
  hoursWorked: number;    // Manual entry - hours for that day
  technicalNotes: string; // Technical details and achievements
}

interface MonthlySummary {
  month: string;          // YYYY-MM
  engineer: string;       // Developer name
  rdActivity: string;     // R&D activity type
  totalHours: number;     // Total hours for this activity this month
  keyAchievements: string; // Main achievements for the month
  auditDescription: string; // Audit-friendly description
}

class SimpleRDSystem {
  private sheets: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private auth: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    const serviceAccountKeyPath = path.join(__dirname, 'service-account-key.json');
    const keyFileContent = fs.readFileSync(serviceAccountKeyPath, 'utf-8');
    const credentials = JSON.parse(keyFileContent);

    this.auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  private getCommitsForDay(date: string): Array<{hash: string, message: string, files: string[]}> {
    try {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      const gitLogCmd = `git log --since="${date}" --until="${nextDayStr}" --pretty=format:"%H|%s"`;
      const commitOutput = execSync(gitLogCmd, { encoding: 'utf-8' }).trim();

      if (!commitOutput) return [];

      const commits = [];
      const commitLines = commitOutput.split('\n');

      for (const line of commitLines) {
        const [hash, message] = line.split('|');

        // Get files changed
        const filesCmd = `git show --name-only --pretty=format: ${hash}`;
        const filesOutput = execSync(filesCmd, { encoding: 'utf-8' }).trim();
        const files = filesOutput ? filesOutput.split('\n').filter(f => f.trim()) : [];

        commits.push({
          hash: hash.substring(0, 8),
          message: message || '',
          files
        });
      }

      return commits;
    } catch {
      return [];
    }
  }

  private determineMainRDActivity(commits: Array<{message: string, files: string[]}>): string {
    if (commits.length === 0) return 'AI Model Integration & Evaluation';

    const allText = commits.map(c => c.message.toLowerCase()).join(' ');
    const allFiles = commits.flatMap(c => c.files).join(' ').toLowerCase();

    let bestMatch = 'AI Model Integration & Evaluation';
    let maxScore = 0;

    for (const [activityType, info] of Object.entries(config.rdActivities) as [string, {keywords: string[]}][]) {
      let score = 0;

      for (const keyword of info.keywords) {
        if (allText.includes(keyword)) score += 2;
        if (allFiles.includes(keyword)) score += 1;
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = activityType;
      }
    }

    return bestMatch;
  }

  private createDailyTaskSummary(commits: Array<{message: string, files: string[]}>, activity: string): string {
    if (commits.length === 0) return 'R&D development activities';

    const activityInfo = config.rdActivities[activity];

    // Extract key themes from commit messages
    const messages = commits.map(c => c.message).join(' ');
    const keyTerms = this.extractKeyTerms(messages);

    // Create R&D focused summary
    let summary = `${activityInfo.auditDescription.split('.')[0]}. `;

    if (keyTerms.length > 0) {
      summary += `Focus areas included ${keyTerms.join(', ')}. `;
    }

    const fileTypes = this.analyzeFileTypes(commits.flatMap(c => c.files));
    if (fileTypes.length > 0) {
      summary += `Technical implementation involved ${fileTypes.join(', ')} development. `;
    }

    summary += `Completed ${commits.length} development iteration${commits.length > 1 ? 's' : ''} advancing the research objectives.`;

    return summary;
  }

  private extractKeyTerms(text: string): string[] {
    const cleanText = text.toLowerCase()
      .replace(/feat:|fix:|chore:|docs:/g, '')
      .replace(/[^\w\s]/g, ' ');

    const terms = cleanText.split(/\s+/)
      .filter(term => term.length > 3)
      .filter(term => !['with', 'from', 'that', 'this', 'have', 'been', 'will', 'were', 'they'].includes(term))
      .reduce((acc, term) => {
        acc[term] = (acc[term] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(terms)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([term]) => term);
  }

  private analyzeFileTypes(files: string[]): string[] {
    const types = new Set<string>();

    files.forEach(file => {
      const ext = file.split('.').pop()?.toLowerCase();

      if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
        types.add('AI system architecture');
      } else if (['py'].includes(ext || '')) {
        types.add('machine learning algorithms');
      } else if (['json', 'yaml', 'yml'].includes(ext || '')) {
        types.add('system configuration');
      } else if (file.includes('test') || file.includes('spec')) {
        types.add('experimental validation');
      } else if (['md', 'txt'].includes(ext || '')) {
        types.add('research documentation');
      }
    });

    return Array.from(types);
  }

  private createTechnicalNotes(commits: Array<{hash: string, message: string}>): string {
    const commitSummary = commits
      .slice(0, 5) // Limit to 5 most recent
      .map(c => `${c.hash}: ${c.message.substring(0, 50)}`)
      .join('; ');

    return `Development commits: ${commitSummary}${commits.length > 5 ? ` (and ${commits.length - 5} more)` : ''}`;
  }

  private getRawAuthorName(commitHash: string): string {
    try {
      const authorCmd = `git show --format="%an" --no-patch ${commitHash}`;
      return execSync(authorCmd, { encoding: 'utf-8' }).trim();
    } catch {
      return 'Unknown';
    }
  }

  private mapAuthorName(rawAuthor: string): string {
    const authorMapping = config.authorMapping || {};
    return authorMapping[rawAuthor] || rawAuthor;
  }

  public async logDailyActivity(date?: string): Promise<void> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    console.log(`🔬 Processing R&D activities for ${targetDate}...`);

    const commits = this.getCommitsForDay(targetDate);

    if (commits.length === 0) {
      console.log('No development activity found for this date.');
      return;
    }

    console.log(`📝 Found ${commits.length} commits for ${targetDate}`);

    // Group commits by mapped author name (to avoid duplicates)
    const commitsByAuthor = new Map<string, Array<{hash: string, message: string, files: string[]}>>();

    commits.forEach(commit => {
      const rawAuthor = this.getRawAuthorName(commit.hash);
      const mappedAuthor = this.mapAuthorName(rawAuthor);

      if (!commitsByAuthor.has(mappedAuthor)) {
        commitsByAuthor.set(mappedAuthor, []);
      }
      commitsByAuthor.get(mappedAuthor)!.push(commit);
    });

    // Create daily log entries
    const dailyEntries: DailyLogEntry[] = [];

    for (const [author, authorCommits] of commitsByAuthor.entries()) {
      const rdActivity = this.determineMainRDActivity(authorCommits);
      const taskSummary = this.createDailyTaskSummary(authorCommits, rdActivity);
      const technicalNotes = this.createTechnicalNotes(authorCommits);

      dailyEntries.push({
        date: targetDate,
        engineer: author,
        rdActivity,
        taskSummary,
        hoursWorked: 0, // Manual entry required
        technicalNotes
      });
    }

    // Check if entries already exist for this date
    const existingEntries = await this.checkExistingEntries(targetDate);
    const newEntries = dailyEntries.filter(entry =>
      !existingEntries.some(existing =>
        existing.date === entry.date && existing.engineer === entry.engineer
      )
    );

    if (newEntries.length === 0) {
      console.log('✅ Daily entries already exist for this date');
      return;
    }

    // Add to main log sheet
    await this.addDailyEntries(newEntries);

    console.log(`✅ Added ${newEntries.length} daily R&D log entries`);

    // Show summary
    console.log('\n📊 Daily R&D Summary:');
    newEntries.forEach(entry => {
      console.log(`👤 ${entry.engineer}`);
      console.log(`🎯 Activity: ${entry.rdActivity}`);
      console.log(`📋 Summary: ${entry.taskSummary.substring(0, 100)}...`);
      console.log('⏰ Hours: [Manual entry required]');
      console.log('');
    });
  }

  private async checkExistingEntries(date: string): Promise<DailyLogEntry[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheet.id,
        range: 'rd-daily-logs!A:F',
      });

      const values = response.data.values || [];
      if (values.length <= 1) return [];

      return values.slice(1)
        .filter((row: string[]) => row[0] === date)
        .map((row: string[]) => ({
          date: row[0] || '',
          engineer: row[1] || '',
          rdActivity: row[2] || '',
          taskSummary: row[3] || '',
          hoursWorked: parseFloat(row[4]) || 0,
          technicalNotes: row[5] || ''
        }));

    } catch {
      return [];
    }
  }

  private async addDailyEntries(entries: DailyLogEntry[]): Promise<void> {
    const values = entries.map(entry => [
      entry.date,
      entry.engineer,
      entry.rdActivity,
      entry.taskSummary,
      entry.hoursWorked || '', // Empty for manual entry
      entry.technicalNotes
    ]);

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheet.id,
      range: 'rd-daily-logs!A:F',
      valueInputOption: 'RAW',
      resource: { values }
    });
  }

  public async generateMonthlySummaries(month?: string): Promise<void> {
    const targetMonth = month || new Date().toISOString().substring(0, 7); // YYYY-MM

    console.log(`📊 Generating monthly R&D summary for ${targetMonth}...`);

    // Read daily logs for the month
    const dailyLogs = await this.readDailyLogsForMonth(targetMonth);

    if (dailyLogs.length === 0) {
      console.log('No daily logs found for this month.');
      return;
    }

    console.log(`📝 Processing ${dailyLogs.length} daily log entries`);

    // Group by engineer and activity
    const summaryMap = new Map<string, MonthlySummary>();

    dailyLogs.forEach(log => {
      const key = `${log.engineer}-${log.rdActivity}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          month: targetMonth,
          engineer: log.engineer,
          rdActivity: log.rdActivity,
          totalHours: 0,
          keyAchievements: '',
          auditDescription: config.rdActivities[log.rdActivity]?.auditDescription || ''
        });
      }

      const summary = summaryMap.get(key)!;
      summary.totalHours += log.hoursWorked;
    });

    // Generate key achievements
    for (const summary of summaryMap.values()) {
      const activityLogs = dailyLogs.filter(log =>
        log.engineer === summary.engineer && log.rdActivity === summary.rdActivity
      );

      summary.keyAchievements = this.generateKeyAchievements(activityLogs);
    }

    const summaries = Array.from(summaryMap.values());

    // Write to summary sheet
    await this.writeMonthlySummaries(summaries);

    console.log(`✅ Generated ${summaries.length} monthly summaries`);

    // Display summary
    console.log('\n📊 Monthly R&D Summary:');
    console.log('Engineer | Activity | Hours | Key Achievements');
    console.log('---------|----------|-------|----------------');

    summaries.forEach(summary => {
      const achievements = summary.keyAchievements.substring(0, 40) + '...';
      console.log(`${summary.engineer.padEnd(8)} | ${summary.rdActivity.substring(0, 15).padEnd(15)} | ${summary.totalHours.toString().padStart(5)} | ${achievements}`);
    });
  }

  private async readDailyLogsForMonth(month: string): Promise<DailyLogEntry[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheet.id,
        range: 'rd-daily-logs!A:F',
      });

      const values = response.data.values || [];
      if (values.length <= 1) return [];

      return values.slice(1)
        .filter((row: string[]) => row[0] && row[0].startsWith(month))
        .map((row: string[]) => ({
          date: row[0] || '',
          engineer: row[1] || '',
          rdActivity: row[2] || '',
          taskSummary: row[3] || '',
          hoursWorked: parseFloat(row[4]) || 0,
          technicalNotes: row[5] || ''
        }))
        .filter((entry: DailyLogEntry) => entry.hoursWorked > 0); // Only include entries with hours

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error reading daily logs:', errorMessage);
      return [];
    }
  }

  private generateKeyAchievements(logs: DailyLogEntry[]): string {
    const achievements = logs
      .map(log => log.taskSummary.split('.')[0])
      .filter(achievement => achievement.length > 20)
      .slice(0, 3);

    return achievements.join('. ') + (achievements.length > 0 ? '.' : 'Ongoing R&D development activities.');
  }

  private async writeMonthlySummaries(summaries: MonthlySummary[]): Promise<void> {
    // First, remove existing summaries for this month
    const month = summaries[0]?.month;
    if (month) {
      await this.removeExistingSummaries(month);
    }

    const values = summaries.map(summary => [
      summary.month,
      summary.engineer,
      summary.rdActivity,
      summary.totalHours,
      summary.keyAchievements,
      summary.auditDescription
    ]);

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheet.id,
      range: 'rd-monthly-summaries!A:F',
      valueInputOption: 'RAW',
      resource: { values }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async removeExistingSummaries(_month: string): Promise<void> {
    // Implementation would filter out existing entries for the month
    // For now, we'll just append (user can manually clean up duplicates)
  }

  public async setupSimpleRDSheets(): Promise<void> {
    console.log('🔬 Setting up simplified R&D logging system...\n');

    // Daily logs sheet
    const dailyHeaders = [
      'Date',
      'Engineer',
      'R&D Activity Type',
      'Task Summary',
      'Hours Worked',
      'Technical Notes'
    ];

    // Monthly summaries sheet
    const summaryHeaders = [
      'Month',
      'Engineer',
      'R&D Activity Type',
      'Total Hours',
      'Key Achievements',
      'Audit Description'
    ];

    await this.ensureSheetExists('rd-daily-logs', dailyHeaders);
    await this.ensureSheetExists('rd-monthly-summaries', summaryHeaders);

    console.log('✅ Simple R&D system ready!');
    console.log('\n📋 Usage:');
    console.log('  npm run rd-log-today     # Log today\'s R&D activities');
    console.log('  npm run rd-log-date      # Log specific date');
    console.log('  npm run rd-monthly       # Generate monthly summary');
  }

  private async ensureSheetExists(sheetName: string, headers: string[]): Promise<void> {
    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: config.spreadsheet.id,
      });

      const existingSheets = spreadsheet.data.sheets || [];
      const sheetExists = existingSheets.some((sheet: {properties?: {title?: string}}) => sheet.properties?.title === sheetName);

      if (!sheetExists) {
        console.log(`📋 Creating sheet: ${sheetName}`);

        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: config.spreadsheet.id,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: headers.length
                  }
                }
              }
            }]
          }
        });

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: config.spreadsheet.id,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [headers] }
        });

        console.log(`✅ Created ${sheetName}`);
      } else {
        console.log(`✅ Sheet ${sheetName} already exists`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error setting up ${sheetName}:`, errorMessage);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const date = args.find(arg => arg.startsWith('--date='))?.split('=')[1];
  const month = args.find(arg => arg.startsWith('--month='))?.split('=')[1];

  const rdSystem = new SimpleRDSystem();

  switch (command) {
    case 'setup':
      await rdSystem.setupSimpleRDSheets();
      break;
    case 'log-daily':
      await rdSystem.logDailyActivity(date);
      break;
    case 'monthly-summary':
      await rdSystem.generateMonthlySummaries(month);
      break;
    default:
      await rdSystem.logDailyActivity(); // Default: log today
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Simple R&D system failed:', error);
    process.exit(1);
  });
}

export { SimpleRDSystem };
