
Create a command log for each project that records every dcm command executed against it.

## Implementation Plan

### Design

Each project gets a `log.jsonl` file (JSON Lines format) in its project directory (`projects/<slug>/log.jsonl`). Each line is a JSON object recording one command execution.

### Log entry format

```json
{"timestamp":"2026-02-19T10:30:00.000Z","command":"field create","args":{"project":"test","entityType":"node","bundle":"article","fieldType":"string","label":"Subtitle"},"success":true}
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/io/commandLog.js` | I/O: `appendLog(slug, entry)` and `readLog(slug, options)` functions |

### Files to Modify

| File | Change |
|------|--------|
| `src/io/fileSystem.js` | Add `getLogPath(slug)` helper |
| `src/cli/commands.js` | Add logging calls at the end of each successful command handler (after the operation, before output) |
| `index.mjs` | Add `dcm log` command to view the log |

### Steps

1. **Create `src/io/commandLog.js`**
   - `appendLog(slug, { command, args, success })` — appends a JSONL line with timestamp to `projects/<slug>/log.jsonl`
   - `readLog(slug, { limit, offset })` — reads and parses log entries, most recent first
   - Uses `fs.appendFileSync` for atomic appends

2. **Add logging to commands.js**
   - In each `cmd*` handler (e.g. `cmdBundleCreate`, `cmdFieldCreate`, etc.), after successful execution, call `appendLog(options.project, { command: 'bundle create', args: relevantOptions, success: true })`
   - On error, log with `success: false` and include `error: message`

3. **Add `dcm log` command**
   - `dcm log -p <project>` — shows recent log entries
   - `dcm log -p <project> --limit 50` — last 50 entries
   - `dcm log -p <project> --json` — JSON output

### Notes

- JSONL format is append-friendly and easy to parse line by line
- Log file is per-project, stored alongside project.json
- Both CLI and interactive mode commands should be logged