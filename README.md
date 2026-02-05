# Policy Agent Node (Triage-only UI)

Minimal Next.js app that implements the ToggleHealth UI and **triage agent only**: user query → LaunchDarkly AI Config (`triage_agent`) → Bedrock → display classification. No other agents yet.

- **UI**: Same layout (hero, services, Coverage Concierge chat widget). Input sends to triage; response shows routing and confidence.
- **Server**: Next.js App Router with `POST /api/chat` and `GET /api/health`. Uses LaunchDarkly server-side AI Config for `triage_agent` and AWS Bedrock Converse. Backend logic lives in `server/` (ld.js, triage.js, bedrock.js).
- **Docker**: Multi-stage build (deps → builder → runner). Build driven by the Dockerfile; `npm run build` produces `.next`; runner copies `.next`, `public`, `node_modules`, `package.json`. Env injected at runtime (no `.env` in image).

## Quick start (local)

```bash
cp .env.example .env.local
# Edit .env.local: set LD_SDK_KEY; set AWS_PROFILE=aiconfigdemo and run: aws sso login --profile aiconfigdemo
npm install
npm run dev
```

Open http://localhost:3000.

## Quick start (Docker)

```bash
docker build -t policy-agent-node .

# Run: pass LD_SDK_KEY and AWS_REGION. Omit AWS_PROFILE so the SDK uses env/role (EKS pod role).
docker run -p 3000:3000 -e LD_SDK_KEY=your-key -e AWS_REGION=us-east-1 policy-agent-node
```

For local Docker you can use `--env-file .env`. In EKS, inject only the vars the app needs; Bedrock credentials come from the pod’s IAM role (IRSA).

## Environment

| Variable | Description |
|----------|-------------|
| `LD_SDK_KEY` | Server-side SDK key (project: nteixeira-ld-demo) |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_PROFILE` | Local only: SSO profile (e.g. `aiconfigdemo`). Omit in Docker/EKS. |
| `PORT` | Server port (default 3000) |

**AWS credentials**

- **Local**: Set `AWS_PROFILE=aiconfigdemo` in `.env.local` and run `aws sso login --profile aiconfigdemo`.
- **Docker / EKS**: Do *not* set `AWS_PROFILE`. The SDK uses the default chain; in EKS this is the pod’s IAM role (IRSA).

## LaunchDarkly Code References

Code references link feature-flag usage in this repo to LaunchDarkly. Configuration is in `.launchdarkly/coderefs.yaml` (project: `nteixeira-ld-demo`, repo: `policy-agent-node`).

- **Manual update**: `npm run update-code-refs` (requires `LD_API_KEY` and `ld-find-code-refs` installed: `npm install -g @launchdarkly/ld-find-code-refs`).
- **Automatic (optional)**: Add a git post-commit hook that runs the script in the background when `LD_API_KEY` is set. See [LaunchDarkly code references](https://docs.launchdarkly.com/guides/code-references/).

## API

- `POST /api/chat`  
  Body: `{ "userInput": "What's my copay for a specialist?" }`  
  Returns: `{ response, requestId, agentFlow, metrics }` (triage only).
- `GET /api/health`  
  Returns `{ status: "ok" }`.

## Project layout

```
policy-agent-node/
├── app/
│   ├── layout.js          # Root layout + globals.css
│   ├── page.js            # Home + Coverage Concierge chat (client)
│   └── api/
│       ├── chat/route.js  # POST /api/chat → server/triage
│       └── health/route.js
├── server/
│   ├── ld.js              # LaunchDarkly client + triage_agent config
│   ├── triage.js           # Run triage: LD config → Bedrock → parse JSON
│   └── bedrock.js          # Bedrock Converse streaming
├── public/                 # Static assets (unchanged)
├── Dockerfile              # Multi-stage: deps → builder → runner
├── next.config.mjs
├── .env.example
├── .env.local             # copy from .env.example; not committed
├── .launchdarkly/coderefs.yaml
├── scripts/update-code-refs.sh
└── package.json
```
