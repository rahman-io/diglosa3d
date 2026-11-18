import * as THREE from 'three';
import { MaterialPalette } from './materials';

export interface VillageObstacle {
  x: number;
  z: number;
  halfW: number;
  halfD: number;
}

export interface VillageInteractable {
  id: string;
  x: number;
  z: number;
  radius: number;
  message: string;
  mesh: THREE.Object3D;
}

interface VillagerActor {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Mesh;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  arms: THREE.Group;
  waypoints: Array<[number, number]>;
  wpIdx: number;
  x: number;
  z: number;
  yaw: number;
  pauseTimer: number;
  speed: number;
  walkPhase: number;
}

interface GolemActor {
  root: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  waypoints: Array<[number, number]>;
  wpIdx: number;
  x: number;
  z: number;
  yaw: number;
  pauseTimer: number;
  walkPhase: number;
  holdsFlower: boolean;
}

interface LlamaActor {
  root: THREE.Group;
  headPivot: THREE.Group;
  legs: THREE.Mesh[];
  baseX: number;
  baseZ: number;
  baseYaw: number;
  phase: number;
}

interface BeeActor {
  root: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  centerX: number;
  centerY: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  speed: number;
  phase: number;
}

interface PillagerActor {
  root: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  centerX: number;
  baseY: number;
  centerZ: number;
  patrolR: number;
  phase: number;
}

export interface MinecraftVillageRig {
  group: THREE.Group;
  obstacles: VillageObstacle[];
  interactables: VillageInteractable[];
  clickables: THREE.Object3D[];
  villagers: VillagerActor[];
  golems: GolemActor[];
  llamas: LlamaActor[];
  bees: BeeActor[];
  pillagers: PillagerActor[];
  critters: Array<{
    root: THREE.Group;
    head: THREE.Group;
    baseX: number;
    baseZ: number;
    baseYaw: number;
    phase: number;
  }>;
  torchesFlame: THREE.Object3D[];
  smokePuffs: Array<{ mesh: THREE.Mesh; baseX: number; baseY: number; baseZ: number; phase: number }>;
  disposables: Array<{ dispose: () => void }>;
}

// Helper: detailed Minecraft-style Timber & Cobblestone House
export function createMinecraftHouse(
  palette: MaterialPalette,
  options: {
    x: number;
    z: number;
    rotY: number;
    width?: number;
    depth?: number;
    wallHeight?: number;
    roofTint?: number;
    flowerBox?: boolean;
  },
): THREE.Group {
  const w = options.width ?? 6.0;
  const d = options.depth ?? 5.0;
  const h = options.wallHeight ?? 3.4;
  const group = new THREE.Group();
  group.position.set(options.x, 0, options.z);
  group.rotation.y = options.rotY;

  const cobbleMat = palette.getPixelMat('cobble');
  const plankMat = palette.getPixelMat('oak_plank');
  const logMat = palette.getPixelMat('oak_log');
  const roofMat = options.roofTint
    ? palette.getPixelMat('spruce_plank', options.roofTint)
    : palette.getPixelMat('spruce_plank');
  const glassMat = palette.getPixelMat('glass_pane');
  const darkWoodMat = palette.getMat(0x5c3a1e, 'matte');
  const flameMat = palette.getMat(0xfef08a, 'emissive');
  const emberMat = palette.getMat(0xf97316, 'emissive');

  // Cobblestone base foundation
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 1.0, d + 0.3), cobbleMat);
  base.position.y = 0.5;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Wooden plank walls
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, h - 0.8, d - 0.1), plankMat);
  walls.position.y = 1.0 + (h - 0.8) * 0.5;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // 4 Corner Oak Log Pillars
  const pillarGeo = new THREE.BoxGeometry(0.62, h + 0.2, 0.62);
  const halfW = w * 0.5 - 0.08;
  const halfD = d * 0.5 - 0.08;
  const corners: Array<[number, number]> = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [-halfW, halfD],
    [halfW, halfD],
  ];
  corners.forEach(([cx, cz]) => {
    const p = new THREE.Mesh(pillarGeo, logMat);
    p.position.set(cx, (h + 0.2) * 0.5, cz);
    p.castShadow = true;
    group.add(p);
  });

  // Stepped Minecraft Pitched Plank Roof (3 tiers + gable fill)
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const tW = w + 1.1 - i * 1.1;
    const tD = d + 1.0;
    const tier = new THREE.Mesh(new THREE.BoxGeometry(Math.max(1.2, tW), 0.55, tD), roofMat);
    tier.position.y = h + 0.25 + i * 0.52;
    tier.castShadow = true;
    tier.receiveShadow = true;
    group.add(tier);
  }

  // Front Cobblestone Entry Stairs + Oak Door
  const stair1 = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.38, 0.9), cobbleMat);
  stair1.position.set(0, 0.19, halfD + 0.55);
  stair1.receiveShadow = true;
  const stair2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 0.5), cobbleMat);
  stair2.position.set(0, 0.32, halfD + 0.25);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.05, 0.18), darkWoodMat);
  door.position.set(0, 1.55, halfD + 0.06);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.24), palette.getMat(0xfbbf24, 'metal'));
  handle.position.set(0.35, 1.5, halfD + 0.1);
  group.add(stair1, stair2, door, handle);

  // Twin Torch Posts beside the front steps (from screenshot reference)
  [-1.25, 1.25].forEach((tx) => {
    const cob = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.85, 0.45), cobbleMat);
    cob.position.set(tx, 0.42, halfD + 0.48);
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), darkWoodMat);
    stick.position.set(tx, 1.15, halfD + 0.48);
    const ember = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.18), emberMat);
    ember.position.set(tx, 1.48, halfD + 0.48);
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), flameMat);
    flame.position.set(tx, 1.62, halfD + 0.48);
    group.add(cob, stick, ember, flame);
  });

  // Glass Windows on front & sides
  const winFront = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.95, 0.16), glassMat);
  winFront.position.set(w * 0.28, 2.25, halfD + 0.05);
  const winSideL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 1.4), glassMat);
  winSideL.position.set(-halfW - 0.04, 2.25, 0);
  const winSideR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 1.4), glassMat);
  winSideR.position.set(halfW + 0.04, 2.25, 0);
  group.add(winFront, winSideL, winSideR);

  if (options.flowerBox) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.4), darkWoodMat);
    box.position.set(w * 0.28, 1.55, halfD + 0.22);
    const flower1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.24), palette.getMat(0xef4444, 'matte'));
    flower1.position.set(w * 0.28 - 0.28, 1.84, halfD + 0.24);
    const flower2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.24), palette.getMat(0xfacc15, 'matte'));
    flower2.position.set(w * 0.28 + 0.24, 1.84, halfD + 0.24);
    group.add(box, flower1, flower2);
  }

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(w + 2.8, d + 2.8),
    palette.contactShadowMat,
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  group.add(shadow);

  return group;
}

