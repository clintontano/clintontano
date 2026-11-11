/*
  Hero scene: a black set of scales standing over a ruled sheet.

  Whatever sits in each pan presses a well into the sheet below it, so the page
  shows the weight of both sides: bound law in one pan, a model's lattice in the
  other. The pointer tips the beam (and leaves its own small dent), scrolling
  turns the piece, and the beam is an underdamped spring so it rocks before it
  settles, the way a real balance does.
*/
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SplineCurve,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Material } from 'three';
import { clamp, damp, isSmallScreen, lerp } from './env';

export interface SceneOptions {
  reducedMotion: boolean;
  onFail?: () => void;
}

const PAPER = '#f3f2ee';
const INK = '#0b0b0b';

/** Bounds of the sculpture in world units, used to frame the camera. */
const SCULPTURE = { width: 4.15, height: 3.25, centreY: 1.5 };
const LIFT = 0.55; // how far the piece floats above the sheet
const PIVOT_Y = 2.5;
const ARM = 1.5;
const PAN_DROP = 1.08;
const FOV = 30;

type Profile = Array<[radius: number, y: number]>;

/** Turns a 2D profile on a lathe. The spline keeps every transition soft, like cast metal. */
function turned(profile: Profile, radialSegments: number, samples = 96) {
  const curve = new SplineCurve(profile.map(([r, y]) => new Vector2(r, y)));
  const points = curve.getPoints(samples).map((p) => new Vector2(Math.max(0.0005, p.x), p.y));
  return new LatheGeometry(points, radialSegments);
}

