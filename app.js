// DeployBot-Agent — CI/CD Pipeline Simulation

const state = {
  deploying: false,
  currentStage: -1,
  deploymentId: 0
};

const stageDefs = [
  {
    name: 'Source', icon: '📋', id: 'source',
    logs: [
      { msg: 'Cloning repository...', cmd: true },
      { msg: 'git clone https://github.com/team/app.git', cmd: true },
      { msg: 'Checking out branch: main', info: true },
      { msg: 'Commit: feat: add payment gateway integration', info: true },
      { msg: 'Verified GPG signature: OK', success: true }
    ]
  },
  {
    name: 'Build', icon: '🔨', id: 'build',
    logs: [
      { msg: 'Installing dependencies...', cmd: true },
      { msg: 'npm ci --production', cmd: true },
      { msg: 'added 847 packages in 12.3s', info: true },
      { msg: 'Running build script...', step: true },
      { msg: 'webpack compiled successfully (0 errors)', success: true },
      { msg: 'Asset sizes: main.js (245KB), vendor.js (1.2MB)', info: true }
    ]
  },
  {
    name: 'Test', icon: '🧪', id: 'test',
    logs: [
      { msg: 'Running unit tests...', step: true },
      { msg: 'PASS tests/api/payment.test.js', success: true },
      { msg: 'PASS tests/unit/validation.test.js', success: true },
      { msg: 'PASS tests/integration/auth.test.js', success: true },
      { msg: 'Tests: 147 passed, 0 failed, 3 skipped', success: true },
      { msg: 'Running E2E tests...', step: true },
      { msg: 'PASS e2e/checkout.spec.ts', success: true },
      { msg: 'Coverage: 94.2% statements, 89.7% branches', info: true }
    ]
  },
  {
    name: 'Scan', icon: '🔒', id: 'scan',
    logs: [
      { msg: 'Running security scan...', step: true },
      { msg: 'npm audit: found 0 vulnerabilities', success: true },
      { msg: 'SAST scan: 0 critical, 0 high, 2 medium', warn: true },
      { msg: 'Docker image scan: no known CVEs detected', success: true },
      { msg: 'Code quality: A rating (SonarQube)', success: true }
    ]
  },
  {
    name: 'Deploy', icon: '🚀', id: 'deploy',
    logs: [
      { msg: 'Building Docker image...', cmd: true },
      { msg: 'docker build -t app:v2.4.1 .', cmd: true },
      { msg: 'Successfully built abc123def456', success: true },
      { msg: 'Pushing to ECR...', step: true },
      { msg: 'Push complete: 891234567890.dkr.ecr.us-east-1.amazonaws.com/app:v2.4.1', success: true },
      { msg: 'Updating Kubernetes deployment...', step: true },
      { msg: 'kubectl rollout status deployment/app', cmd: true },
      { msg: 'deployment "app" successfully rolled out', success: true }
    ]
  },
  {
    name: 'Verify', icon: '✅', id: 'verify',
    logs: [
      { msg: 'Running smoke tests...', step: true },
      { msg: 'GET /health → 200 OK (45ms)', success: true },
      { msg: 'GET /api/status → 200 OK (89ms)', success: true },
      { msg: 'POST /api/test-transaction → 200 OK (234ms)', success: true },
      { msg: 'All smoke tests passed!', success: true },
      { msg: 'Deployment v2.4.1 is LIVE in production', success: true }
    ]
  }
];

const history = [
  { id: 7, version: 'v2.4.0', hash: 'a3b2c1d', env: 'Production', status: 'success', time: '2h ago', duration: '4m 12s' },
  { id: 6, version: 'v2.3.9', hash: 'f4e5d6c', env: 'Production', status: 'success', time: '1d ago', duration: '3m 58s' },
  { id: 5, version: 'v2.3.9', hash: 'f4e5d6c', env: 'Staging', status: 'success', time: '1d ago', duration: '3m 42s' },
  { id: 4, version: 'v2.3.8', hash: '7g8h9i0', env: 'Production', status: 'failed', time: '3d ago', duration: '2m 15s' },
  { id: 3, version: 'v2.3.8', hash: '7g8h9i0', env: 'Production', status: 'success', time: '3d ago', duration: '4m 05s' },
  { id: 2, version: 'v2.3.7', hash: '1a2b3c4', env: 'Production', status: 'success', time: '5d ago', duration: '3m 30s' },
];

