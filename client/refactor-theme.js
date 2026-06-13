const fs = require('fs');
const path = require('path');

const directoriesToProcess = [
  path.join(__dirname, 'src', 'pages'),
  path.join(__dirname, 'src', 'components')
];

const excludeFiles = ['AppLayout.tsx', 'Sidebar.tsx', 'App.tsx'];

const replacements = [
  { regex: /\bbg-dark-400\b/g, replacement: 'bg-slate-50 dark:bg-dark-400' },
  { regex: /\bbg-dark-300\b/g, replacement: 'bg-white dark:bg-dark-300' },
  { regex: /\bbg-dark-200\b/g, replacement: 'bg-slate-100 dark:bg-dark-200' },
  { regex: /\bbg-dark-100\b/g, replacement: 'bg-slate-200 dark:bg-dark-100' },
  { regex: /\btext-white\b/g, replacement: 'text-slate-900 dark:text-white' },
  { regex: /\btext-slate-200\b/g, replacement: 'text-slate-800 dark:text-slate-200' },
  { regex: /\btext-slate-300\b/g, replacement: 'text-slate-700 dark:text-slate-300' },
  { regex: /\btext-slate-400\b/g, replacement: 'text-slate-600 dark:text-slate-400' },
  { regex: /\bborder-slate-700\/50\b/g, replacement: 'border-slate-200 dark:border-slate-700/50' },
  { regex: /\bborder-white\/\[0\.05\]\b/g, replacement: 'border-slate-200 dark:border-white/[0.05]' },
  { regex: /\bfrom-dark-300\b/g, replacement: 'from-slate-50 dark:from-dark-300' },
  { regex: /\bbg-slate-800\b/g, replacement: 'bg-slate-200 dark:bg-slate-800' }
];

function processFile(filePath) {
  if (excludeFiles.includes(path.basename(filePath))) {
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // We should make sure we don't double replace.
  // If the file already contains "dark:bg-dark-400", we should skip replacing "bg-dark-400" blindly.
  // A simple hack: replace them temporarily with placeholders?
  // Or just rely on the fact that they don't have "dark:" prefixes yet.
  
  replacements.forEach(({ regex, replacement }) => {
    // Only replace if it doesn't already have a dark: prefix right before it
    // Using a negative lookbehind if supported or just simple replace
    // Since we know these files don't have dark mode yet, simple replace is mostly fine.
    // Wait, some classes might appear inside the replacement string itself, so we must be careful not to run it twice.
    
    // Instead of regex replace directly, let's parse class strings? Too complex.
    // Let's use simple string replacement logic carefully.
    
    // A safer regex: match the target class ONLY if it's not preceded by "dark:"
    const safeRegex = new RegExp(`(?<!dark:)${regex.source}`, 'g');
    content = content.replace(safeRegex, replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
      processFile(fullPath);
    }
  }
}

directoriesToProcess.forEach(dir => {
  if (fs.existsSync(dir)) {
    processDirectory(dir);
  }
});

console.log('Finished refactoring.');
