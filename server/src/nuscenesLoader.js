/**
 * Loads nuScenes table JSON files from NUSCENES_ROOT or falls back to mock data.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function indexByToken(rows) {
  const m = new Map();
  for (const r of rows) m.set(r.token, r);
  return m;
}

export function createLoader(config) {
  const { root, version } = config;
  const mockDir = path.join(__dirname, "..", "data", "mock");

  let tables = {};
  let usingMock = false;
  let samplesBase = null;

  if (root && fs.existsSync(path.join(root, version))) {
    const metaDir = path.join(root, version);
    const load = (name) => readJson(path.join(metaDir, name + ".json"));
    tables = {
      scene: load("scene"),
      sample: load("sample"),
      sample_data: load("sample_data"),
      sample_annotation: safeLoad(metaDir, "sample_annotation"),
      calibrated_sensor: safeLoad(metaDir, "calibrated_sensor"),
      sensor: safeLoad(metaDir, "sensor"),
    };
    samplesBase = path.join(root, "samples");
  } else {
    usingMock = true;
    tables = {
      scene: readJson(path.join(mockDir, "scene.json")),
      sample: readJson(path.join(mockDir, "sample.json")),
      sample_data: readJson(path.join(mockDir, "sample_data.json")),
      sample_annotation: readJson(path.join(mockDir, "sample_annotation.json")),
      calibrated_sensor: readJson(path.join(mockDir, "calibrated_sensor.json")),
      sensor: readJson(path.join(mockDir, "sensor.json")),
    };
    samplesBase = mockDir;
  }

  const sampleByToken = indexByToken(tables.sample);
  const sceneByToken = indexByToken(tables.scene);

  /** All sample_data rows for a sample_token */
  function sampleDataForSample(sampleToken) {
    return tables.sample_data.filter((sd) => sd.sample_token === sampleToken);
  }

  /** Resolve absolute path for a sample_data filename (nuScenes: relative under samples/) */
  function resolveDataPath(filename) {
    if (!filename) return null;
    if (usingMock) {
      return path.join(mockDir, "assets", filename.replace(/\\/g, path.sep));
    }
    return path.join(samplesBase, filename.replace(/\\/g, path.sep));
  }

  return {
    usingMock,
    root: root || null,
    version: usingMock ? "mock" : version,
    tables,
    sampleByToken,
    sceneByToken,
    sampleDataForSample,
    resolveDataPath,
  };
}

function safeLoad(metaDir, name) {
  const p = path.join(metaDir, name + ".json");
  if (!fs.existsSync(p)) return [];
  return readJson(p);
}

/**
 * nuScenes LiDAR .bin: 5 x float32 per point (x, y, z, intensity, ring).
 * Returns { points: Float32Array (x,y,z triplets), count }
 */
export function readLidarBin(filePath, maxPoints = 50000) {
  if (!fs.existsSync(filePath)) return { points: new Float32Array(0), count: 0 };
  const buf = fs.readFileSync(filePath);
  const total = Math.floor(buf.length / 20);
  const n = Math.min(total, maxPoints);
  const step = total > n ? Math.floor(total / n) : 1;
  const out = new Float32Array(n * 3);
  let o = 0;
  for (let i = 0; i < n; i++) {
    const off = i * step * 20;
    out[o++] = buf.readFloatLE(off);
    out[o++] = buf.readFloatLE(off + 4);
    out[o++] = buf.readFloatLE(off + 8);
  }
  return { points: out, count: n };
}
