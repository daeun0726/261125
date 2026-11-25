"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type Device = "제동" | "대차" | "출입문" | "냉난방" | "전기" | "기관" | "연결기" | "차체";
export const DEVICE_LIST: Device[] = ["제동", "대차", "출입문", "냉난방", "전기", "기관", "연결기", "차체"];

type Props = {
  vehicleType?: string;           // 전기기관차 | 디젤기관차 | 객차 | 화차
  highlight?: string | null;      // one device to flash (report detail, search)
  counts?: Record<string, number>; // device -> count, for heatmap mode
  onPick?: (device: Device) => void;
  height?: number;
  label?: string;
};

const BODY = 0xdfe6ef, FRAME = 0x3b4656, WHEEL = 0x2a2f36, ACCENT = 0x0b3d91;

function heatColor(t: number) {
  // 0 -> neutral grey, 0.5 -> amber, 1 -> red
  const a = new THREE.Color(0xcbd5e1), b = new THREE.Color(0xf59e0b), c = new THREE.Color(0xdc2626);
  return t < 0.5 ? a.lerp(b, t * 2) : b.lerp(c, (t - 0.5) * 2);
}

export default function Train3D({ vehicleType = "전기기관차", highlight = null, counts, onPick, height = 320, label }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    const el = mount.current!;
    const w = el.clientWidth, h = height;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 200);
    camera.position.set(9.5, 5.5, 11);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(8, 14, 10);
    scene.add(sun);

    // ground + rails
    for (const z of [-0.72, 0.72]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(16, 0.08, 0.1), new THREE.MeshStandardMaterial({ color: 0x9aa4b1, metalness: 0.6, roughness: 0.4 }));
      rail.position.set(0, 0.04, z);
      scene.add(rail);
    }
    for (let x = -7.6; x <= 7.6; x += 0.8) {
      const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 2.2), new THREE.MeshStandardMaterial({ color: 0xc8b9a6 }));
      sleeper.position.set(x, 0.0, 0);
      scene.add(sleeper);
    }

    const groups: Record<Device, THREE.Group> = Object.fromEntries(DEVICE_LIST.map((d) => [d, new THREE.Group()])) as Record<Device, THREE.Group>;
    DEVICE_LIST.forEach((d) => { groups[d].userData.device = d; scene.add(groups[d]); });
    const mat = (color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...opts });
    const add = (d: Device, geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rot?: [number, number, number]) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      if (rot) mesh.rotation.set(...rot);
      mesh.userData.device = d;
      groups[d].add(mesh);
      return mesh;
    };

    const isLoco = vehicleType === "전기기관차" || vehicleType === "디젤기관차";
    const isFreight = vehicleType === "화차";
    const L = isLoco ? 9 : 10, bodyY = 1.85, bodyH = isFreight ? 1.6 : 2.1;

    // body (차체)
    const bodyMat = mat(isFreight ? 0x8a5a44 : BODY, { transparent: true, opacity: 1 });
    add("차체", new THREE.BoxGeometry(L, bodyH, 2.3), bodyMat, 0, bodyY + bodyH / 2 - 0.3, 0);
    add("차체", new THREE.BoxGeometry(L + 0.1, 0.18, 2.35), mat(ACCENT), 0, bodyY - 0.2, 0);
    if (!isFreight) {
      // windows strip
      for (const z of [-1.16, 1.16]) add("차체", new THREE.BoxGeometry(L * 0.86, 0.5, 0.02), mat(0x1f2a3a, { roughness: 0.2, metalness: 0.4 }), 0, bodyY + 1.1, z);
    }
    if (isLoco) {
      // cab noses
      for (const s of [-1, 1]) add("차체", new THREE.BoxGeometry(0.5, bodyH * 0.7, 2.2), mat(BODY, { transparent: true }), s * (L / 2 + 0.2), bodyY + 0.45, 0);
    }
    // underframe
    add("차체", new THREE.BoxGeometry(L - 0.4, 0.25, 2.0), mat(FRAME), 0, bodyY - 0.45, 0);

    // bogies (대차) with wheels; brake units (제동) next to wheels
    const bogieX = isLoco ? [-L / 2 + 1.7, L / 2 - 1.7] : [-L / 2 + 1.9, L / 2 - 1.9];
    for (const bx of bogieX) {
      add("대차", new THREE.BoxGeometry(2.6, 0.35, 1.9), mat(FRAME), bx, 0.95, 0);
      for (const ax of [-0.75, 0.75]) {
        add("대차", new THREE.CylinderGeometry(0.06, 0.06, 1.7, 12), mat(0x555c66), bx + ax, 0.48, 0, [Math.PI / 2, 0, 0]);
        for (const z of [-0.72, 0.72]) {
          add("대차", new THREE.CylinderGeometry(0.45, 0.45, 0.14, 28), mat(WHEEL, { metalness: 0.5 }), bx + ax, 0.48, z, [Math.PI / 2, 0, 0]);
          add("제동", new THREE.BoxGeometry(0.22, 0.42, 0.18), mat(0xb8432f), bx + ax + (ax < 0 ? -0.55 : 0.55), 0.62, z * 1.16);
        }
      }
      // springs
      for (const z of [-0.8, 0.8]) add("대차", new THREE.CylinderGeometry(0.16, 0.16, 0.4, 14), mat(0x6b7685), bx, 1.32, z);
    }
    // brake air reservoir under floor
    add("제동", new THREE.CylinderGeometry(0.28, 0.28, 1.6, 18), mat(0x7a8796), 0, bodyY - 0.85, 0.55, [0, 0, Math.PI / 2]);

    // couplers (연결기)
    for (const s of [-1, 1]) {
      const endX = s * (L / 2 + (isLoco ? 0.45 : 0));
      add("연결기", new THREE.BoxGeometry(0.7, 0.22, 0.22), mat(0x4a5361, { metalness: 0.6 }), endX + s * 0.35, 1.35, 0);
      add("연결기", new THREE.BoxGeometry(0.22, 0.4, 0.38), mat(0x4a5361, { metalness: 0.6 }), endX + s * 0.75, 1.35, 0);
    }

    // doors (출입문) — passenger cars get side doors; locos get cab doors
    const doorX = isLoco ? [-L / 2 + 0.6, L / 2 - 0.6] : isFreight ? [0] : [-L / 2 + 1.2, L / 2 - 1.2];
    for (const dx of doorX) for (const z of [-1.17, 1.17]) add("출입문", new THREE.BoxGeometry(isFreight ? 2.4 : 0.9, bodyH - 0.5, 0.05), mat(isFreight ? 0x6e4636 : 0x9fb3c8), dx, bodyY + (bodyH - 0.5) / 2 - 0.2, z);

    // roof HVAC (냉난방)
    if (!isFreight) add("냉난방", new THREE.BoxGeometry(isLoco ? 1.6 : 3.2, 0.42, 1.6), mat(0xc9d3df), isLoco ? -1.4 : 0, bodyY + bodyH - 0.1, 0);
    else add("냉난방", new THREE.BoxGeometry(0.01, 0.01, 0.01), mat(0xffffff), 0, -5, 0); // not applicable

    // electrical (전기): pantograph for electric loco, equipment boxes under floor for others
    if (vehicleType === "전기기관차") {
      const base = bodyY + bodyH - 0.05;
      add("전기", new THREE.BoxGeometry(1.4, 0.12, 1.0), mat(0x5b6472), 1.8, base, 0);
      add("전기", new THREE.BoxGeometry(0.08, 1.2, 0.08), mat(0x5b6472), 1.5, base + 0.55, 0, [0, 0, 0.55]);
      add("전기", new THREE.BoxGeometry(0.08, 1.2, 0.08), mat(0x5b6472), 2.1, base + 0.55, 0, [0, 0, -0.55]);
      add("전기", new THREE.BoxGeometry(0.15, 0.06, 1.6), mat(0x222831), 1.8, base + 1.05, 0);
      add("전기", new THREE.BoxGeometry(2.2, 0.9, 1.6), mat(0x8a97a6), 1.3, bodyY + 0.5, 0); // converter inside body
    } else {
      add("전기", new THREE.BoxGeometry(1.8, 0.5, 0.9), mat(0x8a97a6), -1.2, bodyY - 0.85, -0.45);
    }

    // engine (기관): diesel engine block + exhaust stack; others: not applicable
    if (vehicleType === "디젤기관차") {
      add("기관", new THREE.BoxGeometry(3.4, 1.2, 1.5), mat(0x7d6b52), 0.6, bodyY + 0.55, 0);
      add("기관", new THREE.CylinderGeometry(0.16, 0.2, 0.6, 14), mat(0x3a3f46), 1.2, bodyY + bodyH + 0.1, 0);
    } else {
      add("기관", new THREE.BoxGeometry(0.01, 0.01, 0.01), mat(0xffffff), 0, -5, 0);
    }

    // centre the model and frame camera
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2.1, 0);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.minDistance = 6;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2.05;

    // highlight / heatmap
    const internal = new Set(["전기", "기관", "제동"]);
    const max = counts ? Math.max(1, ...Object.values(counts)) : 1;
    DEVICE_LIST.forEach((d) => {
      groups[d].children.forEach((m) => {
        const mm = (m as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (counts) {
          const n = counts[d] || 0;
          if (d !== "차체") mm.color = heatColor(n / max);
          else mm.color = heatColor((counts[d] || 0) / max).lerp(new THREE.Color(BODY), 0.55);
        }
      });
    });
    if (highlight && internal.has(highlight)) {
      // see-through body so internal parts are visible
      groups["차체"].children.forEach((m) => {
        const mm = (m as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mm.transparent = true;
        mm.opacity = 0.28;
      });
    }
    let marker: THREE.Mesh | null = null;
    if (highlight && groups[highlight as Device]) {
      const g = groups[highlight as Device];
      const box = new THREE.Box3().setFromObject(g);
      if (!box.isEmpty() && box.min.y > -4) {
        const c = box.getCenter(new THREE.Vector3());
        marker = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
        marker.position.set(c.x, box.max.y + 0.9, c.z);
        scene.add(marker);
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
        line.position.set(c.x, box.max.y + 0.45, c.z);
        scene.add(line);
      }
    }

    // picking
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    const pickables = DEVICE_LIST.flatMap((d) => groups[d].children);
    const locate = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      return (hit?.object.userData.device as Device) || null;
    };
    let downAt = 0;
    const onMove = (e: PointerEvent) => setHover(locate(e));
    const onDown = () => { downAt = performance.now(); };
    const onUp = (e: PointerEvent) => {
      if (performance.now() - downAt > 250) return; // drag, not click
      const d = locate(e);
      if (d && pickRef.current) pickRef.current(d);
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointerleave", () => setHover(null));

    let raf = 0;
    const clock = new THREE.Clock();
    const flash = highlight && groups[highlight as Device] ? groups[highlight as Device] : null;
    const tick = () => {
      const t = clock.getElapsedTime();
      if (flash) {
        const k = 0.5 + 0.5 * Math.sin(t * 5);
        flash.children.forEach((m) => {
          const mm = (m as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mm.emissive = new THREE.Color(0xff2a1a);
          mm.emissiveIntensity = 0.25 + 0.75 * k;
        });
        if (marker) marker.position.y += Math.sin(t * 3) * 0.004;
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      const nw = el.clientWidth;
      camera.aspect = nw / h;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mt = m.material as THREE.Material | undefined;
        mt?.dispose?.();
      });
      el.removeChild(renderer.domElement);
    };
  }, [vehicleType, highlight, counts, height]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white">
      <div ref={mount} style={{ height }} className={onPick ? "cursor-pointer" : "cursor-grab"} />
      <div className="pointer-events-none absolute left-3 top-2 text-xs text-slate-500">
        {label ?? `${vehicleType} 3D 모델 (가상)`} · 드래그로 회전
      </div>
      {highlight && (
        <div className="pointer-events-none absolute right-3 top-2 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow">고장 부위: {highlight}</div>
      )}
      {hover && (
        <div className="pointer-events-none absolute bottom-2 left-3 rounded-md bg-slate-900/80 px-2 py-1 text-xs text-white">
          {hover}{counts ? ` · ${counts[hover] || 0}건` : ""}{onPick ? " · 클릭하면 보고서 보기" : ""}
        </div>
      )}
      {counts && (
        <div className="pointer-events-none absolute bottom-2 right-3 flex items-center gap-1 text-[10px] text-slate-500">
          적음 <span className="h-2 w-16 rounded" style={{ background: "linear-gradient(90deg,#cbd5e1,#f59e0b,#dc2626)" }} /> 많음
        </div>
      )}
    </div>
  );
}
