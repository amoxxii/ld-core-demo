import { runTriage } from "../../../server/triage.js";
import { pushLog } from "../../../lib/log-stream";

function createUserContext(body = {}) {
  return {
    user_key: "anonymous",
    name: body.userName ?? "Marek Poliks",
    location: body.location ?? "San Francisco, CA",
    policy_id: body.policyId ?? "TH-HMO-GOLD-2024",
    coverage_type: body.coverageType ?? "Gold HMO",
  };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userInput = body?.userInput;
  if (!userInput || typeof userInput !== "string") {
    return Response.json({ error: "userInput is required" }, { status: 400 });
  }

  const requestId = crypto.randomUUID();
  const userContext = createUserContext(body);

  pushLog({
    level: "INFO",
    message: `💬 Chat request (${requestId.slice(0, 8)}…) · "${userInput.trim().slice(0, 60)}${userInput.length > 60 ? "…" : ""}"`,
    name: "chat",
  });
  pushLog({
    level: "INFO",
    message: `   Context: policy=${userContext.policy_id ?? "—"} · ${userContext.location ?? "—"}`,
    name: "chat",
  });

  const logger = (entry) => pushLog({ ...entry, name: entry.name ?? "triage" });

  try {
    const triageResult = await runTriage(userInput.trim(), userContext, { logger });

    pushLog({
      level: "INFO",
      message: `✅ Triage complete: ${triageResult.nextAgent} (${(triageResult.confidence * 100).toFixed(0)}%)`,
      name: "chat",
    });

    const responseText =
      `Your question was classified as **${triageResult.nextAgent}** (confidence: ${(triageResult.confidence * 100).toFixed(0)}%).\n\n` +
      (triageResult.reasoning ? `Reasoning: ${triageResult.reasoning}` : "");

    const agentFlow = [
      {
        agent: "triage_router",
        name: "Triage Router",
        status: "complete",
        confidence: triageResult.confidence,
        icon: "🔍",
        duration: triageResult.agentData.triage_router.duration_ms,
        ttft_ms: triageResult.agentData.triage_router.ttft_ms,
        tokens: triageResult.agentData.triage_router.tokens,
      },
    ];

    return Response.json({
      response: responseText,
      requestId,
      agentFlow,
      metrics: {
        query_type: triageResult.queryType,
        confidence: triageResult.confidence,
        agent_count: 1,
        rag_enabled: false,
      },
    });
  } catch (err) {
    console.error("Triage error:", err);
    const message = err?.message ?? "Internal server error";
    pushLog({
      level: "ERROR",
      message: `❌ Triage error: ${message}`,
      name: "chat",
    });
    const isAws = /credentials|sso|token|KeyError|Refreshing/i.test(message);
    return Response.json(
      {
        response: isAws
          ? "AWS authentication required. Configure credentials (e.g. aws sso login or env vars)."
          : "An error occurred. Please try again.",
        requestId,
        agentFlow: [],
        error: message,
      },
      { status: 500 }
    );
  }
}
