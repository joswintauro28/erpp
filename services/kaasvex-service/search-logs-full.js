const fs = require('fs');

const logPath = 'C:\\Users\\Nikhil\\.gemini\\antigravity-ide\\brain\\2549612c-5efe-48ba-a10b-79bb047df277\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.log('Log file does not exist');
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
const results = [];

lines.forEach((l, i) => {
  if (l.toLowerCase().includes('anna@email.com') || l.toLowerCase().includes('emm@email.com')) {
    results.push(`--- Line ${i} ---`);
    results.push(l);
  }
});

fs.writeFileSync('search-results.txt', results.join('\n'), 'utf8');
console.log('Results written to search-results.txt');

