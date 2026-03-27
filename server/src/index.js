import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { createLoader, readLidarBin } from "./nuscenesLoader.js";
import { inspectFrame } from "./qualityService.js";

const PORT = Number(process.env.PORT) || 3001;
const NUSCENES_ROOT = process.env.NUSCENES_ROOT || "";
const NUSCENES_VERSION = process.env.NUSCENES_VERSION || "v1.0-mini";

const loader = createLoader({ root: NUSCENES_ROOT, version: NUSCENES_VERSION });

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    mock: loader.usingMock,
    version: loader.version,
    nuscenesRoot: loader.root,
  });
});

/** List scenes */
app.get("/api/scenes", (req, res) => {
  const scenes = (loader.tables.scene || []).map((s) => ({
    token: s.token,
    name: s.name,
    description: s.description,
    nbr_samples: s.nbr_samples,
    first_sample_token: s.first_sample_token,
    last_sample_token: s.last_sample_token,
  }));
  res.json({ scenes });
});

/** Ordered frames (samples) in a scene */
app.get("/api/scenes/:sceneToken/frames", (req, res) => {
  const scene = loader.sceneByToken.get(req.params.sceneToken);
  if (!scene) {
    return res.status(404).json({ error: "Scene not found" });
  }
  const ordered = [];
  let tok = scene.first_sample_token;
  const guard = new Set();
  while (tok && !guard.has(tok)) {
    guard.add(tok);
    const smp = loader.sampleByToken.get(tok);
    if (!smp) break;
    ordered.push({
      token: smp.token,
      timestamp: smp.timestamp,
      scene_token: smp.scene_token,
    });
    tok = smp.next || null;
  }
  res.json({ sceneToken: scene.token, frames: ordered });
});

/** Single frame summary + sensor file info */
app.get("/api/frames/:sampleToken", (req, res) => {
  const smp = loader.sampleByToken.get(req.params.sampleToken);
  if (!smp) {
    return res.status(404).json({ error: "Sample not found" });
  }
  const dataRows = loader.sampleDataForSample(req.params.sampleToken);
  const sensors = dataRows.map((row) => {
    const abs = loader.resolveDataPath(row.filename);
    const exists = abs && fs.existsSync(abs);
    return {
      token: row.token,
      channel: row.channel,
      filename: row.filename,
      timestamp: row.timestamp,
      is_key_frame: row.is_key_frame,
      fileExists: !!exists,
      urlCamera:
        row.channel && row.channel.startsWith("CAM_") && exists
          ? `/api/files?path=${encodeURIComponent(row.filename)}`
          : null,
      urlLidar:
        row.channel === "LIDAR_TOP" && exists
          ? `/api/lidar/${encodeURIComponent(row.token)}`
          : null,
    };
  });
  res.json({
    sample: {
      token: smp.token,
      timestamp: smp.timestamp,
      scene_token: smp.scene_token,
      prev: smp.prev,
      next: smp.next,
    },
    sensors,
  });
});

/** Quality inspection */
app.get("/api/frames/:sampleToken/quality", (req, res) => {
  const result = inspectFrame(loader, req.params.sampleToken);
  res.json(result);
});

/** LiDAR points as JSON for Three.js (subsampled) */
app.get("/api/lidar/:sampleDataToken", (req, res) => {
  const token = req.params.sampleDataToken;
  const row = (loader.tables.sample_data || []).find((r) => r.token === token);
  if (!row || row.channel !== "LIDAR_TOP") {
    return res.status(404).json({ error: "LIDAR sample_data not found" });
  }
  const abs = loader.resolveDataPath(row.filename);
  const { points, count } = readLidarBin(abs, 40000);
  res.json({
    count,
    positions: Array.from(points),
  });
});

/** Serve binary sample files (camera etc.) from nuScenes samples tree */
app.get("/api/files", (req, res) => {
  const rel = req.query.path;
  if (!rel || typeof rel !== "string" || rel.includes("..")) {
    return res.status(400).send("Invalid path");
  }
  const abs = loader.resolveDataPath(rel);
  if (!abs || !fs.existsSync(abs)) {
    return res.status(404).send("Not found");
  }
  res.sendFile(path.resolve(abs));
});

app.listen(PORT, () => {
  console.log(`nuScenes inspector API http://localhost:${PORT}`);
  console.log(
    loader.usingMock
      ? "Using MOCK dataset (set NUSCENES_ROOT for real data)"
      : `Using nuScenes at ${NUSCENES_ROOT} (${NUSCENES_VERSION})`
  );
});