function createCobblestoneWell(palette: MaterialPalette, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const cobble = palette.getPixelMat('cobble');
  const oakFence = palette.getPixelMat('oak_plank');
  const roof = palette.getPixelMat('spruce_plank');

  // Gravel pad underneath
  const gravel = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 4.6), cobble);
  gravel.position.y = 0.04;
  gravel.receiveShadow = true;
  g.add(gravel);

  // 4-sided well basin walls
  const wN = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.05, 0.45), cobble);
  wN.position.set(0, 0.55, -1.18);
  const wS = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.05, 0.45), cobble);
  wS.position.set(0, 0.55, 1.18);
  const wE = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.05, 2.0), cobble);
  wE.position.set(1.18, 0.55, 0);
  const wW = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.05, 2.0), cobble);
  wW.position.set(-1.18, 0.55, 0);
  [wN, wS, wE, wW].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  });

  // Water inside the well
  const water = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 1.9), palette.waterMat);
  water.position.y = 0.48;
  g.add(water);

  // 4 Corner fence posts + pitched plank roof
  const postGeo = new THREE.BoxGeometry(0.28, 2.4, 0.28);
  const posts: Array<[number, number]> = [
    [-1.18, -1.18],
    [1.18, -1.18],
    [-1.18, 1.18],
    [1.18, 1.18],
  ];
  posts.forEach(([px, pz]) => {
    const p = new THREE.Mesh(postGeo, oakFence);
    p.position.set(px, 2.15, pz);
    p.castShadow = true;
    g.add(p);
  });

  const roofBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 3.4), roof);
  roofBase.position.y = 3.4;
  roofBase.castShadow = true;
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.35, 2.3), roof);
  roofCap.position.y = 3.74;
  roofCap.castShadow = true;
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.32), palette.getMat(0xfacc15, 'emissive'));
  lantern.position.set(0, 2.95, 0);
  const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.44), palette.getMat(0x64748b, 'metal'));
  bucket.position.set(0.35, 1.45, 0);
  g.add(roofBase, roofCap, lantern, bucket);

  return g;
}

function createMarketStall(
  palette: MaterialPalette,
  x: number,
  z: number,
  rotY: number,
  stripeColor: 'wool_yellow' | 'wool_red',
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const plank = palette.getPixelMat('oak_plank');
  const woodPost = palette.getPixelMat('oak_log');
  const woolColor = palette.getPixelMat(stripeColor);
  const woolWhite = palette.getPixelMat('wool_white');
  const craft = palette.getPixelMat('crafting');
  const flame = palette.getMat(0xfef08a, 'emissive');

  // Counter & Crates
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.0, 1.2), plank);
  counter.position.set(0, 0.5, 0.5);
  counter.castShadow = true;
  counter.receiveShadow = true;
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), craft);
  barrel.position.set(-1.35, 0.48, -0.75);
  barrel.castShadow = true;
  g.add(counter, barrel);

  // 4 Fence Posts
  const postGeo = new THREE.BoxGeometry(0.24, 2.65, 0.24);
  const corners: Array<[number, number]> = [
    [-1.75, -1.05],
    [1.75, -1.05],
    [-1.75, 1.05],
    [1.75, 1.05],
  ];
  corners.forEach(([px, pz]) => {
    const p = new THREE.Mesh(postGeo, woodPost);
    p.position.set(px, 1.32, pz);
    p.castShadow = true;
    g.add(p);
  });

  // Striped Wool Canopy (5 alternating blocks)
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(0.84, 0.28, 2.7),
      i % 2 === 0 ? woolColor : woolWhite,
    );
    seg.position.set(-1.68 + i * 0.84, 2.75, 0);
    seg.castShadow = true;
    g.add(seg);
  }

  // Stall Counter Torches
  [-1.3, 1.3].forEach((tx) => {
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), woodPost);
    stick.position.set(tx, 1.22, 0.5);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.15), flame);
    tip.position.set(tx, 1.5, 0.5);
    g.add(stick, tip);
  });

  return g;
}

function createLanternPost(palette: MaterialPalette, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const postMat = palette.getPixelMat('oak_log');
  const plankMat = palette.getPixelMat('oak_plank');
  const ironMat = palette.getMat(0x1e293b, 'metal');
  const glowMat = palette.getMat(0xfbbf24, 'emissive');

  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.1, 0.28), postMat);
  pole.position.y = 1.55;
  pole.castShadow = true;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.24), plankMat);
  arm.position.set(0.32, 3.05, 0);
  arm.castShadow = true;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), ironMat);
  cap.position.set(0.68, 2.82, 0);
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.28), glowMat);
  core.position.set(0.68, 2.58, 0);
  g.add(pole, arm, cap, core);
  return g;
}

function createVillagerMesh(
  palette: MaterialPalette,
  style: 'farmer' | 'librarian' | 'cleric' | 'fletcher' | 'shepherd' | 'trader',
): VillagerActor {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), palette.contactShadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  const robeHex =
    style === 'trader'
      ? 0x1d4ed8
      : style === 'librarian'
      ? 0xe2e8f0
      : style === 'cleric'
      ? 0x881337
      : style === 'shepherd'
      ? 0x15803d
      : style === 'fletcher'
      ? 0x78350f
      : 0x92400e;
  const robeMat = palette.getMat(robeHex, 'matte');
  const skinMat = palette.getMat(0xe7b48b, 'matte');
  const darkMat = palette.getMat(0x1e293b, 'matte');
  const eyeMat = palette.getMat(0x16a34a, 'gloss');

  const makeLeg = (lx: number): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(lx, 0.9, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.34), darkMat);
    m.position.y = -0.45;
    m.castShadow = true;
    leg.add(m);
    return leg;
  };
  const leftLeg = makeLeg(-0.2);
  const rightLeg = makeLeg(0.2);
  body.add(leftLeg, rightLeg);

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.85, 0.56), robeMat);
  skirt.position.y = 0.95;
  skirt.castShadow = true;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.9, 0.58), robeMat);
  torso.position.y = 1.68;
  torso.castShadow = true;
  body.add(skirt, torso);

  if (style === 'trader') {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.18, 0.6), palette.getMat(0xfacc15, 'metal'));
    trim.position.y = 1.45;
    body.add(trim);
  } else if (style === 'farmer') {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.0, 0.1), palette.getMat(0xb45309, 'matte'));
    apron.position.set(0, 1.2, 0.31);
    body.add(apron);
  }

  // Folded Minecraft Villager arms (or carrying bread basket if farmer/librarian)
  const arms = new THREE.Group();
  arms.position.set(0, 1.85, 0.18);
  const armBar = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 0.34), robeMat);
  armBar.position.set(0, -0.18, 0.16);
  armBar.castShadow = true;
  arms.add(armBar);
  if (style === 'farmer') {
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.48), palette.getPixelMat('hay'));
    basket.position.set(0, -0.05, 0.48);
    arms.add(basket);
  }
  body.add(arms);

  // Classic Villager Head + Unibrow + Nose
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.92, 0.72), skinMat);
  head.position.y = 2.58;
  head.castShadow = true;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.24), palette.getMat(0xd69a6c, 'matte'));
  nose.position.set(0, 2.38, 0.44);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.06), darkMat);
  brow.position.set(0, 2.66, 0.38);
  const eL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), eyeMat);
  eL.position.set(-0.18, 2.56, 0.37);
  const eR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), eyeMat);
  eR.position.set(0.18, 2.56, 0.37);
  body.add(head, nose, brow, eL, eR);

  if (style === 'farmer') {
    const brim = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.1, 1.18), palette.getPixelMat('hay'));
    brim.position.y = 2.95;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.28, 0.76), palette.getPixelMat('hay'));
    crown.position.y = 3.1;
    body.add(brim, crown);
  } else if (style === 'trader') {
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.42, 0.82), palette.getMat(0x1e40af, 'matte'));
    hood.position.y = 2.95;
    const goldBand = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.12, 0.84), palette.getMat(0xfacc15, 'metal'));
    goldBand.position.y = 2.82;
    body.add(hood, goldBand);
  }

  return {
    root,
    body,
    head,
    leftLeg,
    rightLeg,
    arms,
    waypoints: [],
    wpIdx: 0,
    x: 0,
    z: 0,
    yaw: 0,
    pauseTimer: 0,
    speed: 2.1,
    walkPhase: Math.random() * Math.PI * 2,
  };
}