const SHEET_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform vec3 uWellA;
  uniform vec3 uWellB;
  uniform vec2 uMouse;
  uniform float uMouseOn;
  varying vec2 vPlane;
  varying float vDepth;

  float well(vec2 p, vec2 centre, float depth, float sigma) {
    vec2 d = p - centre;
    return depth * exp(-dot(d, d) / (2.0 * sigma * sigma));
  }

  void main() {
    vec3 pos = position;
    float y = 0.0;
    y -= well(pos.xz, uWellA.xy, uWellA.z, 0.9);
    y -= well(pos.xz, uWellB.xy, uWellB.z, 0.9);
    y -= well(pos.xz, uMouse, 0.3 * uMouseOn, 0.75);
    // The sheet is never perfectly still.
    y += 0.03 * sin(pos.x * 0.55 + uTime * 0.35) * sin(pos.z * 0.5 - uTime * 0.27);
    pos.y = y;

    vPlane = position.xz;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const SHEET_FRAGMENT = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uPaper;
  uniform float uSpacing;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec2 uShade;
  varying vec2 vPlane;
  varying float vDepth;

  // Anti-aliased rule at every integer of c, about one pixel wide at any distance.
  float rule(float c, float thickness) {
    float w = fwidth(c);
    float d = abs(fract(c + 0.5) - 0.5) / max(w, 1e-5);
    float line = 1.0 - smoothstep(thickness, thickness + 1.0, d);
    return line * (1.0 - smoothstep(0.2, 0.55, w));
  }

  void main() {
    float ruled = rule(vPlane.y / uSpacing, 0.25);
    float margin = rule(vPlane.x / (uSpacing * 6.0), 0.15) * 0.3;
    float fog = smoothstep(uFogNear, uFogFar, vDepth);
    float ink = max(ruled, margin) * (1.0 - fog);

    // A soft pool of shade under the piece, so it sits over the sheet rather than on a void.
    vec2 s = (vPlane - uShade) * vec2(0.55, 1.0);
    float shade = 0.075 * exp(-dot(s, s) / 1.1);

    vec3 colour = mix(uPaper * (1.0 - shade), uInk, ink);
    gl_FragColor = vec4(colour, 1.0);
    #include <colorspace_fragment>
  }
`;

export function mountHeroScene(hero: HTMLElement, canvas: HTMLCanvasElement, options: SceneOptions) {
  const small = isSmallScreen();
  const radial = small ? 40 : 72;
  const title = hero.querySelector<HTMLElement>('.hero__title');
  const card = hero.querySelector<HTMLElement>('.hero__card');
  const hint = hero.querySelector<HTMLElement>('[data-hero-hint]');

  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(PAPER, 1);
  const maxPixelRatio = small ? 1.5 : 2;

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 80);
  const disposables: Array<BufferGeometry | Material> = [];
  const track = <T extends BufferGeometry | Material>(item: T) => {
    disposables.push(item);
    return item;
  };

  // --- Sheet -----------------------------------------------------------------
  const sheetUniforms = {
    uTime: { value: 0 },
    uWellA: { value: new Vector3(99, 99, 0) },
    uWellB: { value: new Vector3(99, 99, 0) },
    uMouse: { value: new Vector2(99, 99) },
    uMouseOn: { value: 0 },
    uShade: { value: new Vector2(0, 0) },
    uInk: { value: new Color(INK) },
    uPaper: { value: new Color(PAPER) },
    uSpacing: { value: 0.46 },
    uFogNear: { value: 9 },
    uFogFar: { value: 27 },
  };
  const sheetGeometry = track(new PlaneGeometry(64, 44, small ? 180 : 320, small ? 120 : 220));
  sheetGeometry.rotateX(-Math.PI / 2);
  sheetGeometry.translate(0, 0, -13);
  const sheet = new Mesh(
    sheetGeometry,
    track(new ShaderMaterial({ uniforms: sheetUniforms, vertexShader: SHEET_VERTEX, fragmentShader: SHEET_FRAGMENT })),
  );
  sheet.frustumCulled = false;
  scene.add(sheet);

  // --- Materials: lacquered black, with paper for the page blocks -------------
  const lacquer = track(
    new MeshPhysicalMaterial({ color: 0x101010, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
  );
  const gloss = track(
    new MeshPhysicalMaterial({ color: 0x0c0c0c, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.14 }),
  );
  const cloth = track(new MeshPhysicalMaterial({ color: 0x141414, roughness: 0.7, clearcoat: 0.25 }));
  const paper = track(new MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.95 }));
  const inkLine = track(new MeshBasicMaterial({ color: INK }));

  const mesh = (geometry: BufferGeometry, material: Material, parent: Object3D) => {
    const m = new Mesh(track(geometry), material);
    parent.add(m);
    return m;
  };

  // --- Sculpture -------------------------------------------------------------
  const rig = new Group();
  rig.position.y = LIFT;
  scene.add(rig);

  // Stepped plinth and turned column
  mesh(
    turned(
      [
        [0, 0],
        [0.6, 0],
        [0.7, 0.012],
        [0.71, 0.06],
        [0.66, 0.085],
        [0.56, 0.1],
        [0.53, 0.145],
        [0.44, 0.165],
        [0.3, 0.19],
        [0.17, 0.25],
        [0.11, 0.34],
        [0.085, 0.45],
        [0.105, 0.54],
        [0.15, 0.6],
        [0.15, 0.66],
        [0.09, 0.72],
        [0.062, 0.86],
        [0.055, 1.3],
        [0.05, 1.86],
        [0.058, 2.0],
        [0.1, 2.05],
        [0.1, 2.1],
        [0.058, 2.15],
        [0.05, 2.3],
        [0.075, 2.38],
        [0.09, 2.45],
        [0.06, 2.53],
        [0, 2.56],
      ],
      radial,
      220,
    ),
    lacquer,
    rig,
  );

  // Beam: tapered, gently arched, pivoting on the column head
  const beam = new Group();
  beam.position.y = PIVOT_Y;
  rig.add(beam);

  const beamProfile: Vector2[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * 2 - 1;
    beamProfile.push(new Vector2(0.024 + 0.05 * Math.pow(1 - Math.abs(t), 1.25), t * ARM));
  }
  const beamGeometry = new LatheGeometry(beamProfile, small ? 16 : 28);
  beamGeometry.rotateZ(Math.PI / 2);
  const beamPositions = beamGeometry.attributes.position!;
  const arch = (x: number) => -0.12 * (x / ARM) ** 2;
  for (let i = 0; i < beamPositions.count; i++) {
    beamPositions.setY(i, beamPositions.getY(i) + arch(beamPositions.getX(i)));
  }
  beamGeometry.computeVertexNormals();
  mesh(beamGeometry, lacquer, beam);

  const hub = mesh(new CylinderGeometry(0.135, 0.135, 0.1, radial), gloss, beam);
  hub.rotation.x = Math.PI / 2;
  const hubRing = mesh(new TorusGeometry(0.135, 0.018, 12, radial), lacquer, beam);
  hubRing.position.z = 0.05;
  const hubRingBack = new Mesh(hubRing.geometry, lacquer);
  hubRingBack.position.z = -0.05;
  beam.add(hubRingBack);
  const needle = mesh(new ConeGeometry(0.02, 0.46, 16), gloss, beam);
  needle.position.y = 0.36;

  // Hangers: hook, three chains and a shallow pan, free to swing under the beam ends
  const panGeometry = track(
    turned(
      [
        [0, -1.1],
        [0.14, -1.098],
        [0.28, -1.076],
        [0.39, -1.026],
        [0.44, -0.99],
        [0.452, -0.975],
        [0.445, -0.962],
        [0.425, -0.972],
        [0.37, -1.0],
        [0.27, -1.048],
        [0.14, -1.068],
        [0, -1.07],
      ],
      radial,
      72,
    ),
  );
  const chainGeometry = track(new CylinderGeometry(0.0065, 0.0065, 1, 6));
  const hookGeometry = track(new TorusGeometry(0.042, 0.011, 10, 28));
  const up = new Vector3(0, 1, 0);

  const makeHanger = (side: -1 | 1) => {
    const end = new Vector3(side * ARM, arch(ARM), 0);

    const eye = new Mesh(hookGeometry, lacquer);
    eye.position.copy(end).add(new Vector3(0, -0.045, 0));
    beam.add(eye);

    const group = new Group();
    group.position.copy(end).add(new Vector3(0, -0.09, 0));
    beam.add(group);

    const hook = new Mesh(hookGeometry, lacquer);
    hook.rotation.y = Math.PI / 2;
    hook.position.y = -0.035;
    group.add(hook);

    const top = new Vector3(0, -0.075, 0);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const rim = new Vector3(Math.cos(angle) * 0.43, -0.972, Math.sin(angle) * 0.43);
      const direction = rim.clone().sub(top);
      const chain = new Mesh(chainGeometry, inkLine);
      chain.position.copy(top).addScaledVector(direction, 0.5);
      chain.scale.y = direction.length();
      chain.quaternion.setFromUnitVectors(up, direction.normalize());
      group.add(chain);
    }
    group.add(new Mesh(panGeometry, gloss));

    // Marks the middle of the pan, read back each frame to place its well on the sheet.
    const plumb = new Object3D();
    plumb.position.y = -PAN_DROP;
    group.add(plumb);

    return { side, group, plumb, swing: 0, swingVel: 0, sway: 0, swayVel: 0 };
  };

  const hangers = [makeHanger(-1), makeHanger(1)] as const;
  const lawPan = hangers[0].group;
  const modelPan = hangers[1].group;

  // Left pan: the law, as two bound volumes
  const makeBook = (w: number, h: number, d: number, cover: Material) => {
    const book = new Group();
    const board = 0.014;
    const boardGeometry = track(new BoxGeometry(w, board, d));
    const topBoard = new Mesh(boardGeometry, cover);
    topBoard.position.y = h / 2 - board / 2;
    const bottomBoard = new Mesh(boardGeometry, cover);
    bottomBoard.position.y = -h / 2 + board / 2;
    const spine = new Mesh(track(new BoxGeometry(board, h, d)), cover);
    spine.position.x = -w / 2 + board / 2;
    const pages = new Mesh(track(new BoxGeometry(w - 0.03, h - board * 2, d - 0.024)), paper);
    pages.position.x = 0.006;
    book.add(topBoard, bottomBoard, spine, pages);
    return book;
  };

  const floor = -1.068;
  const tome = makeBook(0.5, 0.13, 0.35, cloth);
  tome.position.set(0.01, floor + 0.065, 0);
  tome.rotation.y = 0.55;
  const volume = makeBook(0.4, 0.1, 0.28, cloth);
  volume.position.set(-0.01, floor + 0.13 + 0.05, 0.01);
  volume.rotation.y = -0.22;
  lawPan.add(tome, volume);

  // Right pan: the model, as a wire lattice hovering above the dish
  const lattice = new Group();
  const latticeY = -0.68;
  lattice.position.y = latticeY;
  modelPan.add(lattice);

  const shell = new IcosahedronGeometry(0.27, 1);
  const shellPositions = shell.attributes.position!;
  const nodes: Vector3[] = [];
  const nodeIndex = new Map<string, number>();
  const edges = new Set<string>();
  const indexOf = (i: number) => {
    const v = new Vector3().fromBufferAttribute(shellPositions, i);
    const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
    let index = nodeIndex.get(key);
    if (index === undefined) {
      index = nodes.push(v) - 1;
      nodeIndex.set(key, index);
    }
    return index;
  };
  for (let i = 0; i < shellPositions.count; i += 3) {
    const tri = [indexOf(i), indexOf(i + 1), indexOf(i + 2)];
    for (let e = 0; e < 3; e++) {
      const a = tri[e]!;
      const b = tri[(e + 1) % 3]!;
      edges.add(a < b ? `${a}-${b}` : `${b}-${a}`);
    }
  }
  shell.dispose();

  const struts = new InstancedMesh(track(new CylinderGeometry(0.0042, 0.0042, 1, 5, 1, true)), inkLine, edges.size);
  const joints = new InstancedMesh(track(new SphereGeometry(0.014, 10, 8)), inkLine, nodes.length);
  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const scale = new Vector3();
  let strut = 0;
  for (const edge of edges) {
    const [a, b] = edge.split('-').map(Number) as [number, number];
    const from = nodes[a]!;
    const direction = nodes[b]!.clone().sub(from);
    const length = direction.length();
    rotation.setFromUnitVectors(up, direction.normalize());
    matrix.compose(from.clone().addScaledVector(direction, length / 2), rotation, scale.set(1, length, 1));
    struts.setMatrixAt(strut++, matrix);
  }
  nodes.forEach((node, i) => {
    matrix.compose(node, rotation.identity(), scale.set(1, 1, 1));
    joints.setMatrixAt(i, matrix);
  });
  lattice.add(struts, joints);

  const core = new Mesh(
    track(new IcosahedronGeometry(0.1, 0)),
    track(new MeshPhysicalMaterial({ color: 0x0c0c0c, roughness: 0.35, clearcoat: 1, flatShading: true })),
  );
  lattice.add(core);

  // --- Lighting: a plain white studio --------------------------------------
  scene.add(new HemisphereLight('#ffffff', '#d8d6cf', 1.7));
  const key = new DirectionalLight('#ffffff', 2.8);
  key.position.set(-3, 5, 7);
  const rim = new DirectionalLight('#ffffff', 2.4);
  rim.position.set(5, 3, -4);
  scene.add(key, rim);

  // --- Framing ---------------------------------------------------------------
  const tanHalfFov = Math.tan(MathUtils.degToRad(FOV / 2));
  const cameraBase = new Vector3();
  const lookAt = new Vector3(0, LIFT + SCULPTURE.centreY, 0);
  let width = 1;
  let height = 1;

  const resize = () => {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    const aspect = width / height;
    const wide = width > 900 && aspect > 1.05;

    // Where the sculpture sits on screen, as a fraction of the hero.
    let centreX = 0.5;
    let centreY = 0.5;
    let fitHeight = 0.64;
    let fitWidth = 0.9;
    if (wide) {
      centreX = 0.73;
      fitWidth = 0.44;
    } else {
      // On tall screens it takes the gap between the name and the card.
      const top = title ? title.offsetTop + title.offsetHeight : height * 0.4;
      const bottom = card ? card.offsetTop : height * 0.75;
      const free = Math.max(150, bottom - top);
      centreY = (top + free * 0.5) / height;
      fitHeight = (free * 0.92) / height;
    }

    const distance = Math.max(
      SCULPTURE.height / (fitHeight * 2 * tanHalfFov),
      SCULPTURE.width / (fitWidth * aspect * 2 * tanHalfFov),
    );
    cameraBase.set(0, lookAt.y + distance * 0.17, distance * 0.985);

    const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    camera.setViewOffset(width, height, (0.5 - centreX) * width, (0.5 - centreY) * height, width, height);
    camera.updateProjectionMatrix();
    sheetUniforms.uFogNear.value = distance * 0.8;
    sheetUniforms.uFogFar.value = distance * 2.5;
  };

  // --- Interaction -----------------------------------------------------------
  const pointerTarget = new Vector2();
  const pointer = new Vector2();
  const raycaster = new Raycaster();
  const ground = new Plane(new Vector3(0, 1, 0), 0);
  const ndc = new Vector2();
  const hit = new Vector3();
  const mouseTarget = new Vector2(99, 99);
  let mouseOnTarget = 0;
  let pointerActive = false;
  let hintTimer = 0;

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    const rect = canvas.getBoundingClientRect();
    if (event.clientY > rect.bottom || rect.bottom < 0) {
      pointerActive = false;
      mouseOnTarget = 0;
      return;
    }
    pointerActive = true;
    ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    pointerTarget.set(clamp(ndc.x, -1, 1), clamp(-ndc.y, -1, 1));
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(ground, hit)) {
      mouseTarget.set(hit.x, hit.z);
      mouseOnTarget = 1;
    } else {
      mouseOnTarget = 0;
    }
    if (hint && !hintTimer) {
      hintTimer = window.setTimeout(() => hint.classList.add('is-used'), 2600);
    }
  };
  const onPointerLeave = () => {
    pointerActive = false;
    mouseOnTarget = 0;
  };

  let scrollTarget = 0;
  let scrollProgress = 0;
  let lastScrollY = window.scrollY;
  let scrollKick = 0;
  const onScroll = () => {
    const y = window.scrollY;
    scrollTarget = clamp(y / Math.max(1, hero.offsetHeight));
    scrollKick += clamp((y - lastScrollY) / 600, -0.5, 0.5);
    lastScrollY = y;
  };

  // --- Simulation ------------------------------------------------------------
  const restY = LIFT + PIVOT_Y + arch(ARM) - 0.09 - PAN_DROP;
  const world = new Vector3();
  let time = 0;
  let intro = options.reducedMotion ? 1 : 0;
  let tilt = options.reducedMotion ? -0.07 : 0.46;
  let tiltVel = 0;
  let yaw = options.reducedMotion ? 0.36 : -1.3;
  let pitch = 0;

  const step = (dt: number) => {
    time += dt;
    intro = clamp(intro + dt / 2.6);
    const eased = 1 - Math.pow(2, -10 * intro);

    if (!pointerActive) pointerTarget.multiplyScalar(1 - damp(0.8, dt));
    const previousX = pointer.x;
    pointer.lerp(pointerTarget, damp(4.5, dt));
    const pointerVel = (pointer.x - previousX) / dt;

    scrollProgress = lerp(scrollProgress, scrollTarget, damp(6, dt));

    // The beam: an underdamped spring chasing the pointer.
    const idle = Math.sin(time * 0.52) * 0.045 + Math.sin(time * 0.21 + 1.3) * 0.03;
    const targetTilt = idle - pointer.x * 0.27;
    tiltVel += scrollKick * 0.9;
    scrollKick = 0;
    tiltVel += ((targetTilt - tilt) * 15 - tiltVel * 2.1) * dt;
    tilt = clamp(tilt + tiltVel * dt, -0.5, 0.5);
    beam.rotation.z = tilt;

    const previousYaw = yaw;
    const yawTarget =
      0.36 + pointer.x * 0.5 + scrollProgress * 1.6 + Math.sin(time * 0.17) * 0.07 - (1 - eased) * 1.6;
    yaw = lerp(yaw, yawTarget, damp(3.2, dt));
    const yawVel = (yaw - previousYaw) / dt;
    pitch = lerp(pitch, pointer.y * 0.06, damp(3, dt));
    rig.rotation.set(pitch, yaw, 0);
    rig.position.y = LIFT + Math.sin(time * 0.8) * 0.035 - (1 - eased) * 0.7 + scrollProgress * 0.5;

    for (const hanger of hangers) {
      const drive = -pointerVel * 0.5 + tiltVel * 0.45 * hanger.side;
      hanger.swingVel += (-hanger.swing * 24 - hanger.swingVel * 1.5 + drive * 6) * dt;
      hanger.swing = clamp(hanger.swing + hanger.swingVel * dt, -0.5, 0.5);
      hanger.swayVel += (-hanger.sway * 24 - hanger.swayVel * 1.5 + yawVel * hanger.side * 5) * dt;
      hanger.sway = clamp(hanger.sway + hanger.swayVel * dt, -0.5, 0.5);
      // Counter-rotate against the beam so the pans always hang plumb.
      hanger.group.rotation.set(hanger.sway, 0, -tilt + hanger.swing);
    }

    lattice.rotation.y += dt * 0.42;
    lattice.rotation.x += dt * 0.23;
    core.rotation.y -= dt * 1.1;
    core.rotation.z += dt * 0.6;
    lattice.position.y = latticeY + Math.sin(time * 1.1) * 0.02;

    // Each pan presses a well into the sheet: the lower it hangs, the deeper the well.
    rig.updateMatrixWorld(true);
    const wells = [sheetUniforms.uWellA.value, sheetUniforms.uWellB.value] as const;
    hangers.forEach((hanger, i) => {
      hanger.plumb.getWorldPosition(world);
      const drop = restY - (world.y - (rig.position.y - LIFT));
      wells[i]!.set(world.x, world.z, clamp(0.42 + drop * 1.4, 0.05, 1.2) * eased);
    });
    sheetUniforms.uShade.value.set(rig.position.x, rig.position.z);
    sheetUniforms.uMouseOn.value = lerp(sheetUniforms.uMouseOn.value, mouseOnTarget, damp(3, dt));
    sheetUniforms.uMouse.value.lerp(mouseTarget, damp(6, dt));
    sheetUniforms.uTime.value = time;

    camera.position.set(
      cameraBase.x + pointer.x * 0.35,
      cameraBase.y - pointer.y * 0.2 + scrollProgress * 1.2,
      cameraBase.z - scrollProgress * 1.2,
    );
    camera.lookAt(lookAt.x, lookAt.y + scrollProgress * 0.4, lookAt.z);
  };

  const render = () => renderer.render(scene, camera);

  let frame = 0;
  let last = 0;
  let inView = true;
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    if (dt <= 0) return;
    step(dt);
    render();
  };
  const start = () => {
    if (frame || options.reducedMotion || !inView || document.hidden) return;
    last = performance.now();
    frame = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  // --- Wiring ----------------------------------------------------------------
  resize();
  step(1 / 60);
  render();

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (options.reducedMotion) {
      step(1 / 60);
      render();
    }
  });
  resizeObserver.observe(canvas);

  if (!options.reducedMotion) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    scrollProgress = scrollTarget;
    scrollKick = 0;

    // Only draw while the hero is on screen and the tab is visible.
    const io = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false;
      if (inView) start();
      else stop();
    });
    io.observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    start();
  }

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stop();
    options.onFail?.();
  });

  return () => {
    stop();
    resizeObserver.disconnect();
    disposables.forEach((item) => item.dispose());
    renderer.dispose();
  };
}
