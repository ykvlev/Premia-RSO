import { NextResponse } from "next/server";
import os from "node:os";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

function getMetrics() {
  const mem = process.memoryUsage();
  const toMB = (b: number) => +(b / 1048576).toFixed(1);
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedPct = totalMem > 0 ? +((1 - freeMem / totalMem) * 100).toFixed(1) : 0;

  let disk = { totalGB: 0, usedGB: 0, freeGB: 0, pct: 0 };
  try {
    const { execSync } = require("node:child_process");
    const df = execSync("df -BG / | tail -1", { encoding: "utf8", timeout: 3000 });
    const parts = df.trim().split(/\s+/);
    if (parts.length >= 4) {
      disk = {
        totalGB: parseInt(parts[1]) || 0,
        usedGB: parseInt(parts[2]) || 0,
        freeGB: parseInt(parts[3]) || 0,
        pct: parseInt(parts[4]) || 0,
      };
    }
  } catch {}

  let pm2 = { name: "premia", pid: process.pid, uptime: Math.round(process.uptime()), memory: toMB(mem.rss), restarts: 0, status: "online" };
  try {
    const pm2Path = join(os.homedir(), ".pm2/pids/premia");
    if (existsSync(pm2Path)) {
      const pid = readFileSync(pm2Path, "utf8").trim();
      pm2.pid = parseInt(pid) || process.pid;
    }
  } catch {}

  return {
    ts: Date.now(),
    cpu: {
      cores: os.cpus().length,
      loadavg: os.loadavg().map((n) => +n.toFixed(2)),
      model: os.cpus()[0]?.model ?? "—",
    },
    memory: {
      totalMB: toMB(totalMem),
      freeMB: toMB(freeMem),
      usedPct,
      rssMB: toMB(mem.rss),
      heapUsedMB: toMB(mem.heapUsed),
      heapTotalMB: toMB(mem.heapTotal),
    },
    disk,
    pm2,
    node: process.version,
    platform: `${process.platform} · ${process.arch}`,
  };
}

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        try {
          const data = JSON.stringify(getMetrics());
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {}
      };
      send();
      const timer = setInterval(send, 3000);
      const timeout = setTimeout(() => {
        clearInterval(timer);
        controller.close();
      }, 10 * 60 * 1000);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