function createIronGolemMesh(palette: MaterialPalette, holdsFlower: boolean): GolemActor {
  const root = new THREE.Group();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), palette.contactShadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  const ironMat = palette.getMat(0xd6d3d1, 'matte');
  const mossMat = palette.getMat(0x4d7c0f, 'matte');
  const darkMat = palette.getMat(0x292524, 'matte');
  const eyeGlow = palette.getMat(0xef4444, 'emissive');

  const makeLeg = (lx: number): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(lx, 1.25, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.25, 0.58), ironMat);
    m.position.y = -0.62;
    m.castShadow = true;
    leg.add(m);
    return leg;
  };
  const leftLeg = makeLeg(-0.48);
  const rightLeg = makeLeg(0.48);
  root.add(leftLeg, rightLeg);

  const waist = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.72), darkMat);
  waist.position.y = 1.45;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.25, 0.98), ironMat);
  chest.position.y = 2.28;
  chest.castShadow = true;
  const vine = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.85, 1.02), mossMat);
  vine.position.set(-0.35, 2.18, 0);
  root.add(waist, chest, vine);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.92, 0.82), ironMat);
  head.position.set(0, 3.25, 0.08);
  head.castShadow = true;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.36, 0.24), palette.getMat(0xa8a29e, 'matte'));
  nose.position.set(0, 3.05, 0.54);
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.08), eyeGlow);
  eyeL.position.set(-0.2, 3.28, 0.5);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.08), eyeGlow);
  eyeR.position.set(0.2, 3.28, 0.5);
  root.add(head, nose, eyeL, eyeR);

  const makeArm = (ax: number, flower: boolean): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(ax, 2.72, 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.05, 0.52), ironMat);
    mesh.position.y = -0.95;
    mesh.castShadow = true;
    arm.add(mesh);
    if (flower) {
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.08), palette.getMat(0x16a34a, 'matte'));
      stem.position.set(0, -1.88, 0.38);
      stem.rotation.x = 0.6;
      const petal = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.12), palette.getMat(0xfacc15, 'emissive'));
      petal.position.set(0, -1.78, 0.55);
      arm.add(stem, petal);
      arm.rotation.x = -0.65;
    }
    return arm;
  };
  const leftArm = makeArm(-1.25, holdsFlower);
  const rightArm = makeArm(1.25, false);
  root.add(leftArm, rightArm);

  return {
    root,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    waypoints: [],
    wpIdx: 0,
    x: 0,
    z: 0,
    yaw: 0,
    pauseTimer: 0,
    walkPhase: 0,
    holdsFlower,
  };
}

function createLlamaMesh(
  palette: MaterialPalette,
  x: number,
  z: number,
  yaw: number,
  carpetHex: number,
): LlamaActor {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;

  const wool = palette.getMat(0xf8fafc, 'matte');
  const snoutMat = palette.getMat(0xe2c7a8, 'matte');
  const carpet = palette.getMat(carpetHex, 'matte');
  const trim = palette.getMat(0xfacc15, 'matte');
  const dark = palette.getMat(0x0f172a, 'gloss');

  const legs: THREE.Mesh[] = [];
  const legGeo = new THREE.BoxGeometry(0.26, 0.85, 0.26);
  const legCoords: Array<[number, number]> = [
    [-0.24, -0.45],
    [0.24, -0.45],
    [-0.24, 0.45],
    [0.24, 0.45],
  ];
  legCoords.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, wool);
    leg.position.set(lx, 0.425, lz);
    leg.castShadow = true;
    legs.push(leg);
    root.add(leg);
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.78, 1.38), wool);
  body.position.y = 1.18;
  body.castShadow = true;
  const rug = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.46, 0.85), carpet);
  rug.position.set(0, 1.38, -0.05);
  const rugTrim = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.1, 0.88), trim);
  rugTrim.position.set(0, 1.16, -0.05);
  root.add(body, rug, rugTrim);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.45, 0.56);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.9, 0.46), wool);
  neck.position.set(0, 0.42, 0.08);
  neck.castShadow = true;
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.34), snoutMat);
  snout.position.set(0, 0.72, 0.38);
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), wool);
  earL.position.set(-0.16, 1.0, 0.05);
  const earR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), wool);
  earR.position.set(0.16, 1.0, 0.05);
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), dark);
  eyeL.position.set(-0.16, 0.86, 0.32);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), dark);
  eyeR.position.set(0.16, 0.86, 0.32);
  headPivot.add(neck, snout, earL, earR, eyeL, eyeR);
  root.add(headPivot);

  return { root, headPivot, legs, baseX: x, baseZ: z, baseYaw: yaw, phase: Math.random() * 6 };
}

function createBeeMesh(palette: MaterialPalette): {
  root: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
} {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.52), palette.getMat(0xfacc15, 'matte'));
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.18), palette.getMat(0x1e293b, 'matte'));
  stripe.position.z = -0.05;
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.06), palette.getMat(0x0f172a, 'gloss'));
  eyeL.position.set(-0.11, 0.04, 0.27);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.06), palette.getMat(0x0f172a, 'gloss'));
  eyeR.position.set(0.11, 0.04, 0.27);

  const wingMat = palette.getMat(0xf8fafc, 'glass');
  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.26), wingMat);
  leftWing.position.set(-0.28, 0.2, 0.02);
  const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.26), wingMat);
  rightWing.position.set(0.28, 0.2, 0.02);

  root.add(body, stripe, eyeL, eyeR, leftWing, rightWing);
  return { root, leftWing, rightWing };
}

function createPillagerMesh(palette: MaterialPalette): {
  root: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
} {
  const root = new THREE.Group();
  const coat = palette.getMat(0x334155, 'matte');
  const skin = palette.getMat(0x94a3b8, 'matte');
  const dark = palette.getMat(0x0f172a, 'matte');

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 0.32), dark);
  leftLeg.position.set(-0.2, 0.425, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 0.32), dark);
  rightLeg.position.set(0.2, 0.425, 0);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.15, 0.56), coat);
  torso.position.y = 1.42;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.88, 0.72), skin);
  head.position.y = 2.42;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.22), skin);
  nose.position.set(0, 2.24, 0.42);
  const crossbow = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.45), palette.getMat(0x78350f, 'matte'));
  crossbow.position.set(0.45, 1.45, 0.42);
  root.add(leftLeg, rightLeg, torso, head, nose, crossbow);
  return { root, leftLeg, rightLeg };
}

