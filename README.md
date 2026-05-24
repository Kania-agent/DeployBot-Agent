# DeployBot Agent — CI/CD Deployment Simulator

A fully functional CI/CD deployment simulator built as a single-page web application. Simulates a complete deployment pipeline with realistic timing, failure injection, rollback capability, environment variable management, deployment history, and health check simulation.

## Features

### 🔧 Pipeline Configuration
- Four-stage pipeline: **Build → Test → Staging → Production**
- Adjustable duration (ms) for each stage
- Configurable failure probability (0–100%) per stage
- Auto-rollback toggle on failure
- Option to skip staging for direct-to-production deploys

### 🚀 Deployment Simulation
- Select branch and commit SHA (auto-generated if left blank)
- Real-time progress bar and stage-by-stage visual indicators
- Simulated timing with configurable per-stage duration
- Random failure injection based on configured probability
- Abort button to cancel running deployments
- Unique deployment IDs (e.g., `DPL-M1K4X8B2-A3F7`)

### ↩️ Rollback Capability
- Automatic rollback when a stage fails (if enabled)
- Rollback visually shown with "Rolling Back" indicators
- Rollback status tracked in deployment history

### 🔐 Environment Variable Management
- Add/remove environment variables with key-value pairs
- Scope variables to: All Environments, Staging, or Production
- Visual badge indicators for scope type

### 📜 Deployment History
- Complete log of all deployments with timestamps
- Shows branch, commit, duration, and stage results
- Color-coded status tags (Success / Failed / Rolled Back)
- Export history as JSON
- Clear history option

### 💓 Health Check Simulation
- Simulates health checks against 8 microservices
- Randomized latency (5–50ms) and status codes
- Visual health indicators (green/yellow/red dots)
- Service status dashboard with uptime percentages
- Services: API Gateway, Auth, Database, Redis, Worker Queue, CDN, Monitoring, Log Aggregator

### 📊 Dashboard
- Total deployments, successful, failed, and rolled-back counters
- Live pipeline visual showing current stage states
- Overall progress bar with percentage

## File Structure

```
DeployBot-Agent/
├── index.html    — Main HTML structure
├── style.css     — Dark-theme responsive styles
├── app.js        — Application logic (300+ lines)
└── README.md     — This file
```

## Usage

1. Open `index.html` in any modern browser.
2. Navigate between panels using the sidebar.
3. **Pipeline** — Configure stage durations and failure rates.
4. **Deploy** — Select a branch and click "Start Deployment".
5. **Env Vars** — Add environment variables for staging/production.
6. **History** — Review past deployments and export logs.
7. **Health** — Run health checks against simulated services.

## Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, flexbox, grid, responsive design
- **Vanilla JavaScript** — No frameworks or dependencies
- **Async/Await** — For realistic pipeline stage timing

## License

MIT
