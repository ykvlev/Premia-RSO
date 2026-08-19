/**
 * SSE endpoint: live logs from observability buffer.
 * GET /api/admin/super/logs — streams recent requests every 2 seconds.
 */
import { getRecentRequests, getRecentErrors, type RequestSample, type ErrorEntry } from "@/lib/observability";

export const dynamic = "force-dynamic";

type LogEntry = {
  type: "request" | "error";
  method?: string;
  path?: string;
  ip?: string;
  ua?: string;
  message?: string;
  context?: string;
  at: number;
};

export async function GET() {
  const encoder = new TextEncoder();

  let lastReqAt = 0;
  let lastErrAt = 0;
  let alive = true;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial data
      const reqs = getRecentRequests(50);
      const errs = getRecentErrors(20);
      if (reqs.length) lastReqAt = reqs[0].at;
      if (errs.length) lastErrAt = errs[0].at;

      const init: LogEntry[] = [
        ...errs.map((e) => ({ type: "error" as const, message: e.message, context: e.context, at: e.at })),
        ...reqs.map((r) => ({ type: "request" as const, method: r.method, path: r.path, ip: r.ip, ua: r.ua, at: r.at })),
      ].sort((a, b) => b.at - a.at).slice(0, 60);

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "init", entries: init })}\n\n`));

      // Poll every 2 seconds
      const interval = setInterval(() => {
        if (!alive) return;
        try {
          const reqs = getRecentRequests(30).filter((r) => r.at > lastReqAt);
          const errs = getRecentErrors(10).filter((e) => e.at > lastErrAt);

          if (reqs.length) lastReqAt = reqs[0].at;
          if (errs.length) lastErrAt = errs[0].at;

          const entries: LogEntry[] = [
            ...errs.map((e) => ({ type: "error" as const, message: e.message, context: e.context, at: e.at })),
            ...reqs.map((r) => ({ type: "request" as const, method: r.method, path: r.path, ip: r.ip, ua: r.ua, at: r.at })),
          ].sort((a, b) => b.at - a.at);

          if (entries.length) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "update", entries })}\n\n`));
          }
        } catch {
          /* stream may be closed */
        }
      }, 2000);

      // Keepalive ping every 15s
      const ping = setInterval(() => {
        if (!alive) return;
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch { /* closed */ }
      }, 15000);

      // Auto-close after 10 minutes
      setTimeout(() => {
        alive = false;
        clearInterval(interval);
        clearInterval(ping);
        try { controller.close(); } catch { /* already closed */ }
      }, 600_000);
    },
    cancel() {
      alive = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
