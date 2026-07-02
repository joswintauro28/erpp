const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Nikhil\\.gemini\\antigravity-ide\\brain\\2549612c-5efe-48ba-a10b-79bb047df277\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.log('Log file does not exist');
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
console.log('Total lines:', lines.length);

lines.forEach((l, i) => {
  if (l.includes('browser_subagent') || l.includes('invoke_subagent')) {
    console.log(`${i}: ${l.substring(0, 1500)}`);
  }
});

