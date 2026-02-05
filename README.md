# Policy Agent Node (Triage-only UI)

Minimal Next.js app that implements the ToggleHealth UI and **triage agent only**: user query → LaunchDarkly AI Config (`triage_agent`) → Bedrock → display classification. No other agents yet.

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
For local Docker you can use `--env-file .env`.


## Environment

| Variable | Description |
|----------|-------------|
| `LD_SDK_KEY` | Server-side SDK key |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_PROFILE` | Local only: SSO profile (e.g. `aiconfigdemo`). Omit in Docker/EKS. |
| `PORT` | Server port (default 3000) |

**AWS credentials**

- **Local**: Set `AWS_PROFILE=yourprofile` in `.env.local` and run `aws sso login --profile yourprofile`..
- **EKS**: Do *not* set `AWS_PROFILE`. The SDK uses the default chain; in EKS this is the pod’s IAM role (IRSA)

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
└── package.json
```