export function createMinecraftVillageWorld(palette: MaterialPalette): MinecraftVillageRig {
  const group = new THREE.Group();
  const obstacles: VillageObstacle[] = [];
  const interactables: VillageInteractable[] = [];
  const clickables: THREE.Object3D[] = [];
  const villagers: VillagerActor[] = [];
  const golems: GolemActor[] = [];
  const llamas: LlamaActor[] = [];
  const bees: BeeActor[] = [];
  const pillagers: PillagerActor[] = [];
  const critters: MinecraftVillageRig['critters'] = [];
  const torchesFlame: THREE.Object3D[] = [];
  const smokePuffs: Array<{ mesh: THREE.Mesh; baseX: number; baseY: number; baseZ: number; phase: number }> = [];
  const disposables: Array<{ dispose: () => void }> = [];

  // 1. Classic Minecraft Square Sun high in sky
  const sunGroup = new THREE.Group();
  sunGroup.position.set(68, 58, -86);
  sunGroup.lookAt(0, 0, 0);
  const sunCore = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfef9c3, fog: false }),
  );
  const sunHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      fog: false,
    }),
  );
  sunHalo.position.z = -0.2;
  sunGroup.add(sunCore, sunHalo);
  group.add(sunGroup);

  // 2. Central Cobblestone Village Well (East of spawn road, very visible from Title Screen)
  const well = createCobblestoneWell(palette, 7.5, 11.2);
  well.userData.villageId = 'village_well';
  group.add(well);
  clickables.push(well);
  obstacles.push({ x: 7.5, z: 11.2, halfW: 1.55, halfD: 1.55 });
  interactables.push({
    id: 'village_well',
    x: 7.5,
    z: 11.2,
    radius: 3.4,
    message: 'Sumur Batu Desa: Warga berkumpul di sini mengisi air sebelum berangkat bekerja!',
    mesh: well,
  });

  // 3. Village Market Square (Yellow & White Striped Canopies + Tied Fence Post)
  const stall1 = createMarketStall(palette, 13.5, 23.8, -0.35, 'wool_yellow');
  const stall2 = createMarketStall(palette, 19.6, 20.6, -1.15, 'wool_yellow');
  group.add(stall1, stall2);
  obstacles.push({ x: 13.5, z: 23.8, halfW: 2.0, halfD: 1.4 });
  obstacles.push({ x: 19.6, z: 20.6, halfW: 1.6, halfD: 2.0 });

  // Tied Torch Post in Market Square
  const marketPost = new THREE.Group();
  marketPost.position.set(16.2, 0, 21.8);
  const mpPole = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.2, 0.28), palette.getPixelMat('oak_log'));
  mpPole.position.y = 1.1;
  const mpTop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.55), palette.getPixelMat('oak_plank'));
  mpTop.position.y = 2.35;
  const mpFlame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.2), palette.getMat(0xfef08a, 'emissive'));
  mpFlame.position.y = 2.7;
  marketPost.add(mpPole, mpTop, mpFlame);
  group.add(marketPost);

  // 4. Irrigated Wheat Farm + Hay Bales + Beehives (x: 22..32, z: 9.5..18.5)
  const farmGroup = new THREE.Group();
  const farmlandMat = palette.getPixelMat('farmland');
  const hayMat = palette.getPixelMat('hay');
  const woodFenceMat = palette.getPixelMat('oak_plank');

  // Soil beds flanking a central blue water irrigation trough
  const bedLeft = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.14, 8.2), farmlandMat);
  bedLeft.position.set(24.6, 0.07, 14.0);
  bedLeft.receiveShadow = true;
  const bedRight = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.14, 8.2), farmlandMat);
  bedRight.position.set(29.8, 0.07, 14.0);
  bedRight.receiveShadow = true;
  const canal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 8.2), palette.waterMat);
  canal.position.set(27.2, 0.06, 14.0);
  farmGroup.add(bedLeft, bedRight, canal);

  // Fence rails around the farm (leaving West gate open around z = 13..15.5)
  const fenceBack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.95, 9.2), woodFenceMat);
  fenceBack.position.set(32.2, 0.48, 14.0);
  const fenceNorth = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.95, 0.24), woodFenceMat);
  fenceNorth.position.set(27.2, 0.48, 9.4);
  const fenceSouth = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.95, 0.24), woodFenceMat);
  fenceSouth.position.set(27.2, 0.48, 18.6);
  const fenceWestTop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.95, 3.2), woodFenceMat);
  fenceWestTop.position.set(22.2, 0.48, 11.0);
  const fenceWestBot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.95, 3.0), woodFenceMat);
  fenceWestBot.position.set(22.2, 0.48, 17.1);
  farmGroup.add(fenceBack, fenceNorth, fenceSouth, fenceWestTop, fenceWestBot);

  // Hay Bale stacks + Composter + 2 Wooden Beehives
  const hayPositions: Array<[number, number, number]> = [
    [31.0, 0.5, 10.6],
    [31.0, 0.5, 11.7],
    [31.0, 1.5, 11.1],
    [23.2, 0.5, 17.5],
  ];
  hayPositions.forEach(([hx, hy, hz]) => {
    const bale = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.98, 0.98), hayMat);
    bale.position.set(hx, hy, hz);
    bale.castShadow = true;
    bale.receiveShadow = true;
    farmGroup.add(bale);
  });

  // Beehives near farm flowers
  const hiveCoords: Array<[number, number]> = [
    [23.3, 10.4],
    [30.8, 17.5],
  ];
  hiveCoords.forEach(([bx, bz]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.4, 0.22), woodFenceMat);
    post.position.set(bx, 0.7, bz);
    const hive = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), palette.getMat(0xf59e0b, 'matte'));
    hive.position.set(bx, 1.65, bz);
    hive.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.2, 0.87), palette.getMat(0x78350f, 'matte'));
    stripe.position.set(bx, 1.65, bz);
    farmGroup.add(post, hive, stripe);
  });

  // Instanced Wheat Crops (48 stalks across both irrigated beds)
  const wheatGeo = new THREE.BoxGeometry(0.45, 0.88, 0.45);
  wheatGeo.translate(0, 0.44, 0);
  const wheatMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 });
  const wheatCount = 48;
  const wheatMesh = new THREE.InstancedMesh(wheatGeo, wheatMat, wheatCount);
  const dummy = new THREE.Object3D();
  const cColor = new THREE.Color();
  let wi = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 6; col++) {
      const wx = col < 3 ? 23.4 + col * 1.15 : 28.7 + (col - 3) * 1.15;
      const wz = 10.4 + row * 1.02;
      const s = 0.8 + ((row + col) % 3) * 0.14;
      dummy.position.set(wx, 0.14, wz);
      dummy.rotation.y = ((row * 3 + col) % 4) * 0.4;
      dummy.scale.set(1, s, 1);
      dummy.updateMatrix();
      wheatMesh.setMatrixAt(wi, dummy.matrix);
      cColor.setHex((row + col) % 3 === 0 ? 0xfacc15 : (row + col) % 3 === 1 ? 0x84cc16 : 0xeab308);
      wheatMesh.setColorAt(wi, cColor);
      wi++;
    }
  }
  wheatMesh.instanceMatrix.needsUpdate = true;
  if (wheatMesh.instanceColor) wheatMesh.instanceColor.needsUpdate = true;
  wheatMesh.computeBoundingSphere();
  farmGroup.add(wheatMesh);
  disposables.push(wheatGeo, wheatMat);
  group.add(farmGroup);

  // 5. Extra Cozy Village Houses + Lantern Posts
  const bakery = createMinecraftHouse(palette, {
    x: 29,
    z: -1,
    rotY: -1.57,
    width: 6.2,
    depth: 5.0,
    roofTint: 0xeab308,
    flowerBox: true,
  });
  const cabin = createMinecraftHouse(palette, {
    x: -35,
    z: -14,
    rotY: 1.45,
    width: 5.6,
    depth: 4.8,
    roofTint: 0xd97706,
    flowerBox: true,
  });
  const farmHut = createMinecraftHouse(palette, {
    x: 29,
    z: 28,
    rotY: -2.2,
    width: 5.6,
    depth: 4.6,
    roofTint: 0x84cc16,
    flowerBox: true,
  });
  group.add(bakery, cabin, farmHut);
  obstacles.push(
    { x: 29, z: -1, halfW: 2.9, halfD: 3.3 },
    { x: -35, z: -14, halfW: 2.8, halfD: 3.1 },
    { x: 29, z: 28, halfW: 3.1, halfD: 2.9 },
  );

  // Outdoor Furnace + Crafting Table Porch outside Bakery (x=25.4, z=-2.8)
  const furnace = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 1.05), palette.getPixelMat('furnace'));
  furnace.position.set(25.2, 0.525, -2.5);
  furnace.rotation.y = -Math.PI / 2;
  const craftBench = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 1.05), palette.getPixelMat('crafting'));
  craftBench.position.set(25.2, 0.525, -3.7);
  group.add(furnace, craftBench);

  const lanternCoords: Array<[number, number]> = [
    [-3.6, 11.2],
    [3.8, 11.2],
    [-12.5, 5.2],
    [12.5, 4.2],
    [0.0, -14.0],
    [-15.5, 22.5],
  ];
  lanternCoords.forEach(([lx, lz]) => {
    group.add(createLanternPost(palette, lx, lz));
  });

  // 6. Pillager Watchtower Outpost on Northeast Ridge (outside playable core, dramatic backdrop!)
  const outpost = new THREE.Group();
  outpost.position.set(45, 2.0, -35);
  const opMound = new THREE.Mesh(new THREE.BoxGeometry(12, 2.0, 12), palette.getPixelMat('grass_side'));
  opMound.position.y = -1.0;
  const opBase = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.2, 5.6), palette.getPixelMat('cobble'));
  opBase.position.y = 1.6;
  opBase.castShadow = true;
  const opShaft = new THREE.Mesh(new THREE.BoxGeometry(4.4, 5.0, 4.4), palette.getPixelMat('oak_log'));
  opShaft.position.y = 5.7;
  opShaft.castShadow = true;
  const opDeck = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.5, 6.8), palette.getPixelMat('spruce_plank'));
  opDeck.position.y = 8.4;
  const opRoof = new THREE.Mesh(new THREE.ConeGeometry(4.9, 3.2, 4), palette.getPixelMat('spruce_plank', 0x7f1d1d));
  opRoof.position.y = 11.4;
  opRoof.rotation.y = Math.PI / 4;
  const banner = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.16), palette.getMat(0x1e293b, 'matte'));
  banner.position.set(0, 7.0, 3.5);
  const bannerTrim = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.3, 0.2), palette.getMat(0x22d3ee, 'emissive'));
  bannerTrim.position.set(0, 7.1, 3.52);
  outpost.add(opMound, opBase, opShaft, opDeck, opRoof, banner, bannerTrim);
  group.add(outpost);

  // Campfire smoke rising behind outpost forest (like screenshot #13)
  const smokeGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
  const smokeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    transparent: true,
    opacity: 0.42,
    roughness: 0.95,
  });
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(smokeGeo, smokeMat);
    puff.position.set(49 + (i % 2) * 0.6, 4 + i * 2.2, -31 - (i % 3) * 0.4);
    group.add(puff);
    smokePuffs.push({ mesh: puff, baseX: puff.position.x, baseY: 4, baseZ: puff.position.z, phase: i * 0.9 });
  }
  disposables.push(smokeGeo, smokeMat);

  // 2 Patrolling Pillager Guards by Watchtower
  for (let i = 0; i < 2; i++) {
    const pm = createPillagerMesh(palette);
    pm.root.position.set(45, 2.0, -35);
    group.add(pm.root);
    pillagers.push({
      root: pm.root,
      leftLeg: pm.leftLeg,
      rightLeg: pm.rightLeg,
      centerX: 45,
      baseY: 2.0,
      centerZ: -35,
      patrolR: 5.5,
      phase: i * Math.PI,
    });
  }

  // 7. Living Village Society: 8 Villagers + Wandering Trader + 2 Llamas + 2 Iron Golems + 5 Bees
  const villagerPlans: Array<{
    style: 'farmer' | 'librarian' | 'cleric' | 'fletcher' | 'shepherd';
    waypoints: Array<[number, number]>;
    speed: number;
  }> = [
    { style: 'farmer', waypoints: [[21, 14], [12, 13], [9, 9], [18, 12]], speed: 2.0 },
    { style: 'farmer', waypoints: [[26, 20], [21, 19], [23, 25], [16, 22]], speed: 1.85 },
    { style: 'librarian', waypoints: [[-6, 9], [-14, 7], [-12, -2], [-4, 3]], speed: 2.1 },
    { style: 'cleric', waypoints: [[-14, -10], [-18, -16], [-9, -15], [-7, -7]], speed: 1.9 },
    { style: 'fletcher', waypoints: [[5, 8], [10, 14], [4, 19], [-2, 15]], speed: 2.2 },
    { style: 'shepherd', waypoints: [[15, 2], [21, -2], [18, -9], [11, -3]], speed: 2.0 },
    { style: 'cleric', waypoints: [[-17, 17], [-11, 22], [-6, 25], [-13, 12]], speed: 1.95 },
    { style: 'librarian', waypoints: [[4, -10], [-4, -18], [4, -22], [9, -14]], speed: 2.0 },
  ];

  villagerPlans.forEach((vp, idx) => {
    const v = createVillagerMesh(palette, vp.style);
    v.waypoints = vp.waypoints;
    v.x = vp.waypoints[0][0];
    v.z = vp.waypoints[0][1];
    v.wpIdx = 1;
    v.speed = vp.speed;
    v.root.position.set(v.x, 0, v.z);
    v.root.userData.villageId = `villager_${idx}`;
    group.add(v.root);
    clickables.push(v.root);
    villagers.push(v);
    interactables.push({
      id: `villager_${idx}`,
      x: v.x,
      z: v.z,
      radius: 2.6,
      message:
        vp.style === 'farmer'
          ? 'Petani Desa: "Panen gandum melimpah hari ini! Semangat belajar kata baru, Hoot!"'
          : vp.style === 'librarian'
          ? 'Pustakawan Desa: "Setiap kata yang kamu hafal membuka gerbang Istana IELTS!"'
          : 'Warga Desa: "Terima kasih sudah menjaga desa kami bersama Iron Golem!"',
      mesh: v.root,
    });
  });

  // Wandering Trader & 2 Llamas at Market Square
  const trader = createVillagerMesh(palette, 'trader');
  trader.waypoints = [
    [14.5, 21.2],
    [17.8, 19.8],
    [15.8, 17.5],
    [12.8, 19.6],
  ];
  trader.x = trader.waypoints[0][0];
  trader.z = trader.waypoints[0][1];
  trader.wpIdx = 1;
  trader.speed = 1.5;
  trader.root.position.set(trader.x, 0, trader.z);
  trader.root.userData.villageId = 'wandering_trader';
  group.add(trader.root);
  clickables.push(trader.root);
  villagers.push(trader);
  interactables.push({
    id: 'wandering_trader',
    x: trader.x,
    z: trader.z,
    radius: 3.0,
    message:
      'Pedagang Keliling & 2 Llama: "Selamat datang di Pasar Desa! Kumpulkan Berlian & kalahkan Bos Gua!"',
    mesh: trader.root,
  });

  const llama1 = createLlamaMesh(palette, 17.4, 22.8, -0.7, 0x1d4ed8);
  const llama2 = createLlamaMesh(palette, 15.2, 23.1, 0.5, 0x0284c7);
  group.add(llama1.root, llama2.root);
  llamas.push(llama1, llama2);

  // Hutan Satwa (Tempat Hewan): Voxel Fox + 2 Fluffy Sheep at (27..31, -13..-16)
  const buildFox = (fx: number, fz: number, yaw: number) => {
    const r = new THREE.Group();
    r.position.set(fx, 0, fz);
    r.rotation.y = yaw;
    const fur = palette.getMat(0xea580c, 'matte');
    const white = palette.getMat(0xf8fafc, 'matte');
    const dark = palette.getMat(0x0f172a, 'gloss');
    const legG = new THREE.BoxGeometry(0.16, 0.34, 0.16);
    [[-0.14, -0.24], [0.14, -0.24], [-0.14, 0.24], [0.14, 0.24]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legG, dark);
      leg.position.set(lx, 0.17, lz);
      r.add(leg);
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.72), fur);
    body.position.y = 0.45;
    body.castShadow = true;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.52), fur);
    tail.position.set(0, 0.48, -0.52);
    const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.18), white);
    tailTip.position.set(0, 0.48, -0.78);
    const head = new THREE.Group();
    head.position.set(0, 0.58, 0.38);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.38), fur);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.22), white);
    snout.position.set(0, -0.05, 0.24);
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), dark);
    earL.position.set(-0.14, 0.22, 0);
    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), dark);
    earR.position.set(0.14, 0.22, 0);
    head.add(skull, snout, earL, earR);
    r.add(body, tail, tailTip, head);
    group.add(r);
    critters.push({ root: r, head, baseX: fx, baseZ: fz, baseYaw: yaw, phase: 0.4 });
  };
  const buildSheep = (sx: number, sz: number, yaw: number, phase: number) => {
    const r = new THREE.Group();
    r.position.set(sx, 0, sz);
    r.rotation.y = yaw;
    const wool = palette.getMat(0xf8fafc, 'matte');
    const face = palette.getMat(0xd6b595, 'matte');
    const dark = palette.getMat(0x1e293b, 'gloss');
    const legG = new THREE.BoxGeometry(0.18, 0.42, 0.18);
    [[-0.2, -0.28], [0.2, -0.28], [-0.2, 0.28], [0.2, 0.28]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legG, face);
      leg.position.set(lx, 0.21, lz);
      r.add(leg);
    });
    const woolBody = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 0.94), wool);
    woolBody.position.y = 0.65;
    woolBody.castShadow = true;
    const head = new THREE.Group();
    head.position.set(0, 0.78, 0.52);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.42), face);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.44), wool);
    crown.position.y = 0.16;
    const eL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), dark);
    eL.position.set(-0.12, 0.04, 0.22);
    const eR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), dark);
    eR.position.set(0.12, 0.04, 0.22);
    head.add(skull, crown, eL, eR);
    r.add(woolBody, head);
    group.add(r);
    critters.push({ root: r, head, baseX: sx, baseZ: sz, baseYaw: yaw, phase });
  };
  buildFox(27.2, -13.4, -0.9);
  buildSheep(29.8, -12.1, -2.1, 1.8);
  buildSheep(28.5, -16.2, -0.4, 3.2);

  // 2 Iron Golems (Central Plaza flower-holder + Market/North patrol)
  const golem1 = createIronGolemMesh(palette, true);
  golem1.waypoints = [
    [5.2, 8.2],
    [-4.8, 8.5],
    [-4.2, 16.5],
    [5.0, 15.2],
  ];
  golem1.x = golem1.waypoints[0][0];
  golem1.z = golem1.waypoints[0][1];
  golem1.wpIdx = 1;
  golem1.root.position.set(golem1.x, 0, golem1.z);
  golem1.root.userData.villageId = 'iron_golem_plaza';
  group.add(golem1.root);
  clickables.push(golem1.root);
  golems.push(golem1);
  interactables.push({
    id: 'iron_golem_plaza',
    x: golem1.x,
    z: golem1.z,
    radius: 3.4,
    message: 'Iron Golem Desa: Penjaga setia alun-alun yang ramah kepada lebah dan warga!',
    mesh: golem1.root,
  });

  const golem2 = createIronGolemMesh(palette, false);
  golem2.waypoints = [
    [13.5, 16.5],
    [19.2, 14.2],
    [19.5, 19.2],
    [12.8, 20.4],
  ];
  golem2.x = golem2.waypoints[0][0];
  golem2.z = golem2.waypoints[0][1];
  golem2.wpIdx = 1;
  golem2.root.position.set(golem2.x, 0, golem2.z);
  golem2.root.userData.villageId = 'iron_golem_market';
  group.add(golem2.root);
  clickables.push(golem2.root);
  golems.push(golem2);

  // 5 Buzzing Voxel Bees around Wheat Farm & Plaza Flowers
  const beeCenters: Array<[number, number, number]> = [
    [25.5, 2.4, 12.2],
    [28.6, 2.7, 15.6],
    [23.8, 2.3, 15.8],
    [5.5, 2.5, 9.8],
    [-5.5, 2.4, 15.5],
  ];
  beeCenters.forEach(([bx, by, bz], idx) => {
    const b = createBeeMesh(palette);
    b.root.position.set(bx, by, bz);
    group.add(b.root);
    bees.push({
      root: b.root,
      leftWing: b.leftWing,
      rightWing: b.rightWing,
      centerX: bx,
      centerY: by,
      centerZ: bz,
      radiusX: 1.6 + (idx % 2) * 0.8,
      radiusZ: 1.4 + ((idx + 1) % 2) * 0.7,
      speed: 1.6 + idx * 0.22,
      phase: idx * 1.3,
    });
  });

  // 8. Oak & Birch Forest (Perimeter Dense Forest + Scenic Inner Clearing Trees)
  const oakSpecs: Array<[number, number, number]> = [];
  const birchSpecs: Array<[number, number, number]> = [];

  // Scenic trees inside/edge of village clearings (kept safely away from NPCs, paths, & pickups!)
  const innerSpots: Array<[number, number, boolean]> = [
    [-11.5, -28.0, false],
    [15.5, -26.0, true],
    [35.5, 4.5, false],
    [36.5, -6.5, true],
    [-35.5, 22.0, true],
    [10.5, 32.5, false],
    [-11.5, 33.5, true],
    [17.5, -19.5, false],
    [-34.5, -24.0, true],
    [35.0, 21.0, false],
  ];
  innerSpots.forEach(([tx, tz, isBirch], i) => {
    const s = 0.95 + (i % 3) * 0.12;
    if (isBirch) birchSpecs.push([tx, tz, s]);
    else oakSpecs.push([tx, tz, s]);
  });

  // Dense outer Minecraft Forest Ring (150 trees)
  for (let i = 0; i < 150; i++) {
    const a = (i / 150) * Math.PI * 2 + (i % 5) * 0.04;
    const r = 43.5 + ((i * 19) % 34);
    const tx = Math.cos(a) * r;
    const tz = Math.sin(a) * r;
    // Leave clear view gap around watchtower mound
    if (Math.hypot(tx - 45, tz - -35) < 7.5) continue;
    const s = 0.9 + ((i * 23) % 30) / 100;
    if (i % 3 === 0) birchSpecs.push([tx, tz, s]);
    else oakSpecs.push([tx, tz, s]);
  }

  const buildTreeInstancing = (
    specs: Array<[number, number, number]>,
    trunkMat: THREE.Material,
    leafMat: THREE.Material,
    leafTints: number[],
  ) => {
    if (specs.length === 0) return;
    const trunkGeo = new THREE.BoxGeometry(0.86, 2.5, 0.86);
    trunkGeo.translate(0, 1.25, 0);
    // Two-tier layered Minecraft voxel canopy per tree via two InstancedMeshes
    const canopyLowGeo = new THREE.BoxGeometry(3.2, 1.45, 3.2);
    canopyLowGeo.translate(0, 3.05, 0);
    const canopyTopGeo = new THREE.BoxGeometry(2.05, 1.15, 2.05);
    canopyTopGeo.translate(0, 4.25, 0);

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, specs.length);
    const lowCanopy = new THREE.InstancedMesh(canopyLowGeo, leafMat, specs.length);
    const topCanopy = new THREE.InstancedMesh(canopyTopGeo, leafMat, specs.length);
    trunks.castShadow = true;
    lowCanopy.castShadow = true;
    topCanopy.castShadow = true;

    const dObj = new THREE.Object3D();
    const tCol = new THREE.Color();
    specs.forEach(([tx, tz, s], idx) => {
      dObj.position.set(tx, 0, tz);
      dObj.rotation.y = (idx * 1.1) % (Math.PI * 2);
      dObj.scale.set(s, s * (0.94 + (idx % 3) * 0.12), s);
      dObj.updateMatrix();
      trunks.setMatrixAt(idx, dObj.matrix);
      lowCanopy.setMatrixAt(idx, dObj.matrix);
      topCanopy.setMatrixAt(idx, dObj.matrix);
      tCol.setHex(leafTints[idx % leafTints.length]);
      lowCanopy.setColorAt(idx, tCol);
      topCanopy.setColorAt(idx, tCol);
    });
    trunks.instanceMatrix.needsUpdate = true;
    lowCanopy.instanceMatrix.needsUpdate = true;
    topCanopy.instanceMatrix.needsUpdate = true;
    if (lowCanopy.instanceColor) lowCanopy.instanceColor.needsUpdate = true;
    if (topCanopy.instanceColor) topCanopy.instanceColor.needsUpdate = true;
    trunks.computeBoundingSphere();
    lowCanopy.computeBoundingSphere();
    topCanopy.computeBoundingSphere();
    group.add(trunks, lowCanopy, topCanopy);
    disposables.push(trunkGeo, canopyLowGeo, canopyTopGeo);
  };

  const oakLeafMat = palette.getPixelMat('leaves_oak');
  const birchLeafMat = palette.getPixelMat('leaves_birch');
  buildTreeInstancing(oakSpecs, palette.getPixelMat('oak_log'), oakLeafMat, [0xffffff, 0xd9f99d, 0xbef264]);
  buildTreeInstancing(birchSpecs, palette.getPixelMat('birch_log'), birchLeafMat, [0xffffff, 0xecfccb, 0xd9f99d]);

  // 9. Instanced Tall Grass Tufts, Poppies, Daisies & Pebbles across Meadow
  const grassSpots: Array<[number, number]> = [];
  for (let i = 0; i < 240; i++) {
    const gx = Math.sin(i * 12.9898) * 39;
    const gz = Math.cos(i * 78.233) * 37;
    // Skip central road & well/farm interiors
    if (Math.abs(gx) < 3.4) continue;
    if (gx > 21.5 && gx < 33 && gz > 8.5 && gz < 19.5) continue;
    if (Math.hypot(gx - 7.5, gz - 11.2) < 3.2) continue;
    grassSpots.push([gx, gz]);
  }
  if (grassSpots.length > 0) {
    const bladeGeo = new THREE.BoxGeometry(0.16, 0.56, 0.42);
    bladeGeo.translate(0, 0.28, 0);
    const bladeMat = palette.getMat(0x5ea832, 'matte');
    const grassMesh = new THREE.InstancedMesh(bladeGeo, bladeMat, grassSpots.length);
    const gd = new THREE.Object3D();
    const gc = new THREE.Color();
    const greens = [0x65a30d, 0x4d7c0f, 0x84cc16, 0x4ade80];
    grassSpots.forEach(([gx, gz], idx) => {
      gd.position.set(gx, 0, gz);
      gd.rotation.y = (idx * 0.9) % Math.PI;
      gd.scale.set(0.85 + (idx % 3) * 0.25, 0.75 + (idx % 4) * 0.18, 0.85 + (idx % 2) * 0.2);
      gd.updateMatrix();
      grassMesh.setMatrixAt(idx, gd.matrix);
      gc.setHex(greens[idx % greens.length]);
      grassMesh.setColorAt(idx, gc);
    });
    grassMesh.instanceMatrix.needsUpdate = true;
    if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
    grassMesh.computeBoundingSphere();
    group.add(grassMesh);
    disposables.push(bladeGeo);
  }

  // Flowers (Poppies & White/Yellow Daisies)
  const flowerCount = 68;
  const stemGeo = new THREE.BoxGeometry(0.1, 0.34, 0.1);
  stemGeo.translate(0, 0.17, 0);
  const petalGeo = new THREE.BoxGeometry(0.3, 0.22, 0.3);
  petalGeo.translate(0, 0.42, 0);
  const stemMesh = new THREE.InstancedMesh(stemGeo, palette.getMat(0x16a34a, 'matte'), flowerCount);
  const petalMesh = new THREE.InstancedMesh(
    petalGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 }),
    flowerCount,
  );
  const fd = new THREE.Object3D();
  const fc = new THREE.Color();
  const flowerColors = [0xef4444, 0xf8fafc, 0xfacc15, 0xef4444];
  for (let i = 0; i < flowerCount; i++) {
    const fx = Math.sin(i * 43.17 + 1.2) * 35;
    const fz = Math.cos(i * 29.51 + 0.5) * 34;
    fd.position.set(fx, 0, fz);
    fd.rotation.y = (i * 0.7) % Math.PI;
    fd.scale.setScalar(0.9 + (i % 3) * 0.12);
    fd.updateMatrix();
    stemMesh.setMatrixAt(i, fd.matrix);
    petalMesh.setMatrixAt(i, fd.matrix);
    fc.setHex(flowerColors[i % flowerColors.length]);
    petalMesh.setColorAt(i, fc);
  }
  stemMesh.instanceMatrix.needsUpdate = true;
  petalMesh.instanceMatrix.needsUpdate = true;
  if (petalMesh.instanceColor) petalMesh.instanceColor.needsUpdate = true;
  stemMesh.computeBoundingSphere();
  petalMesh.computeBoundingSphere();
  group.add(stemMesh, petalMesh);
  disposables.push(stemGeo, petalGeo, petalMesh.material as THREE.Material);

  // Stone pebbles scattered on meadow
  const pebbleGeo = new THREE.BoxGeometry(0.45, 0.16, 0.38);
  pebbleGeo.translate(0, 0.08, 0);
  const pebbleMesh = new THREE.InstancedMesh(pebbleGeo, palette.getPixelMat('cobble'), 42);
  for (let i = 0; i < 42; i++) {
    const px = Math.sin(i * 61.3 + 2.4) * 36;
    const pz = Math.cos(i * 17.8 + 1.9) * 35;
    fd.position.set(px, 0, pz);
    fd.rotation.y = i * 0.8;
    fd.scale.setScalar(0.75 + (i % 3) * 0.25);
    fd.updateMatrix();
    pebbleMesh.setMatrixAt(i, fd.matrix);
  }
  pebbleMesh.instanceMatrix.needsUpdate = true;
  pebbleMesh.computeBoundingSphere();
  group.add(pebbleMesh);
  disposables.push(pebbleGeo);

  // 10. Stepped Perimeter Hills & Distant Snowy Mountain Peaks (Voxel Valley Backdrop)
  const hillGeo = new THREE.BoxGeometry(1, 1, 1);
  const hillSpots: Array<[number, number, number, number, number]> = [];
  for (let i = 0; i < 54; i++) {
    const a = (i / 54) * Math.PI * 2;
    const r = 56 + (i % 3) * 10;
    const hx = Math.cos(a) * r;
    const hz = Math.sin(a) * r;
    const w = 11 + (i % 4) * 3;
    const h = 3.0 + (i % 5) * 1.4;
    hillSpots.push([hx, hz, w, h, w]);
  }
  const hillMesh = new THREE.InstancedMesh(hillGeo, palette.getPixelMat('grass_side'), hillSpots.length);
  hillMesh.receiveShadow = true;
  hillSpots.forEach(([hx, hz, hw, hh, hd], idx) => {
    fd.position.set(hx, hh * 0.5 - 0.1, hz);
    fd.rotation.y = 0;
    fd.scale.set(hw, hh, hd);
    fd.updateMatrix();
    hillMesh.setMatrixAt(idx, fd.matrix);
  });
  hillMesh.instanceMatrix.needsUpdate = true;
  hillMesh.computeBoundingSphere();
  group.add(hillMesh);

  // Far Snowy Peaks behind the North / West / East skyline
  const peakBaseGeo = new THREE.BoxGeometry(1, 1, 1);
  const peakBases = new THREE.InstancedMesh(peakBaseGeo, palette.getPixelMat('cobble'), 22);
  const peakCaps = new THREE.InstancedMesh(peakBaseGeo, palette.getPixelMat('snow_grass'), 22);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const r = 92 + (i % 3) * 12;
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    const h = 14 + (i % 4) * 5;
    const w = 16 + (i % 3) * 4;
    fd.position.set(px, h * 0.5 - 0.2, pz);
    fd.rotation.y = 0;
    fd.scale.set(w, h, w);
    fd.updateMatrix();
    peakBases.setMatrixAt(i, fd.matrix);

    fd.position.set(px, h + 1.4, pz);
    fd.scale.set(w * 0.62, 3.2, w * 0.62);
    fd.updateMatrix();
    peakCaps.setMatrixAt(i, fd.matrix);
  }
  peakBases.instanceMatrix.needsUpdate = true;
  peakCaps.instanceMatrix.needsUpdate = true;
  peakBases.computeBoundingSphere();
  peakCaps.computeBoundingSphere();
  group.add(peakBases, peakCaps);
  disposables.push(hillGeo, peakBaseGeo);

  return {
    group,
    obstacles,
    interactables,
    clickables,
    villagers,
    golems,
    llamas,
    bees,
    pillagers,
    critters,
    torchesFlame,
    smokePuffs,
    disposables,
  };
}

