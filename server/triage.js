import { getTriageConfig, buildMessagesFromLdConfig } from "./ld.js";
import { converse } from "./bedrock.js";

const QUERY_TYPE_LABEL = {
  policy_question: "Policy Specialist",
  provider_lookup: "Provider Specialist",
  schedule_agent: "Scheduler",
};

export async function runTriage(query, userContext = {}, options = {}) {
  const log = options.logger ?? (() => {});
  log({ level: "INFO", message: "sdk key used: " + process.env.LD_SDK_KEY, name: "key" });
  const contextVars = {
    user_key: userContext.user_key ?? "anonymous",
    user_context: JSON.stringify(userContext, null, 2),
    query,
    ...userContext,
  };

  log({ level: "INFO", message: "📥 Pulling AI config from LaunchDarkly (triage_agent)...", name: "triage" });
  const { config, tracker } = await getTriageConfig(contextVars);
  const modelId = config.model?.name ?? "us.anthropic.claude-3-5-sonnet-v2:0";
  log({ level: "INFO", message: `   Model: ${modelId}`, name: "triage" });

  const messages = buildMessagesFromLdConfig(config, contextVars);
  const systemPreview = (messages.find((m) => m.role === "system")?.content ?? "").slice(0, 120);
  log({ level: "INFO", message: `   Context sent to model (system prompt ~${messages.reduce((n, m) => n + (m.content?.length ?? 0), 0)} chars)`, name: "triage" });

  const startTime = Date.now();
  log({ level: "INFO", message: `🚀 Calling Bedrock (${modelId})...`, name: "triage" });
  let result;
  try {
    result = await converse(modelId, messages, { temperature: 0, maxTokens: 1024 });
  } catch (err) {
    tracker.trackError();
    throw err;
  }

  tracker.trackSuccess();
  const durationMs = result.durationMs ?? Date.now() - startTime;
  const tok = result.usage;
  log({
    level: "INFO",
    message: `   Response in ${durationMs}ms${tok ? ` · ${tok.inputTokens ?? 0} in / ${tok.outputTokens ?? 0} out tokens` : ""}`,
    name: "triage",
  });
  if (result.usage) {
    tracker.trackTokens({
      input: result.usage.inputTokens,
      output: result.usage.outputTokens,
      total: result.usage.totalTokens,
    });
  }
  if (result.ttftMs != null) tracker.trackTimeToFirstToken(result.ttftMs);
  if (typeof tracker.trackDuration === "function") tracker.trackDuration(result.durationMs ?? (Date.now() - startTime));

  let parsed;
  try {
    const raw = result.content.trim().replace(/^```json?\s*|\s*```$/g, "");
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      query_type: "schedule_agent",
      confidence_score: 0.5,
      extracted_context: {},
      escalation_needed: true,
      reasoning: "Failed to parse triage response.",
    };
  }

  const queryType = parsed.query_type ?? "schedule_agent";
  const confidence = parsed.confidence_score ?? 0;
  const label = QUERY_TYPE_LABEL[queryType] ?? "Scheduler";

  return {
    queryType,
    confidence,
    nextAgent: label,
    reasoning: parsed.reasoning ?? "",
    escalationNeeded: parsed.escalation_needed ?? confidence < 0.7,
    extractedContext: parsed.extracted_context ?? {},
    agentData: {
      triage_router: {
        model: modelId,
        tokens: result.usage
          ? { input: result.usage.inputTokens, output: result.usage.outputTokens }
          : undefined,
        ttft_ms: result.ttftMs,
        duration_ms: result.durationMs ?? Date.now() - startTime,
        confidence,
        query_type: queryType,
      },
    },
  };
}
