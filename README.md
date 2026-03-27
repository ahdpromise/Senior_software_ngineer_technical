# nuScenes multi-sensor inspector

Project folder: **`F:\SoftEng`** (open this path in VS Code: **File → Open Folder**).

Web tool for the **Technical Assessment: Multi-Sensor Data Visualization and Data Quality Inspection** — browse nuScenes-style scenes and frames, view **camera** and **LiDAR**, and get a simple **PASS / WARNING / FAIL** quality result per frame.

## Architecture

| Layer        | Stack                                      |
|-------------|---------------------------------------------|
| Frontend    | React (Vite), **Three.js** for LiDAR points |
| Backend     | Node.js (Express)                           |
| Data        | nuScenes JSON tables + `samples/` files, or built-in **mock** data |

```text
[ React UI ] --HTTP--> [ Express API ] --reads--> [ v1.0-mini/*.json + samples/ ]
                              |
                              +--> /api/frames/:id/quality  (inspection rules)
```

Official dataset / SDK (optional): [nuScenes](https://www.nuscenes.org/nuscenes?tutorial=nuscenes).

## Prerequisites (install on your PC)

1. **Node.js** LTS (includes **npm**) — [https://nodejs.org](https://nodejs.org)  
   - Check: `node -v` (v18+ recommended)
2. **Visual Studio Code** — [https://code.visualstudio.com](https://code.visualstudio.com)
3. **Git** (to push to GitHub) — [https://git-scm.com](https://git-scm.com)

No Python required (assessment allows Node.js for the backend).

## Setup

From the project root (`F:\SoftEng`):

```bash
cd server
npm install
copy ..\.env.example .env   # Windows; or: cp ../.env.example .env on macOS/Linux

cd ..\client
npm install
```

### Optional: real nuScenes mini dataset

1. Download **v1.0-mini** from nuScenes and unpack so you have e.g. `C:\data\nuscenes\v1.0-mini\` and `C:\data\nuscenes\samples\`.
2. In `server/.env` set:

   `NUSCENES_ROOT=C:\data\nuscenes`  
   `NUSCENES_VERSION=v1.0-mini`

If `NUSCENES_ROOT` is missing or invalid, the server uses **mock** data under `server/data/mock/` so the app runs immediately for demos.

## Run (two terminals in VS Code)

**Terminal 1 — API**

```bash
cd F:\SoftEng\server
npm start
```

**Terminal 2 — UI**

```bash
cd F:\SoftEng\client
npm run dev
```

Open **http://localhost:5173** — Vite proxies `/api` to port **3001**.

## API (for reviewers)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Mock vs real root, version |
| GET | `/api/scenes` | List scenes |
| GET | `/api/scenes/:sceneToken/frames` | Ordered samples in scene |
| GET | `/api/frames/:sampleToken` | Sensor rows + file URLs |
| GET | `/api/frames/:sampleToken/quality` | PASS / WARNING / FAIL |
| GET | `/api/lidar/:sampleDataToken` | LiDAR points (JSON) for Three.js |
| GET | `/api/files?path=...` | Binary sample file (camera, etc.) |

## Quality checks (basic)

- **Missing sensor data** — expects `CAM_FRONT` and `LIDAR_TOP` sample_data rows → **FAIL** if missing  
- **Timestamp inconsistencies** — spread across sensors → **WARNING** / **FAIL** above thresholds  
- **Annotation availability** — `sample_annotation` for the frame → **WARNING** if none  

## Deliverables checklist (from brief)

- [x] Source code (this repo: `client/` + `server/`)
- [x] README (architecture, setup, run)
- [ ] Screenshots or short demo video (add under `docs/` or your report)

## Visualization choice

**Three.js** is used instead of raw WebGL: same GPU pipeline, less boilerplate, suitable for a time-boxed assessment.

## License

Assessment / demo project — align with your employer and nuScenes [terms of use](https://www.nuscenes.org/terms-of-use) when using real data.
