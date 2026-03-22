const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'src/pages/PublicCallPage.tsx',
  'src/pages/LinksPage.tsx',
  'src/pages/LandingPage.tsx',
  'src/pages/DashboardHome.tsx',
  'src/pages/InboxPage.tsx',
  'src/pages/OnboardingPage.tsx'
];

const replacements = [
  { regex: /bg-zinc-950/g, replacement: 'bg-[var(--bg-main)]' },
  { regex: /bg-zinc-900/g, replacement: 'bg-[var(--bg-card)]' },
  { regex: /bg-zinc-800/g, replacement: 'bg-[var(--border-main)]' },
  { regex: /text-white/g, replacement: 'text-[var(--text-main)]' },
  { regex: /text-zinc-500/g, replacement: 'text-[var(--text-muted)]' },
  { regex: /text-zinc-400/g, replacement: 'text-[var(--text-muted)]' },
  { regex: /text-zinc-200/g, replacement: 'text-[var(--text-main)]' },
  { regex: /text-zinc-950/g, replacement: 'text-white' },
  { regex: /border-zinc-900/g, replacement: 'border-[var(--border-main)]' },
  { regex: /border-zinc-800/g, replacement: 'border-[var(--border-main)]' },
  { regex: /border-zinc-700/g, replacement: 'border-[var(--border-main)]' },
  { regex: /text-zinc-300/g, replacement: 'text-[var(--text-main)]' },
  { regex: /bg-zinc-700/g, replacement: 'bg-[var(--border-main)]' },
  { regex: /bg-zinc-950\/50/g, replacement: 'bg-[var(--bg-main)]/50' },
  { regex: /bg-zinc-900\/50/g, replacement: 'bg-[var(--bg-card)]/50' },
  { regex: /bg-zinc-800\/80/g, replacement: 'bg-[var(--bg-card)]/80' },
  { regex: /border-zinc-800\/50/g, replacement: 'border-[var(--border-main)]/50' },
  { regex: /border-zinc-700\/50/g, replacement: 'border-[var(--border-main)]/50' },
];

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    replacements.forEach(({ regex, replacement }) => {
      content = content.replace(regex, replacement);
    });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
