/**
 * Basic frame quality: missing sensors, timestamp spread, annotations.
 * Result: PASS | WARNING | FAIL with reasons.
 */

const REQUIRED_CHANNELS = ["CAM_FRONT", "LIDAR_TOP"];
const WARN_TIME_MS = 50;
const FAIL_TIME_MS = 500;

export function inspectFrame(loader, sampleToken) {
  const sample = loader.sampleByToken.get(sampleToken);
  if (!sample) {
    return {
      status: "FAIL",
      reasons: ["Unknown sample token"],
      details: {},
    };
  }

  const dataRows = loader.sampleDataForSample(sampleToken);
  const byChannel = new Map();
  for (const row of dataRows) {
    const ch = row.channel || row.filename || "";
    if (row.channel) byChannel.set(row.channel, row);
  }

  const reasons = [];
  const missing = [];
  for (const ch of REQUIRED_CHANNELS) {
    if (!byChannel.has(ch)) missing.push(ch);
  }
  if (missing.length) {
    reasons.push(`Missing sensor data: ${missing.join(", ")}`);
  }

  const timestamps = dataRows
    .map((r) => (typeof r.timestamp === "number" ? r.timestamp : null))
    .filter((t) => t != null);
  let timeSpread = 0;
  if (timestamps.length >= 2) {
    const minT = Math.min(...timestamps);
    const maxT = Math.max(...timestamps);
    timeSpread = maxT - minT;
    if (timeSpread > FAIL_TIME_MS) {
      reasons.push(
        `Timestamp spread ${timeSpread.toFixed(2)} ms exceeds ${FAIL_TIME_MS} ms`
      );
    } else if (timeSpread > WARN_TIME_MS) {
      reasons.push(
        `Timestamp spread ${timeSpread.toFixed(2)} ms (>${WARN_TIME_MS} ms)`
      );
    }
  } else if (dataRows.length && timestamps.length < 2) {
    reasons.push("Insufficient timestamps to compare sensors");
  }
  const insufficientTs = Boolean(dataRows.length && timestamps.length < 2);

  const annotations = loader.tables.sample_annotation || [];
  const annForSample = annotations.filter((a) => a.sample_token === sampleToken);
  const keyFrames = dataRows.filter((r) => r.is_key_frame);
  let annotationWarning = false;
  if (keyFrames.length && !annForSample.length) {
    reasons.push("No sample_annotation for this key frame");
    annotationWarning = true;
  } else if (dataRows.length && !annForSample.length) {
    reasons.push("No annotations linked to this sample");
    annotationWarning = true;
  }

  let status = "PASS";
  if (missing.length) status = "FAIL";
  else if (timeSpread > FAIL_TIME_MS) status = "FAIL";
  else if (
    timeSpread > WARN_TIME_MS ||
    annotationWarning ||
    insufficientTs
  ) {
    status = "WARNING";
  }

  return {
    status,
    reasons: reasons.length ? reasons : ["All basic checks passed"],
    details: {
      sampleToken,
      channelsPresent: [...byChannel.keys()],
      timestampSpreadMs: timeSpread,
      annotationCount: annForSample.length,
      sampleDataCount: dataRows.length,
    },
  };
}
