import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Simple Three.js point cloud (easier than raw WebGL for this assessment).
 */
export default function LidarCanvas({ positions, height = 320 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth || 640;
    const h = height;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1f26);

    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 500);
    camera.position.set(0, 0, 35);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.innerHTML = "";
    el.appendChild(renderer.domElement);

    const geom = new THREE.BufferGeometry();
    const arr = positions?.length
      ? new Float32Array(positions)
      : new Float32Array(0);
    geom.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.25,
      color: 0x5ac8fa,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geom, mat);
    scene.add(points);

    const grid = new THREE.GridHelper(40, 20, 0x333842, 0x22262e);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    let raf = 0;
    const spin = () => {
      points.rotation.z += 0.002;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(spin);
    };
    spin();

    const onResize = () => {
      const nw = el.clientWidth || w;
      camera.aspect = nw / h;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geom.dispose();
      mat.dispose();
      renderer.dispose();
      el.innerHTML = "";
    };
  }, [positions, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        minHeight: height,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #2d333b",
      }}
    />
  );
}
