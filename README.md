# Policy Agent Node

 ToggleHealth UI and a multi-agent chat flow: **triage** → **specialist** (policy / provider / schedule) → **brand agent** → final response.

## System architecture

**Where triage picks the next agent (policy vs provider vs scheduler):**

- **Triage router** — [`server/triage.js`](server/triage.js): Uses LaunchDarkly AI Config `triage_agent` to call Bedrock; the model returns JSON with `query_type` (`policy_question`, `provider_lookup`, or `scheduler_agent`). Low confidence (&lt; 0.7) can set `escalationNeeded`; the chosen type is passed to the specialist step.
- **Specialist** — [`server/specialists.js`](server/specialists.js): One of three agents runs (Policy Specialist, Provider Specialist, or Schedule Agent), each with a simple Bedrock prompt. No RAG in this app; specialists answer from instructions only.
- **Brand agent** — [`server/brand.js`](server/brand.js): Takes the specialist’s raw reply and the original query, and returns the final customer-facing response in ToggleHealth’s voice (friendly, clear, helpful).

-- **TODO** Implement Judge flow for metrics and obserability

```
                        ┌─────────────────┐
                        │   USER QUERY    │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │ TRIAGE ROUTER   │
                        │ (triage_agent   │
                        │  via LaunchDarkly)
                        └────────┬────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
    ┌───────▼────────┐   ┌───────▼─────────┐  ┌───────▼─────────┐
    │ POLICY         │   │ PROVIDER        │  │ SCHEDULE        │
    │ SPECIALIST     │   │ SPECIALIST      │  │ AGENT           │
    │                │   │                 │  │                 │
    │ policy_question│   │ provider_lookup │  │ scheduler_agent  │
    └───────┬────────┘   └───────┬─────────┘  └───────┬─────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                        ┌────────▼────────┐
                        │  BRAND AGENT    │
                        │  (final voice)  │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │ FINAL RESPONSE  │
                        │ to customer     │
                        └─────────────────┘
```

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
  Returns: `{ response, requestId, agentFlow, metrics }`. `response` is the brand-voiced final reply; `agentFlow` lists triage, specialist, and brand_agent.
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
│   ├── ld.js               # LaunchDarkly client + triage_agent config
│   ├── triage.js           # Triage: LD config → Bedrock → queryType
│   ├── specialists.js      # Policy / Provider / Schedule specialists (Bedrock)
│   ├── brand.js            # Brand agent: specialist reply → final response
│   └── bedrock.js          # Bedrock Converse streaming
├── public/                 # Static assets (unchanged)
├── Dockerfile              # Multi-stage: deps → builder → runner
├── next.config.mjs
├── .env.example
├── .env.local             # copy from .env.example; not committed
└── package.json
```

**TODO**
- Finalize KBs and implement in configs for RAG
- Implement Judge w/ metrics sent to LD
- Auto upload LLM configs & tools to project
- Auto create experiment and realistic dummy data