function addLog(msg, type = 'info') {
  const log = document.getElementById('logContent');
  const now = new Date();
  const ts = now.toTimeString().slice(0, 8) + '.' + String(now.getMilliseconds()).padStart(3, '0');
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `<span class="ts">[${ts}]</span> <span class="${type}">${msg}</span>`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function clearLogs() {
  document.getElementById('logContent').innerHTML = '';
}

function setStageStatus(index, status) {
  const stageEl = document.querySelectorAll('.stage')[index];
  if (!stageEl) return;
  stageEl.className = `stage ${status}`;
  const statusEl = stageEl.querySelector('.stage-status');
  const timeEl = stageEl.querySelector('.stage-time');

  const statusTexts = {
    pending: 'Pending',
    running: 'Running...',
    success: '✓ Passed',
    failed: '✗ Failed'
  };
  statusEl.textContent = statusTexts[status] || status;

  if (status === 'success' || status === 'running') {
    timeEl.textContent = status === 'success' ? `${Math.floor(Math.random() * 40 + 15)}s` : '...';
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function deploy() {
  if (state.deploying) return;
  state.deploying = true;

  clearLogs();
  state.deploymentId++;
  document.getElementById('btnDeploy').disabled = true;
  document.getElementById('btnDeploy').innerHTML = '⏳ Deploying...';

  addLog(`═══════════════════════════════════════════════════`, 'info');
  addLog(`DeployBot-Agent — Starting deployment #${state.deploymentId}`, 'info');
  addLog(`Pipeline: CI/CD → Build → Test → Scan → Deploy → Verify`, 'info');
  addLog(`═══════════════════════════════════════════════════`, 'info');

  // Reset all stages
  document.querySelectorAll('.stage').forEach((s, i) => setStageStatus(i, 'pending'));

  for (let i = 0; i < stageDefs.length; i++) {
    const stage = stageDefs[i];
    addLog(``, 'info');
    addLog(`▸ Stage ${i + 1}/${stageDefs.length}: ${stage.name}`, 'step');
    setStageStatus(i, 'running');

    for (const log of stage.logs) {
      await sleep(Math.random() * 400 + 200);
      const type = Object.keys(log).find(k => k !== 'msg' && log[k] === true) || 'info';
      addLog(`  ${type === 'cmd' ? '$' : '→'} ${log.msg}`, type);
    }

    // Simulate occasional failures (10% chance for demo)
    if (i === 3 && Math.random() < 0.1 && state.deploymentId % 3 === 0) {
      setStageStatus(i, 'failed');
      addLog(`  ✗ Stage ${stage.name} FAILED`, 'error');
      document.getElementById('btnDeploy').disabled = false;
      document.getElementById('btnDeploy').innerHTML = '🚀 Deploy';
      state.deploying = false;
      return;
    }

    setStageStatus(i, 'success');
    addLog(`  ✓ ${stage.name} completed successfully`, 'success');
  }

  addLog(``, 'info');
  addLog(`═══════════════════════════════════════════════════`, 'info');
  addLog(`✅ Deployment #${state.deploymentId} completed successfully!`, 'success');
  addLog(`Version: v2.4.${state.deploymentId} | Duration: ${Math.floor(Math.random() * 60 + 180)}s`, 'info');
  addLog(`═══════════════════════════════════════════════════`, 'info');

  document.getElementById('btnDeploy').disabled = false;
  document.getElementById('btnDeploy').innerHTML = '🚀 Deploy';
  state.deploying = false;
}

function renderHistory() {
  const tbody = document.getElementById('historyBody');
  tbody.innerHTML = '';
  history.forEach(h => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${h.id}</td>
      <td>${h.version}</td>
      <td class="commit-hash">${h.hash}</td>
      <td>${h.env}</td>
      <td><span class="status-badge ${h.status}">${h.status.toUpperCase()}</span></td>
      <td>${h.duration}</td>
      <td>${h.time}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Env tab click
document.querySelectorAll('.env-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.env-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

// Init
document.getElementById('btnDeploy').addEventListener('click', deploy);
renderHistory();
addLog('DeployBot-Agent v2.5 initialized', 'info');
addLog('Monitoring pipelines across 3 environments', 'info');
addLog('Ready to deploy', 'info');
