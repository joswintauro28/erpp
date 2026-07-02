const fs = require('fs');

const logPath = 'C:\\Users\\Nikhil\\.gemini\\antigravity-ide\\brain\\2549612c-5efe-48ba-a10b-79bb047df277\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.log('Log file does not exist');
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (i >= 4400 && i <= 4650) {
    if (l.toLowerCase().includes('emm') || l.toLowerCase().includes('ester') || l.toLowerCase().includes('signup')) {
      console.log(`Line ${i}: ${l.substring(0, 500)}`);
    }
  }
});