export function updateMinecraftVillage(
  rig: MinecraftVillageRig,
  dt: number,
  elapsed: number,
): void {
  // 1. Villagers & Wandering Trader stroll smoothly along village waypoints
  for (let i = 0; i < rig.villagers.length; i++) {
    const v = rig.villagers[i];
    if (v.pauseTimer > 0) {
      v.pauseTimer -= dt;
      v.leftLeg.rotation.x *= 0.85;
      v.rightLeg.rotation.x *= 0.85;
      v.body.position.y = 0;
      v.head.rotation.y = Math.sin(elapsed * 1.8 + i) * 0.35;
      continue;
    }
    const [tx, tz] = v.waypoints[v.wpIdx];
    const dx = tx - v.x;
    const dz = tz - v.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.35) {
      v.wpIdx = (v.wpIdx + 1) % v.waypoints.length;
      v.pauseTimer = 1.2 + (i % 3) * 0.7;
      continue;
    }
    const step = Math.min(dist, v.speed * dt);
    v.x += (dx / dist) * step;
    v.z += (dz / dist) * step;
    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - v.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    v.yaw += diff * (1 - Math.exp(-8 * dt));
    v.root.position.set(v.x, 0, v.z);
    v.root.rotation.y = v.yaw;

    v.walkPhase += dt * (5.5 + v.speed);
    const swing = Math.sin(v.walkPhase) * 0.52;
    v.leftLeg.rotation.x = swing;
    v.rightLeg.rotation.x = -swing;
    v.body.position.y = Math.abs(Math.sin(v.walkPhase)) * 0.08;
    v.head.rotation.y *= 0.9;

    const inter = rig.interactables.find((it) => it.id === v.root.userData.villageId);
    if (inter) {
      inter.x = v.x;
      inter.z = v.z;
    }
  }

  // 2. Iron Golems heavy steady patrol
  for (let i = 0; i < rig.golems.length; i++) {
    const g = rig.golems[i];
    if (g.pauseTimer > 0) {
      g.pauseTimer -= dt;
      g.leftLeg.rotation.x *= 0.85;
      g.rightLeg.rotation.x *= 0.85;
      g.rightArm.rotation.x *= 0.85;
      if (!g.holdsFlower) g.leftArm.rotation.x *= 0.85;
      continue;
    }
    const [tx, tz] = g.waypoints[g.wpIdx];
    const dx = tx - g.x;
    const dz = tz - g.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.45) {
      g.wpIdx = (g.wpIdx + 1) % g.waypoints.length;
      g.pauseTimer = 1.6;
      continue;
    }
    const step = Math.min(dist, 1.45 * dt);
    g.x += (dx / dist) * step;
    g.z += (dz / dist) * step;
    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - g.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    g.yaw += diff * (1 - Math.exp(-5 * dt));
    g.root.position.set(g.x, 0, g.z);
    g.root.rotation.y = g.yaw;

    g.walkPhase += dt * 3.8;
    const swing = Math.sin(g.walkPhase) * 0.4;
    g.leftLeg.rotation.x = swing;
    g.rightLeg.rotation.x = -swing;
    g.rightArm.rotation.x = swing * 0.65;
    if (!g.holdsFlower) {
      g.leftArm.rotation.x = -swing * 0.65;
    } else {
      g.leftArm.rotation.x = -0.65 + Math.sin(elapsed * 2.5) * 0.08;
    }

    const inter = rig.interactables.find((it) => it.id === g.root.userData.villageId);
    if (inter) {
      inter.x = g.x;
      inter.z = g.z;
    }
  }

  // 3. Llamas & Hutan Satwa Critters gentle idle breathing & grazing
  for (const l of rig.llamas) {
    l.headPivot.rotation.y = Math.sin(elapsed * 1.1 + l.phase) * 0.25;
    l.headPivot.rotation.x = Math.sin(elapsed * 1.8 + l.phase) * 0.08;
    l.root.position.y = Math.abs(Math.sin(elapsed * 1.5 + l.phase)) * 0.04;
  }
  for (const c of rig.critters) {
    const t = elapsed * 1.3 + c.phase;
    c.root.position.x = c.baseX + Math.sin(t * 0.6) * 0.65;
    c.root.position.z = c.baseZ + Math.cos(t * 0.5) * 0.55;
    c.root.rotation.y = c.baseYaw + Math.sin(t * 0.7) * 0.35;
    c.head.rotation.x = Math.max(0, Math.sin(t * 1.6)) * 0.32;
    c.head.rotation.y = Math.cos(t * 1.1) * 0.22;
  }

  // 4. Voxel Bees buzzing in figure-8 over flowers & farm
  for (const b of rig.bees) {
    const t = elapsed * b.speed + b.phase;
    const nx = b.centerX + Math.sin(t) * b.radiusX;
    const nz = b.centerZ + Math.sin(t * 2) * b.radiusZ * 0.6;
    const ny = b.centerY + Math.sin(t * 3.2) * 0.28;
    const vx = Math.cos(t) * b.radiusX;
    const vz = Math.cos(t * 2) * b.radiusZ * 1.2;
    b.root.position.set(nx, ny, nz);
    b.root.rotation.y = Math.atan2(vx, vz);
    const wingFlap = Math.sin(elapsed * 38 + b.phase) * 0.55;
    b.leftWing.rotation.z = wingFlap;
    b.rightWing.rotation.z = -wingFlap;
  }

  // 5. Pillager Outpost ridge patrol + smoke drift
  for (const p of rig.pillagers) {
    const a = elapsed * 0.55 + p.phase;
    const px = p.centerX + Math.cos(a) * p.patrolR;
    const pz = p.centerZ + Math.sin(a) * p.patrolR;
    p.root.position.set(px, p.baseY, pz);
    p.root.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
    const sw = Math.sin(elapsed * 5 + p.phase) * 0.45;
    p.leftLeg.rotation.x = sw;
    p.rightLeg.rotation.x = -sw;
  }

  for (const s of rig.smokePuffs) {
    const rise = ((elapsed * 1.6 + s.phase) % 12) / 12;
    s.mesh.position.set(
      s.baseX + Math.sin(elapsed * 0.9 + s.phase) * 0.65,
      s.baseY + rise * 14,
      s.baseZ + Math.cos(elapsed * 0.7 + s.phase) * 0.5,
    );
    s.mesh.scale.setScalar(0.85 + rise * 1.5);
  }
}
