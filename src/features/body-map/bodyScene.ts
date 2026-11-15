// AI-assisted: written with help from Claude (Anthropic). See README, "Use of AI tools".
//
// 3D anatomical body map. The anatomy comes from BodyParts3D (real anatomical
// meshes, CC BY-SA 2.1 JP, The Database Center for Life Science), simplified and
// bundled in public/assets/anatomy/body.glb, so it works offline.
//
// Look: a smoky, translucent skin over a realistic skeleton, organs and vessels.
// Calm by default: normal regions keep their natural anatomical color. A region
// that needs attention lights up in its status color (DESIGN.md sections 4 and 9).

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { Region, Status } from "../../lib/types";

export type View = "front" | "side" | "back";

export interface BodyScene {
  update(statusByRegion: Record<Region, Status>, selected: Region | null): void;
  setView(view: View): void;
  dispose(): void;
}

interface Options {
  onPick: (region: Region) => void;
  onHover: (region: Region | null, x: number, y: number) => void;
  onReady: () => void;
  onError: () => void;
  reducedMotion: boolean;
}

// Relative to the page, so it works from any base path (vite base is "./").
const MODEL_URL = "assets/anatomy/body.glb";

const STATUS_COLOR: Record<Status, THREE.Color> = {
  green: new THREE.Color("#2E9E5B"),
  yellow: new THREE.Color("#E0A100"),
  red: new THREE.Color("#D64045"),
};
const SKIN = new THREE.Color("#8fa6c8");
const TARGET = new THREE.Vector3(0, 0.86, 0);
const DISTANCE = 4.1;
const AZIMUTH: Record<View, number> = { front: 0.35, side: Math.PI / 2, back: Math.PI };

/** What each mesh in body.glb is, which region it belongs to, and how it looks. */
interface PartSpec {
  region: Region;
  kind: "skin" | "organ" | "bone" | "vessel";
  color: string;
  /** Higher wins when a click ray passes through several parts. */
  rank: number;
}

const PARTS: Record<string, PartSpec> = {
  skin_head: { region: "head", kind: "skin", color: "", rank: 0 },
  skin_torso: { region: "torso", kind: "skin", color: "", rank: 0 },
  skin_limbs: { region: "limbs", kind: "skin", color: "", rank: 0 },
  brain: { region: "head", kind: "organ", color: "#c9a7a2", rank: 5 },
  heart: { region: "heart", kind: "organ", color: "#9b3b3f", rank: 6 },
  lungs: { region: "lungs", kind: "organ", color: "#d49a98", rank: 5 },
  abdomen: { region: "torso", kind: "organ", color: "#a8665a", rank: 4 },
  arteries: { region: "heart", kind: "vessel", color: "#b9444c", rank: 5 },
  veins: { region: "heart", kind: "vessel", color: "#4b5fa8", rank: 5 },
  skeleton: { region: "limbs", kind: "bone", color: "#e6dcc6", rank: 2 },
};

/* ---------- Skin shader: a Fresnel rim, nearly clear where it faces the camera ---------- */

const SKIN_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const SKIN_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uRim;
  uniform float uGlow;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    f = pow(f, 2.6);
    vec3 c = mix(uColor * 0.35, uColor * 1.15 + 0.08, f);
    float a = (0.035 + f * uRim) * uOpacity + uGlow * 0.25 * f;
    gl_FragColor = vec4(c, a);
  }
`;

function skinMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: SKIN_VERT,
    fragmentShader: SKIN_FRAG,
    uniforms: {
      uColor: { value: SKIN.clone() },
      uOpacity: { value: 1 },
      uRim: { value: 0.5 },
      uGlow: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** X-ray glow: lets an organ that needs attention show through the ribs and skull. */
const XRAY_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    float a = (0.1 + 0.9 * pow(f, 2.2)) * uOpacity;
    gl_FragColor = vec4(uColor * (0.85 + f * 0.4), a);
  }
`;

function xrayMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: SKIN_VERT,
    fragmentShader: XRAY_FRAG,
    uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
}

function solidMaterial(spec: PartSpec) {
  return new THREE.MeshPhysicalMaterial({
    color: spec.color,
    roughness: spec.kind === "bone" ? 0.62 : 0.42,
    metalness: 0,
    clearcoat: spec.kind === "organ" || spec.kind === "vessel" ? 0.6 : 0.1,
    clearcoatRoughness: 0.35,
    sheen: spec.kind === "organ" ? 0.4 : 0,
    sheenColor: new THREE.Color("#ffd6d0"),
  });
}

/* ---------- Scene ---------- */

