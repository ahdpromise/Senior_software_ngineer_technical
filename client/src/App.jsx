import { useCallback, useEffect, useState } from "react";
import LidarCanvas from "./components/LidarCanvas.jsx";

const api = (path) => fetch(path).then((r) => {
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
});

function statusColor(s) {
  if (s === "PASS") return "#34c759";
  if (s === "WARNING") return "#ff9f0a";
  if (s === "FAIL") return "#ff453a";
  return "#888";
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [sceneToken, setSceneToken] = useState("");
  const [frames, setFrames] = useState([]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [frameDetail, setFrameDetail] = useState(null);
  const [quality, setQuality] = useState(null);
  const [lidar, setLidar] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/health")
      .then(setHealth)
      .catch(() => setErr("Backend not reachable. Start server: cd server && npm install && npm start"));
  }, []);

  useEffect(() => {
    api("/api/scenes")
      .then((d) => {
        setScenes(d.scenes || []);
        if (d.scenes?.length && !sceneToken) {
          setSceneToken(d.scenes[0].token);
        }
      })
      .catch((e) => setErr(String(e.message)));
  }, []);

  const loadFrames = useCallback(() => {
    if (!sceneToken) return;
    api(`/api/scenes/${sceneToken}/frames`)
      .then((d) => {
        setFrames(d.frames || []);
        setFrameIdx(0);
      })
      .catch((e) => setErr(String(e.message)));
  }, [sceneToken]);

  useEffect(() => {
    loadFrames();
  }, [loadFrames]);

  const sampleToken = frames[frameIdx]?.token;

  useEffect(() => {
    if (!sampleToken) {
      setFrameDetail(null);
      setQuality(null);
      setLidar(null);
      return;
    }
    setLidar(null);
    setErr("");
    api(`/api/frames/${sampleToken}`)
      .then(setFrameDetail)
      .catch((e) => setErr(String(e.message)));
    api(`/api/frames/${sampleToken}/quality`)
      .then(setQuality)
      .catch(() => setQuality(null));
  }, [sampleToken]);

  useEffect(() => {
    if (!frameDetail?.sensors) return;
    const lidarRow = frameDetail.sensors.find((s) => s.channel === "LIDAR_TOP");
    if (!lidarRow?.token) {
      setLidar([]);
      return;
    }
    api(`/api/lidar/${lidarRow.token}`)
      .then((d) => setLidar(d.positions || []))
      .catch(() => setLidar([]));
  }, [frameDetail]);

  const cam = frameDetail?.sensors?.find((s) => s.channel === "CAM_FRONT");
  const imgSrc = cam?.urlCamera || null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem" }}>
          Multi-sensor inspection (nuScenes)
        </h1>
        <p style={{ margin: 0, color: "#9aa0a6", fontSize: "0.95rem" }}>
          React + Node.js + Three.js — browse scenes, view camera & LiDAR, run quality checks
          (PASS / WARNING / FAIL).
        </p>
        {health && (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#6e7681" }}>
            API: {health.mock ? "mock dataset" : `root ${health.nuscenesRoot || "—"}`} ·{" "}
            {health.version}
          </p>
        )}
      </header>

      {err && (
        <div
          style={{
            background: "#3d1f1f",
            border: "1px solid #ff453a",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            marginBottom: "1rem",
          }}
        >
          {err}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "1fr 1fr",
          marginBottom: "1rem",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ color: "#9aa0a6", fontSize: "0.85rem" }}>Scene</span>
          <select
            value={sceneToken}
            onChange={(e) => setSceneToken(e.target.value)}
            style={{
              padding: "0.5rem 0.65rem",
              borderRadius: 6,
              border: "1px solid #2d333b",
              background: "#1c2128",
              color: "#e8eaed",
            }}
          >
            {scenes.map((s) => (
              <option key={s.token} value={s.token}>
                {s.name} ({s.nbr_samples} samples)
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ color: "#9aa0a6", fontSize: "0.85rem" }}>Frame</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={frameIdx <= 0}
              onClick={() => setFrameIdx((i) => Math.max(0, i - 1))}
              style={btnStyle}
            >
              Previous
            </button>
            <span style={{ color: "#c9d1d9" }}>
              {frames.length ? frameIdx + 1 : 0} / {frames.length}
            </span>
            <button
              type="button"
              disabled={frameIdx >= frames.length - 1}
              onClick={() => setFrameIdx((i) => Math.min(frames.length - 1, i + 1))}
              style={btnStyle}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {quality && (
        <div
          style={{
            padding: "1rem",
            borderRadius: 8,
            border: `2px solid ${statusColor(quality.status)}`,
            background: "#161b22",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.8rem", color: "#9aa0a6" }}>Inspection</span>
            <strong style={{ color: statusColor(quality.status), fontSize: "1.1rem" }}>
              {quality.status}
            </strong>
          </div>
          <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.2rem", color: "#c9d1d9" }}>
            {quality.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {quality.details && (
            <pre
              style={{
                marginTop: "0.75rem",
                fontSize: "0.75rem",
                color: "#6e7681",
                overflow: "auto",
              }}
            >
              {JSON.stringify(quality.details, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
        <div
          style={{
            background: "#161b22",
            borderRadius: 8,
            padding: "0.75rem",
            border: "1px solid #2d333b",
          }}
        >
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "#c9d1d9" }}>
            Camera (CAM_FRONT)
          </h2>
          {imgSrc ? (
            <img
              src={imgSrc}
              alt="CAM_FRONT"
              style={{ width: "100%", borderRadius: 6, display: "block" }}
            />
          ) : (
            <p style={{ color: "#6e7681", margin: 0 }}>No camera file for this frame.</p>
          )}
        </div>

        <div
          style={{
            background: "#161b22",
            borderRadius: 8,
            padding: "0.75rem",
            border: "1px solid #2d333b",
          }}
        >
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "#c9d1d9" }}>
            LiDAR (LIDAR_TOP) — Three.js
          </h2>
          <LidarCanvas positions={lidar} height={300} />
        </div>
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "0.45rem 0.85rem",
  borderRadius: 6,
  border: "1px solid #2d333b",
  background: "#21262d",
  color: "#e8eaed",
};
