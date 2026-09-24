const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const dashboardFiles = walk(path.join(__dirname, '../src/app/dashboard'));

dashboardFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const fileIssues = [];

  lines.forEach((line, idx) => {
    const isCardOrContainer = (line.includes('rounded-') || line.includes('shadow') || line.includes('p-4') || line.includes('p-5') || line.includes('p-6') || line.includes('panel-card') || line.includes('border') || line.includes('card'));
    if (!isCardOrContainer) return;

    // Issue 1: Hardcoded dark card / modal / panel without light mode equivalent
    const hasHardcodedDark = (
      /\bfrom-slate-900\b/.test(line) ||
      /\bbg-slate-900\b/.test(line) ||
      /\bbg-slate-950\b/.test(line) ||
      /\bbg-black\b/.test(line) ||
      /\bbg-\[#(0|1)[0-9a-fA-F]{5,}\]/.test(line)
    ) && !line.includes('dark:from-') && !line.includes('dark:bg-slate') && !line.includes('dark:bg-black') && !line.includes('dark:bg-[');

    const hasLightCounterpart = line.includes('bg-white') || line.includes('bg-slate-50') || line.includes('bg-slate-100') || line.includes('panel-card') || line.includes('glass-card') || line.includes('from-white') || line.includes('from-slate-50');

    if (hasHardcodedDark && !hasLightCounterpart) {
      fileIssues.push({ line: idx + 1, type: 'HARDCODED_DARK_BG', text: line.trim() });
    }

    // Issue 2: Solid bg-white card/container with no dark variant
    const hasSolidWhite = /\bbg-white\b/.test(line) && !line.includes('bg-white/') && !line.includes('bg-white-');
    const hasDarkBg = line.includes('dark:bg-') || line.includes('dark:bg[');
    if (hasSolidWhite && !hasDarkBg) {
      fileIssues.push({ line: idx + 1, type: 'SOLID_WHITE_NO_DARK', text: line.trim() });
    }

    // Issue 3: Solid bg-slate-50 or bg-slate-100 card without dark variant
    const hasSolidSlateLight = (/\bbg-slate-50\b/.test(line) || /\bbg-slate-100\b/.test(line)) && !line.includes('dark:bg-');
    if (hasSolidSlateLight && (line.includes('p-4') || line.includes('p-5') || line.includes('p-6') || line.includes('rounded-2xl') || line.includes('rounded-xl'))) {
      fileIssues.push({ line: idx + 1, type: 'SLATE_LIGHT_NO_DARK', text: line.trim() });
    }
  });

  if (fileIssues.length > 0) {
    const rel = path.relative(path.join(__dirname, '../src/app/dashboard'), file).replace(/\\/g, '/');
    console.log(`=== ${rel} (${fileIssues.length} issues) ===`);
    fileIssues.forEach(iss => console.log(`  [${iss.type}] L${iss.line}: ${iss.text.slice(0, 110)}`));
  }
});