export function createBodyScene(host: HTMLElement, opts: Options): BodyScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.75;

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(1.5, 3, 2.5);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 1.2);
  rim.position.set(-2, 1.5, -2.5);
  scene.add(key, rim, new THREE.AmbientLight(0x404a66, 0.6));

  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enablePan = false;
  controls.minDistance = 1.4;
  controls.maxDistance = 6;
  controls.minPolarAngle = 0.9;
  controls.maxPolarAngle = 2.1;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.7;

  const placeCamera = (azimuth: number) => {
    const d = camera.position.distanceTo(TARGET) || DISTANCE;
    camera.position.set(TARGET.x + d * Math.sin(azimuth), TARGET.y + d * 0.1, TARGET.z + d * Math.cos(azimuth));
    camera.lookAt(TARGET);
    controls.update();
  };
  camera.position.set(0, TARGET.y, DISTANCE);
  placeCamera(AZIMUTH.front);

  const figure = new THREE.Group();
  scene.add(figure);

  type Part = { mesh: THREE.Mesh; spec: PartSpec; xray: THREE.Mesh | null };
  const parts: Part[] = [];
  const pickables: THREE.Object3D[] = [];
  const disposables: { dispose(): void }[] = [pmrem, envTex];

  /* Whole body: the dosimeter orbit, drawn procedurally around the figure. */
  const orbit = new THREE.Group();
  orbit.position.set(0, 1.0, 0);
  orbit.rotation.set(Math.PI / 2 - 0.26, 0.1, 0);
  figure.add(orbit);
  const ringGeo = new THREE.TorusGeometry(0.58, 0.0028, 8, 220);
  const ringMat = new THREE.MeshBasicMaterial({ color: STATUS_COLOR.green, transparent: true, opacity: 0.8 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  orbit.add(ring);
  const satGeo = new THREE.OctahedronGeometry(0.022, 0);
  const sat = new THREE.Mesh(satGeo, ringMat);
  sat.position.set(0.58, 0, 0);
  orbit.add(sat);
  const hitGeo = new THREE.TorusGeometry(0.58, 0.04, 6, 80);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
  const hit = new THREE.Mesh(hitGeo, hitMat);
  orbit.add(hit);
  const orbitSpec: PartSpec = { region: "body", kind: "vessel", color: "", rank: 1 };
  hit.userData.spec = orbitSpec;
  sat.userData.spec = orbitSpec;
  pickables.push(hit, sat);
  disposables.push(ringGeo, ringMat, satGeo, hitGeo, hitMat);

  /* Floor: a quiet polar grid. */
  const grid = new THREE.PolarGridHelper(0.7, 12, 5, 96, 0x34405f, 0x27304a);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.6;
  scene.add(grid);
  disposables.push(grid.geometry, grid.material as THREE.Material);

  /* Load the anatomy. */
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let disposed = false;
  loader.load(
    MODEL_URL,
    (gltf) => {
      if (disposed) return;
      const meshes: THREE.Mesh[] = [];
      gltf.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
      });
      meshes.forEach((mesh) => {
        const spec = PARTS[mesh.name] ?? PARTS[mesh.parent?.name ?? ""];
        if (!spec) return;
        mesh.geometry.computeVertexNormals();
        mesh.material = spec.kind === "skin" ? skinMaterial() : solidMaterial(spec);
        mesh.renderOrder = spec.kind === "skin" ? 10 : 1;
        mesh.userData.spec = spec;
        let xray: THREE.Mesh | null = null;
        if (spec.kind === "organ" || spec.kind === "vessel") {
          xray = new THREE.Mesh(mesh.geometry, xrayMaterial());
          xray.renderOrder = 20;
          xray.visible = false;
          mesh.add(xray);
          disposables.push(xray.material as THREE.Material);
        }
        parts.push({ mesh, spec, xray });
        pickables.push(mesh);
        disposables.push(mesh.geometry, mesh.material as THREE.Material);
      });
      figure.add(gltf.scene);
      opts.onReady();
      invalidate();
    },
    undefined,
    () => {
      if (!disposed) opts.onError();
    },
  );

  /* ---------- State, rendering, interaction ---------- */

  let statuses: Record<Region, Status> | null = null;
  let selected: Region | null = null;
  let hovered: Region | null = null;
  let frame = 0;
  let viewAnim: { from: number; to: number; start: number } | null = null;

  const anyRed = () => !!statuses && Object.values(statuses).includes("red");

  const apply = (time: number) => {
    if (!statuses) return;
    const pulse = opts.reducedMotion ? 0.6 : 0.5 + 0.5 * Math.sin(time / 480);
    for (const { mesh, spec, xray } of parts) {
      const status = statuses[spec.region];
      const isSel = selected === spec.region;
      const dim = selected !== null && !isSel;
      const isHover = hovered === spec.region;

      if (spec.kind === "skin") {
        const u = (mesh.material as THREE.ShaderMaterial).uniforms;
        (u.uColor.value as THREE.Color).copy(status === "green" ? SKIN : STATUS_COLOR[status]);
        u.uOpacity.value = dim ? 0.35 : 1;
        u.uRim.value = isSel ? 0.85 : status === "green" ? 0.45 : 0.7;
        u.uGlow.value = (isHover ? 0.6 : 0) + (isSel ? 0.5 : 0) + (status === "red" ? 0.6 * pulse : 0);
        continue;
      }

      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      // Natural color when normal; status color glows through when it needs attention.
      const alert = status !== "green";
      mat.emissive.copy(alert ? STATUS_COLOR[status] : new THREE.Color(0xffffff));
      let glow = 0;
      if (alert) glow = status === "red" ? 0.35 + 0.45 * pulse : 0.45;
      if (isSel) glow = Math.max(glow, alert ? 0.6 : 0.12);
      if (isHover) glow += alert ? 0.2 : 0.1;
      if (spec.kind === "bone" && !alert && !isSel) glow = 0;
      mat.emissiveIntensity = glow;
      const wantTransparent = dim;
      if (mat.transparent !== wantTransparent) {
        mat.transparent = wantTransparent;
        mat.depthWrite = !wantTransparent;
        mat.needsUpdate = true;
      }
      mat.opacity = dim ? (spec.kind === "bone" ? 0.12 : 0.18) : 1;

      if (xray) {
        const show = (alert || isSel || isHover) && !dim;
        xray.visible = show;
        if (show) {
          const u = (xray.material as THREE.ShaderMaterial).uniforms;
          (u.uColor.value as THREE.Color).copy(alert ? STATUS_COLOR[status] : new THREE.Color("#c9d6f2"));
          u.uOpacity.value = (alert ? (status === "red" ? 0.55 + 0.4 * pulse : 0.5) : 0.4) * (spec.kind === "vessel" ? 0.45 : 1);
          // The most serious status is drawn last, so red is never hidden behind amber.
          xray.renderOrder = status === "red" ? 22 : status === "yellow" ? 21 : 20;
        }
      }
    }

    const bodyStatus = statuses.body;
    ringMat.color.copy(STATUS_COLOR[bodyStatus]);
    ringMat.opacity =
      selected && selected !== "body" ? 0.2 : bodyStatus === "red" ? 0.5 + 0.5 * pulse : selected === "body" || hovered === "body" ? 1 : bodyStatus === "green" ? 0.4 : 0.8;
  };

  const render = (time = performance.now()) => {
    if (viewAnim) {
      const t = Math.min(1, (time - viewAnim.start) / 700);
      const e = 1 - Math.pow(1 - t, 3);
      placeCamera(viewAnim.from + (viewAnim.to - viewAnim.from) * e);
      if (t >= 1) viewAnim = null;
    }
    apply(time);
    renderer.render(scene, camera);
    // Keep animating only while something moves: a view change, or a red pulse.
    if (viewAnim || (anyRed() && !opts.reducedMotion)) frame = requestAnimationFrame(render);
    else frame = 0;
  };
  const invalidate = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  controls.addEventListener("change", invalidate);

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    invalidate();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // Picking: the highest-ranked part along the ray wins, so organs are reachable through skin and ribs.
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pick = (e: PointerEvent): Region | null => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    let best: PartSpec | null = null;
    for (const h of hits) {
      const spec = h.object.userData.spec as PartSpec | undefined;
      if (spec && (!best || spec.rank > best.rank)) best = spec;
    }
    return best?.region ?? null;
  };

  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) {
      const region = pick(e);
      if (region) opts.onPick(region);
    }
    down = null;
  };
  const onMove = (e: PointerEvent) => {
    if (e.buttons) return;
    const region = pick(e);
    if (region !== hovered) {
      hovered = region;
      renderer.domElement.style.cursor = region ? "pointer" : "grab";
      invalidate();
    }
    const r = host.getBoundingClientRect();
    opts.onHover(region, e.clientX - r.left, e.clientY - r.top);
  };
  const onLeave = () => {
    hovered = null;
    opts.onHover(null, 0, 0);
    invalidate();
  };
  const el = renderer.domElement;
  el.style.cursor = "grab";
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);

  return {
    update(s, sel) {
      statuses = s;
      selected = sel;
      invalidate();
    },
    setView(view) {
      const offset = camera.position.clone().sub(TARGET);
      const from = Math.atan2(offset.x, offset.z);
      let to = AZIMUTH[view];
      while (to - from > Math.PI) to -= 2 * Math.PI;
      while (to - from < -Math.PI) to += 2 * Math.PI;
      if (opts.reducedMotion) {
        placeCamera(to);
        invalidate();
        return;
      }
      viewAnim = { from, to, start: performance.now() };
      invalidate();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      for (const d of disposables) d.dispose();
      renderer.dispose();
      el.remove();
    },
  };
}
