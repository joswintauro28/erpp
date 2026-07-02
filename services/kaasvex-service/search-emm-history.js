const fs = require('fs');

const logPath = 'C:\\Users\\Nikhil\\.gemini\\antigravity-ide\\brain\\2549612c-5efe-48ba-a10b-79bb047df277\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.log('Log file does not exist');
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
const results = [];

lines.forEach((l, i) => {
  if (l.toLowerCase().includes('emm@email.com') || l.toLowerCase().includes('emily')) {
    results.push(`Line ${i}: ${l}`);
  }
});

fs.writeFileSync('emm-search-results.txt', results.join('\n'), 'utf8');
console.log('Results written to emm-search-results.txt');

