/* DeployBot-Agent v2.0 — Full CI/CD Deployment Simulator */

(function () {
  'use strict';

  // ─── DOM References ─────────────────────────────────────
  var repoName = document.getElementById('repo-name');
  var branchName = document.getElementById('branch-name');
  var envSelect = document.getElementById('env-select');
  var commitMsg = document.getElementById('commit-msg');
  var deployNotes = document.getElementById('deploy-notes');
  var stagesConfigList = document.getElementById('stages-config-list');
  var envVarsList = document.getElementById('env-vars-list');
  var addEnvBtn = document.getElementById('add-env-btn');
  var importEnvBtn = document.getElementById('import-env-btn');
  var exportEnvBtn = document.getElementById('export-env-btn');
  var envFileInput = document.getElementById('env-file-input');
  var deployBtn = document.getElementById('deploy-btn');
  var stopBtn = document.getElementById('stop-btn');
  var rollbackBtn = document.getElementById('rollback-btn');
  var clearLogBtn = document.getElementById('clear-log-btn');
  var progressSection = document.getElementById('progress-section');
  var deployBar = document.getElementById('deploy-bar');
  var deployPercent = document.getElementById('deploy-percent');
  var deployTimer = document.getElementById('deploy-timer');
  var stagesProgress = document.getElementById('stages-progress');
  var logSection = document.getElementById('log-section');
  var logContainer = document.getElementById('log-container');
  var healthSection = document.getElementById('health-section');
  var healthSummary = document.getElementById('health-summary');
  var healthResults = document.getElementById('health-results');
  var recheckBtn = document.getElementById('recheck-btn');
  var historyList = document.getElementById('history-list');
  var historyCount = document.getElementById('history-count');
  var historyFilter = document.getElementById('history-filter');
  var clearHistoryBtn = document.getElementById('clear-history-btn');

  // ─── State ──────────────────────────────────────────────
  var DEFAULT_STAGES = [
    { name: 'build', label: '📦 Build', enabled: true, duration: [2000, 4000], failChance: 0.05 },
    { name: 'lint', label: '🔍 Lint', enabled: true, duration: [1000, 2000], failChance: 0.08 },
    { name: 'test', label: '🧪 Test', enabled: true, duration: [3000, 6000], failChance: 0.10 },
    { name: 'security', label: '🔒 Security', enabled: true, duration: [1500, 3000], failChance: 0.05 },
    { name: 'staging', label: '📋 Staging', enabled: true, duration: [2000, 4000], failChance: 0.03 },
    { name: 'production', label: '🚀 Production', enabled: true, duration: [3000, 5000], failChance: 0.02 },
  ];

  var stages = JSON.parse(JSON.stringify(DEFAULT_STAGES));
  var envVars = [
    { key: 'NODE_ENV', value: 'production', secret: false },
    { key: 'API_URL', value: 'https://api.example.com', secret: false },
    { key: 'LOG_LEVEL', value: 'info', secret: false },
    { key: 'DATABASE_URL', value: 'postgresql://***', secret: true },
  ];

  var deployRunning = false;
  var deployAborted = false;
  var currentDeployId = null;
  var timerInterval = null;
  var allLogEntries = [];
  var lastSuccessfulDeploy = null;
  var logFilter = 'all';
  var logSearchTerm = '';

  // ─── Initialize ─────────────────────────────────────────
  renderStagesConfig();
  renderEnvVars();
  renderHistory();
  setupLogFilters();

  // ─── Stage Configuration ────────────────────────────────
  function renderStagesConfig() {
    stagesConfigList.innerHTML = stages.map(function (s, i) {
      return '<div class="stage-config-row' + (s.enabled ? ' enabled' : '') + '">' +
        '<span class="stage-name">' + s.label + '</span>' +
        '<div class="stage-toggle' + (s.enabled ? ' active' : '') + '" data-idx="' + i + '" title="Toggle ' + s.name + '"></div>' +
        '<label>Min (s) <input type="number" value="' + (s.duration[0] / 1000).toFixed(1) + '" data-idx="' + i + '" data-field="min" min="0.5" step="0.5"></label>' +
        '<label>Max (s) <input type="number" value="' + (s.duration[1] / 1000).toFixed(1) + '" data-idx="' + i + '" data-field="max" min="0.5" step="0.5"></label>' +
        '<label>Fail % <input type="number" value="' + Math.round(s.failChance * 100) + '" data-idx="' + i + '" data-field="fail" min="0" max="100" step="5"></label>' +
      '</div>';
    }).join('');

    stagesConfigList.querySelectorAll('.stage-toggle').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = Number(el.dataset.idx);
        stages[idx].enabled = !stages[idx].enabled;
        renderStagesConfig();
      });
    });

    stagesConfigList.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('change', function () {
        var idx = Number(input.dataset.idx);
        var field = input.dataset.field;
        var val = parseFloat(input.value);
        if (field === 'min') stages[idx].duration[0] = val * 1000;
        if (field === 'max') stages[idx].duration[1] = val * 1000;
        if (field === 'fail') stages[idx].failChance = val / 100;
      });
    });
  }

  // ─── Environment Variables ──────────────────────────────
  function renderEnvVars() {
    envVarsList.innerHTML = envVars.map(function (v, i) {
      return '<div class="env-var-row">' +
        '<label>Key <input type="text" value="' + esc(v.key) + '" data-idx="' + i + '" data-field="key"></label>' +
        '<label>Value <input type="' + (v.secret ? 'password' : 'text') + '" value="' + esc(v.value) + '" data-idx="' + i + '" data-field="value"></label>' +
        '<div class="env-var-actions">' +
          '<button class="btn btn-xs btn-toggle-secret" data-idx="' + i + '" title="' + (v.secret ? 'Show value' : 'Mark as secret') + '">' + (v.secret ? '👁' : '🔓') + '</button>' +
          '<button class="btn btn-xs btn-remove-env" data-idx="' + i + '">✕</button>' +
        '</div>' +
      '</div>';
    }).join('');

    envVarsList.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('input', function (e) {
        var idx = Number(e.target.dataset.idx);
        var field = e.target.dataset.field;
        envVars[idx][field] = e.target.value;
      });
    });

    envVarsList.querySelectorAll('.btn-remove-env').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.dataset.idx);
        envVars.splice(idx, 1);
        renderEnvVars();
      });
    });

    envVarsList.querySelectorAll('.btn-toggle-secret').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.dataset.idx);
        envVars[idx].secret = !envVars[idx].secret;
        renderEnvVars();
      });
    });
  }

  addEnvBtn.addEventListener('click', function () {
    envVars.push({ key: '', value: '', secret: false });
    renderEnvVars();
  });

  // Import .env file
  importEnvBtn.addEventListener('click', function () {
    envFileInput.click();
  });

  envFileInput.addEventListener('change', function () {
    var file = envFileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var lines = e.target.result.split('\n');
      var imported = 0;
      lines.forEach(function (line) {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        var eqIdx = line.indexOf('=');
        if (eqIdx === -1) return;
        var key = line.substring(0, eqIdx).trim();
        var value = line.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (key) {
          envVars.push({ key: key, value: value, secret: key.toLowerCase().includes('secret') || key.toLowerCase().includes('password') || key.toLowerCase().includes('token') });
          imported++;
        }
      });
      renderEnvVars();
      alert('Imported ' + imported + ' variables from ' + file.name);
    };
    reader.readAsText(file);
    envFileInput.value = '';
  });

  // Export .env
  exportEnvBtn.addEventListener('click', function () {
    var content = envVars.map(function (v) {
      return v.key + '=' + v.value;
    }).join('\n');
    download(content, '.env', 'text/plain');
  });

  // ─── Deployment ─────────────────────────────────────────
  deployBtn.addEventListener('click', startDeploy);
  stopBtn.addEventListener('click', stopDeploy);
  clearLogBtn.addEventListener('click', function () {
    allLogEntries = [];
    logContainer.innerHTML = '';
  });

  async function startDeploy() {
    if (deployRunning) return;
    deployRunning = true;
    deployAborted = false;
    deployBtn.disabled = true;
    stopBtn.disabled = false;
    rollbackBtn.disabled = true;

    currentDeployId = Date.now();
    var deployId = currentDeployId;
    var repo = repoName.value || 'unknown/repo';
    var branch = branchName.value || 'main';
    var env = envSelect.value;
    var commit = commitMsg.value || generateCommitMsg();
    var notes = deployNotes.value;
    var enabledStages = stages.filter(function (s) { return s.enabled; });

    // Reset UI
    progressSection.classList.remove('hidden');
    logSection.classList.remove('hidden');
    healthSection.classList.add('hidden');
    allLogEntries = [];
    logContainer.innerHTML = '';
    deployBar.style.width = '0%';
    deployPercent.textContent = '0%';

    // Build stage progress cards
    stagesProgress.innerHTML = enabledStages.map(function (s) {
      return '<div class="stage-progress-item" id="sp-' + s.name + '">' +
        '<div class="sp-name">' + s.label + '</div>' +
        '<div class="sp-status">Pending</div>' +
        '<div class="sp-bar"><div class="sp-bar-fill" id="spb-' + s.name + '"></div></div>' +
        '<div class="sp-time"></div>' +
      '</div>';
    }).join('');

    // Start timer
    var startTime = Date.now();
    deployTimer.textContent = '0:00';
    timerInterval = setInterval(function () {
      var elapsed = Math.floor((Date.now() - startTime) / 1000);
      var min = Math.floor(elapsed / 60);
      var sec = elapsed % 60;
      deployTimer.textContent = min + ':' + String(sec).padStart(2, '0');
    }, 250);

    var allSuccess = true;
    var failedStage = null;
    var completedCount = 0;
    var stageResults = [];

    addLog('step', '🚀 Deployment initiated');
    addLog('info', '  Repository: ' + repo + '@' + branch);
    addLog('info', '  Target: ' + env.toUpperCase());
    addLog('info', '  Commit: ' + generateHash() + ' — "' + commit + '"');
    addLog('info', '  Author: ' + generateAuthor());
    if (notes) addLog('info', '  Notes: ' + notes);
    addLog('info', '');

    for (var i = 0; i < enabledStages.length; i++) {
      if (deployAborted || deployId !== currentDeployId) {
        addLog('warn', '⚠️  Deployment aborted by user');
        break;
      }

      var stage = enabledStages[i];
      var stageEl = document.getElementById('sp-' + stage.name);
      var barEl = document.getElementById('spb-' + stage.name);
      if (stageEl) {
        stageEl.classList.add('active');
        stageEl.querySelector('.sp-status').textContent = 'Running...';
      }

      addLog('step', '▶ Stage: ' + stage.label);

      // Simulate sub-steps with progress
      var subSteps = getSubSteps(stage.name);
      for (var j = 0; j < subSteps.length; j++) {
        if (deployAborted) break;
        addLog('info', '  ' + subSteps[j]);
        if (barEl) barEl.style.width = Math.round(((j + 1) / subSteps.length) * 100) + '%';
        await delay(150 + Math.random() * 250);
      }

      // Main stage wait
      var duration = stage.duration[0] + Math.random() * (stage.duration[1] - stage.duration[0]);
      var steps = 10;
      for (var k = 0; k < steps; k++) {
        if (deployAborted) break;
        await delay(duration / steps);
        if (barEl) barEl.style.width = Math.round(((k + 1) / steps) * 100) + '%';
      }

      var failed = Math.random() < stage.failChance;
      var stageDuration = (duration / 1000).toFixed(1);

      if (failed && !deployAborted) {
        allSuccess = false;
        failedStage = stage;
        addLog('error', '  ✗ Stage FAILED: ' + stage.label + ' (' + stageDuration + 's)');
        addLog('error', '  Error: ' + getErrorMessage(stage.name));
        stageResults.push({ name: stage.name, success: false, duration: stageDuration });
        if (stageEl) {
          stageEl.classList.remove('active');
          stageEl.classList.add('error');
          stageEl.querySelector('.sp-status').textContent = '❌ Failed';
          stageEl.querySelector('.sp-time').textContent = stageDuration + 's';
        }
        break;
      }

      completedCount++;
      addLog('success', '  ✓ Stage completed: ' + stage.label + ' (' + stageDuration + 's)');
      stageResults.push({ name: stage.name, success: true, duration: stageDuration });

      if (stageEl) {
        stageEl.classList.remove('active');
        stageEl.classList.add('done');
        stageEl.querySelector('.sp-status').textContent = '✅ Done';
        stageEl.querySelector('.sp-time').textContent = stageDuration + 's';
      }

      var pct = Math.round((completedCount / enabledStages.length) * 100);
      deployBar.style.width = pct + '%';
      deployPercent.textContent = pct + '%';
    }

    // Finish
    clearInterval(timerInterval);
    if (!deployAborted) {
      deployBar.style.width = '100%';
      deployPercent.textContent = '100%';
    }

    var totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    var success = allSuccess && !deployAborted;

    addLog('info', '');
    if (success) {
      addLog('success', '🎉 Deployment SUCCESSFUL — Total: ' + totalTime + 's');
      lastSuccessfulDeploy = {
        repo: repo, branch: branch, env: env,
        envVars: JSON.parse(JSON.stringify(envVars)),
        timestamp: Date.now(),
      };
      rollbackBtn.disabled = false;
      await runHealthCheck();
    } else if (deployAborted) {
      addLog('warn', '⏹  Deployment ABORTED — Total: ' + totalTime + 's');
    } else {
      addLog('error', '❌ Deployment FAILED at ' + failedStage.label + ' — Total: ' + totalTime + 's');
    }

    // Save history
    var history = loadHistory();
    history.unshift({
      id: deployId,
      repo: repo,
      branch: branch,
      env: env,
      commit: commit,
      notes: notes,
      success: success,
      aborted: deployAborted,
      failedStage: failedStage ? failedStage.name : null,
      totalTime: totalTime,
      timestamp: Date.now(),
      stages: stageResults,
      envVars: envVars.length,
    });
    if (history.length > 50) history.pop();
    saveHistory(history);
    renderHistory();

    deployRunning = false;
    deployBtn.disabled = false;
    stopBtn.disabled = true;
  }

  function stopDeploy() {
    deployAborted = true;
    stopBtn.disabled = true;
  }

  // ─── Rollback ───────────────────────────────────────────
  rollbackBtn.addEventListener('click', async function () {
    if (deployRunning) return;
    if (!lastSuccessfulDeploy) {
      alert('No successful deployment to roll back to.');
      return;
    }

    rollbackBtn.disabled = true;
    progressSection.classList.remove('hidden');
    logSection.classList.remove('hidden');

    addLog('warn', '');
    addLog('warn', '↺ ROLLBACK INITIATED');
    addLog('info', '  Rolling back to deployment at ' + new Date(lastSuccessfulDeploy.timestamp).toLocaleString());
    deployBar.style.width = '0%';
    deployPercent.textContent = '0%';

    var startTime = Date.now();
    deployTimer.textContent = '0:00';
    timerInterval = setInterval(function () {
      var elapsed = Math.floor((Date.now() - startTime) / 1000);
      deployTimer.textContent = '0:' + String(elapsed).padStart(2, '0');
    }, 250);

    var steps = [
      { msg: 'Pausing incoming traffic...', delay: 600 },
      { msg: 'Verifying current deployment state...', delay: 800 },
      { msg: 'Restoring previous container image (v' + (Math.random() * 10 + 1).toFixed(1) + ')...', delay: 1200 },
      { msg: 'Updating load balancer routing rules...', delay: 700 },
      { msg: 'Restarting services with previous version...', delay: 1000 },
      { msg: 'Running post-rollback health checks...', delay: 900 },
      { msg: 'Restoring previous env configuration...', delay: 500 },
      { msg: 'Resuming traffic to stable version...', delay: 600 },
      { msg: 'Rollback complete.', delay: 300 },
    ];

    for (var i = 0; i < steps.length; i++) {
      if (deployAborted) break;
      addLog(i === steps.length - 1 ? 'success' : 'info', '  ' + steps[i].msg);
      deployBar.style.width = Math.round(((i + 1) / steps.length) * 100) + '%';
      deployPercent.textContent = Math.round(((i + 1) / steps.length) * 100) + '%';
      await delay(steps[i].delay + Math.random() * 400);
    }

    clearInterval(timerInterval);
    deployTimer.textContent = '0:' + String(Math.floor((Date.now() - startTime) / 1000)).padStart(2, '0');

    addLog('success', '');
    addLog('success', '✅ Rollback completed successfully');

    // Update history
    var history = loadHistory();
    history.unshift({
      id: Date.now(),
      repo: repoName.value,
      branch: branchName.value,
      env: envSelect.value,
      commit: 'rollback',
      notes: 'Rolled back to ' + new Date(lastSuccessfulDeploy.timestamp).toLocaleTimeString(),
      success: false,
      aborted: false,
      failedStage: null,
      totalTime: ((Date.now() - startTime) / 1000).toFixed(1),
      timestamp: Date.now(),
      stages: [],
      envVars: envVars.length,
      rolledBack: true,
      rollbackTarget: lastSuccessfulDeploy.timestamp,
    });
    if (history.length > 50) history.pop();
    saveHistory(history);
    renderHistory();
  });

  // ─── Health Checks ──────────────────────────────────────
  async function runHealthCheck() {
    healthSection.classList.remove('hidden');

    var checks = [
      { name: 'HTTP Response', path: '/health', critical: true },
      { name: 'Database Connection', path: '/health/db', critical: true },
      { name: 'Redis Cache', path: '/health/cache', critical: false },
      { name: 'API Gateway', path: '/health/gateway', critical: true },
      { name: 'Worker Queue', path: '/health/queue', critical: false },
      { name: 'Object Storage', path: '/health/storage', critical: false },
      { name: 'Auth Service', path: '/health/auth', critical: true },
      { name: 'CDN Edge', path: '/health/cdn', critical: false },
    ];

    addLog('info', '');
    addLog('info', '🏥 Running post-deployment health checks...');

    var results = [];
    var allHealthy = true;

    for (var i = 0; i < checks.length; i++) {
      var check = checks[i];
      await delay(200 + Math.random() * 400);

      var healthy = Math.random() > 0.05;
      var responseTime = Math.round(30 + Math.random() * 470);
      var status = healthy ? (responseTime > 300 ? 'degraded' : 'healthy') : 'down';
      if (!healthy) allHealthy = false;

      results.push({
        name: check.name,
        path: check.path,
        critical: check.critical,
        healthy: healthy,
        responseTime: responseTime,
        status: status,
      });

      var statusIcon = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌';
      addLog(status === 'down' ? 'error' : status === 'degraded' ? 'warn' : 'success',
        '  ' + statusIcon + ' ' + check.name + ' — ' + responseTime + 'ms (' + status + ')' + (check.critical ? ' [critical]' : ''));
    }

    healthSummary.innerHTML = '<div class="health-status-badge ' + (allHealthy ? 'hs-healthy' : 'hs-degraded') + '">' +
      (allHealthy ? '✅ All systems operational' : '⚠️ Some systems degraded') +
      '</div>';

    healthResults.innerHTML = '<div class="health-grid">' +
      results.map(function (r) {
        return '<div class="health-item ' + r.status + (r.critical ? ' critical-check' : '') + '">' +
          '<div class="hi-name">' + r.name + (r.critical ? ' *' : '') + '</div>' +
          '<div class="hi-status">' + (r.status === 'healthy' ? '✅ Healthy' : r.status === 'degraded' ? '⚠️ Degraded' : '❌ Down') + '</div>' +
          '<div class="hi-time">' + r.responseTime + 'ms</div>' +
          '<div class="hi-path">' + esc(r.path) + '</div>' +
        '</div>';
      }).join('') +
    '</div>';

    addLog(allHealthy ? 'success' : 'warn', allHealthy ? '✅ All health checks passed' : '⚠️ Some health checks reported issues');
  }

  recheckBtn.addEventListener('click', function () {
    if (!deployRunning) runHealthCheck();
  });

  // ─── Sub-steps per stage ────────────────────────────────
  function getSubSteps(stageName) {
    var steps = {
      build: ['Resolving dependencies...', 'Compiling TypeScript/ES6...', 'Bundling modules...', 'Generating source maps...', 'Optimizing production build...', 'Calculating bundle sizes...'],
      lint: ['Running ESLint on src/...', 'Checking TypeScript strict mode...', 'Analyzing code complexity...', 'Verifying import ordering...'],
      test: ['Running 247 unit tests...', 'Running 38 integration tests...', 'Generating coverage report...', 'Coverage: 89.2% (threshold: 80%)', 'Running E2E tests (12 specs)...'],
      security: ['Scanning 847 dependencies for CVEs...', 'Checking for hardcoded secrets...', 'Analyzing SAST patterns...', 'Generating SBOM...', 'No critical vulnerabilities found.'],
      staging: ['Provisioning staging containers (x3)...', 'Running database migrations...', 'Deploying application...', 'Running smoke tests...', 'Verifying API endpoints...', 'Configuring CDN cache rules...'],
      production: ['Initiating blue-green deployment...', 'Routing 10% traffic to new version...', 'Canary health check passed', 'Routing 50% traffic...', 'Monitoring error rates...', 'Full traffic cutover...', 'Production verification complete.'],
    };
    return steps[stageName] || ['Processing...'];
  }

  function getErrorMessage(stageName) {
    var errors = {
      build: 'ModuleResolutionError: Cannot find module @app/core/auth (imported from src/routes.ts:12)',
      lint: 'ESLint: Unexpected any type at src/services/auth.ts:127 (no-explicit-any)',
      test: 'FAIL src/services/payment.test.ts: Connection timeout after 5000ms',
      security: 'CRITICAL CVE-2024-3094 detected in xz-utils@5.6.0 — supply chain vulnerability',
      staging: 'Container health check failed: OOMKilled (exit code 137) — memory limit exceeded',
      production: 'Rollback threshold exceeded: error rate 5.2% > 2.0% threshold',
    };
    return errors[stageName] || 'Unknown error in stage: ' + stageName;
  }

  // ─── Log System ─────────────────────────────────────────
  function addLog(type, msg) {
    var entry = { type: type, msg: msg, time: new Date() };
    allLogEntries.push(entry);
    renderLogEntry(entry);
  }

  function renderLogEntry(entry) {
    if (logFilter !== 'all' && entry.type !== logFilter) return;
    if (logSearchTerm && !entry.msg.toLowerCase().includes(logSearchTerm.toLowerCase())) return;

    var line = document.createElement('div');
    line.className = 'log-line log-' + entry.type;
    var timeStr = entry.time.toLocaleTimeString('en-US', { hour12: false });
    line.textContent = '[' + timeStr + '] ' + entry.msg;
    logContainer.appendChild(line);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  function rerenderLogs() {
    logContainer.innerHTML = '';
    allLogEntries.forEach(function (entry) {
      renderLogEntry(entry);
    });
  }

  function setupLogFilters() {
    document.querySelectorAll('.btn-log-filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.btn-log-filter').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        logFilter = btn.dataset.filter;
        rerenderLogs();
      });
    });

    document.getElementById('log-search').addEventListener('input', function (e) {
      logSearchTerm = e.target.value;
      rerenderLogs();
    });
  }

  // ─── History ────────────────────────────────────────────
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem('deploy_history') || '[]'); }
    catch (e) { return []; }
  }

  function saveHistory(h) {
    localStorage.setItem('deploy_history', JSON.stringify(h));
  }

  function renderHistory() {
    var history = loadHistory();
    var filter = historyFilter.value;

    var filtered = filter === 'all' ? history : history.filter(function (h) {
      if (filter === 'success') return h.success;
      if (filter === 'failed') return !h.success && !h.aborted && !h.rolledBack;
      if (filter === 'rolledBack') return h.rolledBack;
      return true;
    });

    historyCount.textContent = history.length + ' total';

    if (filtered.length === 0) {
      historyList.innerHTML = '<p class="empty">No deployments' + (filter !== 'all' ? ' matching filter' : '') + '.</p>';
      return;
    }

    historyList.innerHTML = filtered.map(function (h) {
      var statusClass, statusText;
      if (h.rolledBack) { statusClass = 'h-rolled-back'; statusText = 'ROLLED BACK'; }
      else if (h.success) { statusClass = 'h-success'; statusText = 'SUCCESS'; }
      else if (h.aborted) { statusClass = 'h-aborted'; statusText = 'ABORTED'; }
      else { statusClass = 'h-failed'; statusText = 'FAILED'; }

      var stagesHtml = '';
      if (h.stages && h.stages.length > 0) {
        stagesHtml = '<div class="h-stages">' + h.stages.map(function (s) {
          return '<span class="h-stage-chip ' + (s.success ? 'hsc-ok' : 'hsc-fail') + '">' + s.name + ' ' + (s.success ? '✓' : '✗') + ' ' + s.duration + 's</span>';
        }).join('') + '</div>';
      }

      return '<div class="history-item">' +
        '<div class="h-info">' +
          '<div class="h-header">' +
            '<span class="h-name">' + esc(h.repo) + '@' + esc(h.branch) + ' → ' + esc(h.env) + '</span>' +
            '<span class="h-status ' + statusClass + '">' + statusText + '</span>' +
          '</div>' +
          '<div class="h-meta">' +
            '<span>' + new Date(h.timestamp).toLocaleString() + '</span>' +
            '<span>⏱ ' + h.totalTime + 's</span>' +
            '<span>📝 ' + esc(h.commit || 'N/A') + '</span>' +
            (h.failedStage ? '<span class="h-fail-stage">❌ Failed at ' + h.failedStage + '</span>' : '') +
            (h.notes ? '<span class="h-notes">💬 ' + esc(h.notes) + '</span>' : '') +
          '</div>' +
          stagesHtml +
        '</div>' +
      '</div>';
    }).join('');
  }

  historyFilter.addEventListener('change', renderHistory);
  clearHistoryBtn.addEventListener('click', function () {
    if (confirm('Clear all deployment history?')) {
      localStorage.removeItem('deploy_history');
      renderHistory();
    }
  });

  // ─── Utilities ──────────────────────────────────────────
  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function generateHash() {
    var chars = '0123456789abcdef';
    var hash = '';
    for (var i = 0; i < 7; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  function generateAuthor() {
    var authors = ['alice', 'bob', 'charlie', 'diana', 'evan', 'fiona', 'george', 'hannah', 'ivan', 'julia'];
    return authors[Math.floor(Math.random() * authors.length)];
  }

  function generateCommitMsg() {
    var msgs = [
      'feat: add user dashboard with analytics',
      'fix: resolve authentication timeout on refresh',
      'chore: bump dependencies to latest stable',
      'refactor: optimize database query performance',
      'feat: implement real-time search autocomplete',
      'fix: correct timezone handling in date formatter',
      'docs: update API documentation for v3 endpoints',
      'test: add integration tests for payment flow',
      'feat: add dark mode toggle with persistence',
      'fix: prevent race condition in WebSocket reconnect',
      'chore: migrate CI to GitHub Actions v3',
      'feat: implement rate limiting on public endpoints',
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = String(s || '');
    return d.innerHTML;
  }

  function download(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
})();
