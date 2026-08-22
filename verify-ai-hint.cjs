// Verify the AIHint shows on protected routes by injecting a fake user into
// localStorage before the React app boots, then asking Chrome to dump the DOM.
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const profileDir = path.join(os.tmpdir(), 'nutriscan-verify-' + Date.now());
fs.mkdirSync(profileDir, { recursive: true });

// Seed localStorage with a fake authenticated user so the Dashboard route
// renders inside the DesktopAppShell. The user payload mirrors the shape the
// backend would return for /auth/me.
const fakeUser = {
  id: 'verify-user',
  name: 'Verify User',
  email: 'verify@example.com',
  isPremium: true,
  role: 'admin',
  streak: 0,
  scans_used: 0,
  profile: {
    age: 30,
    height: 175,
    weight: 70,
    gender: 'Male',
    conditions: [],
    goals: [],
  },
};

const seedHtml = `<!doctype html><html><body><script>
  try {
    localStorage.setItem('nutriscan_auth', ${JSON.stringify(JSON.stringify(fakeUser))});
    localStorage.setItem('nutriscan_profile', ${JSON.stringify(JSON.stringify(fakeUser.profile))});
    localStorage.setItem('fitscan_language', 'en');
  } catch (e) {}
  location.replace('http://localhost:5273/dashboard');
</script></body></html>`;

const seedPath = path.join(profileDir, 'seed.html');
fs.writeFileSync(seedPath, seedHtml);

// Open the seed page first (sets localStorage for this origin), then the
// dashboard. We need two passes because Chrome stores localStorage per origin.
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const common = [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=' + profileDir,
  '--virtual-time-budget=8000',
];

console.log('Pass 1: seed localStorage...');
spawnSync(chrome, common.concat(['--dump-dom', 'file:///' + seedPath.replace(/\\/g, '/')]), { stdio: 'inherit' });

console.log('Pass 2: load /dashboard and look for AIHint...');
const dump = spawnSync(chrome, common.concat(['--dump-dom', 'http://localhost:5273/dashboard']), { encoding: 'utf8' });

if (dump.stdout && dump.stdout.includes('AI-assisted recommendations')) {
  console.log('\nOK: AIHint rendered on /dashboard.');
  console.log('Match count: ' + (dump.stdout.match(/AI-assisted recommendations/g) || []).length);
} else {
  console.error('\nFAIL: AIHint not found on /dashboard.');
  console.error('First 500 chars of stdout:', (dump.stdout || '').slice(0, 500));
  process.exit(1);
}
