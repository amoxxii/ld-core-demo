import { subscribe } from "../../../../lib/log-stream";

/**
 * SSE log stream – broadcasts logs from chat/triage/bedrock to the Terminal UI.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  let intervalId;
  let unsubscribe;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (_) {}
      };

      send({
        timestamp: new Date().toISOString(),
        level: "INFO",
        message: "🔌 Connected to log stream",
        name: "sse",
      });

      unsubscribe = subscribe(send);

      intervalId = setInterval(() => {
        send({
          timestamp: new Date().toISOString(),
          level: "HEARTBEAT",
          message: "",
          name: "sse",
        });
      }, 30000);
    },
    cancel() {
      if (intervalId) clearInterval(intervalId);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
