import * as THREE from 'three';
import { ZONE_CAVE_STORIES, ZONE_DOORS, ZONE_INFO } from '../data/diglosaCatalog';
import { CaveBlockKind, DoorDef, MonsterType, ZoneId } from '../types/game';
import { MaterialPalette } from './materials';
import { createMinecraftHouse } from './minecraftVillage';

export interface HeroAvatarRig {
  root: THREE.Group;
  body: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  dashRing: THREE.Mesh;
  weaponGroup: THREE.Group;
  weaponTipMat: THREE.MeshStandardMaterial;
}

export interface OwlMessengerRig {
  root: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  envelope: THREE.Group;
}

export interface PortalArchRig {
  root: THREE.Group;
  ringOuter: THREE.Mesh;
  ringInner: THREE.Mesh;
  coreDisc: THREE.Mesh;
}

export interface DungeonDoorRig {
  index: number;
  def: DoorDef;
  group: THREE.Group;
  orbMesh: THREE.Mesh;
  frameMat: THREE.MeshStandardMaterial;
  orbMat: THREE.MeshStandardMaterial;
}

export interface CaveBlockDef {
  id: string;
  kind: CaveBlockKind;
  label: string;
  x: number;
  y: number;
  z: number;
  halfW: number;
  hp: number;
  maxHp: number;
  mesh: THREE.Mesh;
  alive: boolean;
  hasAmbush?: boolean;
  crackMesh?: THREE.Mesh;
}

export interface CaveStaticCollider {
  x: number;
  z: number;
  halfW: number;
}

export interface CaveCliffPlatform {
  id: string;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  topY: number;
}

export interface CaveLavaChasm {
  id: string;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  lavaMat: THREE.MeshStandardMaterial;
}

export interface CaveTrapRig {
  id: string;
  kind: 'lava' | 'spikes';
  x: number;
  z: number;
  halfW: number;
  phaseOffset: number;
  group: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  spikesGroup?: THREE.Group;
  active: boolean;
}

export interface CaveWeaponChestRig {
  x: number;
  y: number;
  z: number;
  group: THREE.Group;
  orb: THREE.Mesh;
  collected: boolean;
}

export interface DungeonArenaRig {
  group: THREE.Group;
  animatables: THREE.Object3D[];
  doors: DungeonDoorRig[];
  exitPadPos: THREE.Vector3;
  exitClickable: THREE.Object3D;
  craftingTablePos: THREE.Vector3;
  caveBlocks: CaveBlockDef[];
  caveColliders: CaveStaticCollider[];
  platforms: CaveCliffPlatform[];
  chasms: CaveLavaChasm[];
  traps: CaveTrapRig[];
  blockHighlight: THREE.LineSegments;
  blockPlacePreview: THREE.LineSegments;
  torchPreview: THREE.Group;
  shieldBlockMat: THREE.Material;
  shieldBlockGeo: THREE.BufferGeometry;
  crackMaterials: THREE.MeshBasicMaterial[];
  crackGeo: THREE.BufferGeometry;
  weaponChest: CaveWeaponChestRig;
  guardianPos: THREE.Vector3;
  guardianMesh: THREE.Group;
  guardianAuraMat: THREE.MeshBasicMaterial;
  prisonPos: THREE.Vector3;
  prisonGroup: THREE.Group;
  prisonBars: THREE.Group;
  prisonLockMat: THREE.MeshStandardMaterial;
  captiveMesh: THREE.Group;
  prisonKeyGroup: THREE.Group;
  cameraOccluders: THREE.Object3D[];
  disposables: Array<{ dispose: () => void }>;
}

export interface AcademyHallRig {
  group: THREE.Group;
  animatables: THREE.Object3D[];
  exitPadPos: THREE.Vector3;
  exitClickable: THREE.Object3D;
  cameraOccluders: THREE.Object3D[];
}

function addShadow(group: THREE.Group, palette: MaterialPalette, radius: number): void {
  const s = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2.2, radius * 2.2),
    palette.contactShadowMat,
  );
  s.rotation.x = -Math.PI / 2;
  s.position.y = 0.04;
  group.add(s);
}

// 1. Composite 3D Hero Explorer ("Hoot Sang Petualang Kata")
export function createHeroAvatar(palette: MaterialPalette): HeroAvatarRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  addShadow(root, palette, 1.0);

  const skin = palette.getMat(0xfed7aa, 'matte');
  const tunic = palette.getMat(0x16a34a, 'matte');
  const pants = palette.getMat(0x1e3a8a, 'matte');
  const boot = palette.getMat(0x78350f, 'matte');
  const pack = palette.getMat(0xb45309, 'matte');
  const hatMat = palette.getMat(0x92400e, 'matte');
  const gold = palette.getMat(0xfbbf24, 'metal');

  // Legs
  const makeLeg = (x: number): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(x, 1.05, 0);
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.7, 0.38), pants);
    thigh.position.y = -0.35;
    thigh.castShadow = true;
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.52), boot);
    shoe.position.set(0, -0.87, 0.06);
    shoe.castShadow = true;
    leg.add(thigh, shoe);
    return leg;
  };

  const leftLeg = makeLeg(-0.24);
  const rightLeg = makeLeg(0.24);
  body.add(leftLeg, rightLeg);

  // Torso & Belt
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.05, 0.58), tunic);
  torso.position.y = 1.58;
  torso.castShadow = true;
  body.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.16, 0.62), boot);
  belt.position.y = 1.18;
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.08), gold);
  buckle.position.set(0, 1.18, 0.32);
  body.add(belt, buckle);

  // Explorer Backpack
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.88, 0.42), pack);
  backpack.position.set(0, 1.62, -0.45);
  backpack.castShadow = true;
  const bedroll = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.8, 8),
    palette.getMat(0xf59e0b, 'matte'),
  );
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 2.12, -0.45);
  body.add(backpack, bedroll);

  // Head & Adventurer Hat
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.84, 0.82), skin);
  head.position.y = 2.55;
  head.castShadow = true;
  body.add(head);

  const eyeMat = palette.getMat(0x0f172a, 'gloss');
  const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.06), eyeMat);
  leftEye.position.set(-0.2, 2.56, 0.42);
  const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.06), eyeMat);
  rightEye.position.set(0.2, 2.56, 0.42);
  body.add(leftEye, rightEye);

  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.78, 0.1, 14), hatMat);
  hatBrim.position.set(0, 2.98, 0);
  const hatCrown = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.72), hatMat);
  hatCrown.position.set(0, 3.22, 0);
  const hatBand = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.12, 0.76), gold);
  hatBand.position.set(0, 3.06, 0);
  const feather = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.18), palette.getMat(0xef4444, 'gloss'));
  feather.position.set(0.36, 3.32, -0.05);
  feather.rotation.z = -0.3;
  body.add(hatBrim, hatCrown, hatBand, feather);

  // Weapon tip custom material so active weapon changes Hero's blaster orb color dynamically
  const weaponTipMat = new THREE.MeshStandardMaterial({
    color: 0x4fd8ff,
    emissive: 0x4fd8ff,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });

  const weaponGroup = new THREE.Group();
  const makeArm = (x: number, withWeapon: boolean): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(x, 1.98, 0);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.32), tunic);
    sleeve.position.y = -0.18;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.28), skin);
    hand.position.y = -0.56;
    arm.add(sleeve, hand);
    if (withWeapon) {
      const gunBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.24, 0.58),
        palette.getMat(0x0ea5e9, 'metal'),
      );
      gunBody.position.set(0, -0.68, 0.26);
      const gunTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), weaponTipMat);
      gunTip.position.set(0, -0.68, 0.62);
      weaponGroup.add(gunBody, gunTip);
      arm.add(weaponGroup);
    }
    return arm;
  };

  const leftArm = makeArm(-0.62, false);
  const rightArm = makeArm(0.62, true);
  body.add(leftArm, rightArm);

  // Dash / Pulse ring
  const dashRing = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.45, 28),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  dashRing.rotation.x = -Math.PI / 2;
  dashRing.position.y = 0.08;
  root.add(dashRing);

  return { root, body, leftLeg, rightLeg, leftArm, rightArm, dashRing, weaponGroup, weaponTipMat };
}

export function setHeroWeaponVisual(rig: HeroAvatarRig, colorHex: number, owned: boolean): void {
  rig.weaponGroup.visible = owned;
  rig.weaponTipMat.color.setHex(colorHex);
  rig.weaponTipMat.emissive.setHex(colorHex);
}

// 2. Flying 3D Owl Messenger for Opening Story
export function createOwlMessengerRig(palette: MaterialPalette): OwlMessengerRig {
  const root = new THREE.Group();
  const brown = palette.getMat(0x92400e, 'matte');
  const cream = palette.getMat(0xfef3c7, 'matte');
  const gold = palette.getMat(0xfacc15, 'emissive');
  const dark = palette.getMat(0x0f172a, 'gloss');

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.85), brown);
  body.castShadow = true;
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 0.2), cream);
  belly.position.set(0, -0.05, 0.4);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 4), gold);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.16, 0.54);
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.08), dark);
  eyeL.position.set(-0.22, 0.28, 0.44);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.08), dark);
  eyeR.position.set(0.22, 0.28, 0.44);
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.18), brown);
  earL.position.set(-0.34, 0.62, 0.1);
  const earR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.18), brown);
  earR.position.set(0.34, 0.62, 0.1);
  root.add(body, belly, beak, eyeL, eyeR, earL, earR);

  const leftWing = new THREE.Group();
  leftWing.position.set(-0.48, 0.18, 0);
  const lwMesh = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.62), brown);
  lwMesh.position.set(-0.58, 0, 0);
  leftWing.add(lwMesh);

  const rightWing = new THREE.Group();
  rightWing.position.set(0.48, 0.18, 0);
  const rwMesh = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.62), brown);
  rwMesh.position.set(0.58, 0, 0);
  rightWing.add(rwMesh);
  root.add(leftWing, rightWing);

  const envelope = new THREE.Group();
  envelope.position.set(0, -0.75, 0.18);
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.12), cream);
  const seal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.15), palette.getMat(0xef4444, 'emissive'));
  envelope.add(paper, seal);
  root.add(envelope);

  return { root, leftWing, rightWing, envelope };
}

// 3. Starter Weapon Pickup in Hutan Kata Grass
export function createStarterWeaponPickup(palette: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const basePad = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.25, 2.1),
    palette.getMat(0x334155, 'matte'),
  );
  basePad.position.y = 0.125;

  const baseRing = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.48, 24),
    palette.getMat(0xfacc15, 'emissive'),
  );
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.27;
  baseRing.userData.animRing = true;

  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.52, 13, 12, 1, true), beaconMat);
  beacon.position.y = 6.7;
  beacon.userData.animBeacon = true;

  const orb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.62, 0),
    palette.getMat(0x4fd8ff, 'emissive'),
  );
  orb.position.y = 1.45;
  orb.userData.animOrb = true;

  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.32, 0.9),
    palette.getMat(0xfbbf24, 'metal'),
  );
  gun.position.y = 1.45;
  gun.rotation.y = 0.6;

  const topDiamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.34, 0),
    palette.getMat(0xfacc15, 'emissive'),
  );
  topDiamond.position.y = 3.1;
  topDiamond.userData.animOrb = true;

  group.add(basePad, baseRing, beacon, orb, gun, topDiamond);
  return group;
}

// 4. All Distinct Zone, Story, and Academy Examiner 3D NPCs
export function createZoneNpc(npcId: string, palette: MaterialPalette): THREE.Group {
  const root = new THREE.Group();
  addShadow(root, palette, 1.0);

  const skin = palette.getMat(0xfed7aa, 'matte');
  const eyeMat = palette.getMat(0x0f172a, 'gloss');

  let robeColor = 0xb45309;
  if (npcId === 'npc_koki') robeColor = 0xf8fafc;
  else if (npcId === 'npc_penjaga') robeColor = 0x1d4ed8;
  else if (npcId === 'npc_penyihir') robeColor = 0x312e81;
  else if (npcId === 'npc_rubah') robeColor = 0xea580c;
  else if (npcId === 'npc_portal') robeColor = 0x6d28d9;
  else if (npcId === 'npc_sera') robeColor = 0x0284c7;
  else if (npcId === 'npc_bima') robeColor = 0x059669;
  else if (npcId === 'npc_ayu') robeColor = 0xd97706;
  else if (npcId === 'npc_rangga') robeColor = 0xdb2777;
  else if (npcId === 'npc_raja_penguji' || npcId === 'npc_raja') robeColor = 0x6d28d9;
  else if (npcId === 'npc_exit_academy') robeColor = 0x0891b2;

  const lower = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 1.05, 0.72),
    palette.getMat(robeColor, 'matte'),
  );
  lower.position.y = 0.52;
  lower.castShadow = true;
  root.add(lower);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 1.0, 0.68),
    palette.getMat(robeColor, npcId === 'npc_penjaga' ? 'metal' : 'matte'),
  );
  torso.position.y = 1.5;
  torso.castShadow = true;
  root.add(torso);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 0.84, 0.82),
    npcId === 'npc_rubah' ? palette.getMat(0xf97316, 'matte') : skin,
  );
  head.position.y = 2.45;
  head.castShadow = true;
  root.add(head);

  const lEye = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.06), eyeMat);
  lEye.position.set(-0.2, 2.48, 0.42);
  const rEye = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.06), eyeMat);
  rEye.position.set(0.2, 2.48, 0.42);
  root.add(lEye, rEye);

  if (npcId === 'npc_tetua') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.78, 0.12, 12), palette.getMat(0x92400e, 'matte'));
    brim.position.y = 2.9;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.35, 0.66), palette.getMat(0xb45309, 'matte'));
    crown.position.y = 3.12;
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.25), palette.getMat(0xf8fafc, 'matte'));
    beard.position.set(0, 2.08, 0.36);
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), palette.getMat(0x78350f, 'matte'));
    staff.position.set(0.72, 1.3, 0.25);
    root.add(brim, crown, beard, staff);
  } else if (npcId === 'npc_koki') {
    const chefHat = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.65, 10), palette.getMat(0xffffff, 'matte'));
    chefHat.position.y = 3.15;
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.1, 0.1), palette.getMat(0xffffff, 'matte'));
    apron.position.set(0, 1.1, 0.38);
    const ladle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), palette.getMat(0x92400e, 'matte'));
    ladle.position.set(0.68, 1.5, 0.35);
    ladle.rotation.z = -0.35;
    root.add(chefHat, apron, ladle);
  } else if (npcId === 'npc_penjaga') {
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.42, 0.9), palette.getMat(0x94a3b8, 'metal'));
    helmet.position.y = 2.95;
    const plume = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.55), palette.getMat(0xef4444, 'gloss'));
    plume.position.set(0, 3.3, -0.05);
    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), palette.getMat(0x78350f, 'matte'));
    spear.position.set(0.72, 1.7, 0.2);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 4), palette.getMat(0xfbbf24, 'metal'));
    tip.position.set(0.72, 3.55, 0.2);
    root.add(helmet, plume, spear, tip);
  } else if (npcId === 'npc_penyihir') {
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.88, 0.12, 12), palette.getMat(0x1e1b4b, 'gloss'));
    hatBrim.position.y = 2.9;
    const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.15, 8), palette.getMat(0x312e81, 'gloss'));
    hatCone.position.y = 3.5;
    const hourglass = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), palette.getMat(0xfacc15, 'emissive'));
    hourglass.position.set(0.72, 1.85, 0.4);
    root.add(hatBrim, hatCone, hourglass);
  } else if (npcId === 'npc_rubah') {
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.2), palette.getMat(0xea580c, 'matte'));
    earL.position.set(-0.28, 3.05, 0);
    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.2), palette.getMat(0xea580c, 'matte'));
    earR.position.set(0.28, 3.05, 0);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.9), palette.getMat(0xf97316, 'matte'));
    tail.position.set(0, 0.95, -0.75);
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 0.72), palette.getMat(0x16a34a, 'matte'));
    scarf.position.y = 2.02;
    root.add(earL, earR, tail, scarf);
  } else if (npcId === 'npc_portal') {
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.95), palette.getMat(0x7c3aed, 'gloss'));
    hood.position.y = 2.85;
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), palette.getMat(0xe879f9, 'emissive'));
    orb.position.set(-0.72, 2.2, 0.45);
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), palette.getMat(0x4c1d95, 'metal'));
    staff.position.set(-0.72, 1.1, 0.45);
    root.add(hood, orb, staff);
  } else if (npcId === 'npc_raja_penguji' || npcId === 'npc_raja') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.44, 0.42, 6), palette.getMat(0xfbbf24, 'metal'));
    crown.position.y = 3.08;
    const cape = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.75, 0.16), palette.getMat(0x991b1b, 'matte'));
    cape.position.set(0, 1.15, -0.45);
    const scepter = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), palette.getMat(0xfbbf24, 'metal'));
    scepter.position.set(0.72, 1.3, 0.25);
    root.add(crown, cape, scepter);
  } else {
    // Examiners (Sera, Bima, Ayu, Rangga) & Penjaga Portal
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.14, 1.02), palette.getMat(0x1e293b, 'gloss'));
    cap.position.y = 2.94;
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.14), palette.getMat(0xfbbf24, 'gloss'));
    book.position.set(0.68, 1.55, 0.28);
    root.add(cap, book);
  }

  return root;
}

// 5. 5 Distinct 3D Word Monsters + Armed Shooter Enemy
export function createMonsterMesh(
  type: MonsterType,
  palette: MaterialPalette,
  scale = 1,
): THREE.Group {
  const root = new THREE.Group();
  addShadow(root, palette, 1.05);

  if (type === 'gumpal_salam') {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.25, 1.45),
      palette.getMat(0xf97316, 'gloss'),
    );
    body.position.y = 0.7;
    body.castShadow = true;
    const topDrop = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.45, 0.9),
      palette.getMat(0xfb923c, 'gloss'),
    );
    topDrop.position.y = 1.45;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.12), palette.getMat(0xfef08a, 'emissive'));
    eyeL.position.set(-0.32, 0.85, 0.74);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.12), palette.getMat(0xfef08a, 'emissive'));
    eyeR.position.set(0.32, 0.85, 0.74);
    root.add(body, topDrop, eyeL, eyeR);
  } else if (type === 'bayangan_kata') {
    const cloak = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 1.7, 6),
      palette.getMat(0x4c1d95, 'gloss'),
    );
    cloak.position.y = 1.1;
    cloak.castShadow = true;
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.85, 0.92),
      palette.getMat(0x5b21b6, 'gloss'),
    );
    hood.position.y = 1.9;
    const eye = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      palette.getMat(0xf43f5e, 'emissive'),
    );
    eye.position.set(0, 1.85, 0.48);
    root.add(cloak, hood, eye);
  } else if (type === 'jam_pasir') {
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.4), palette.getMat(0xf59e0b, 'metal'));
    topCap.position.y = 2.15;
    const botCap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.4), palette.getMat(0xf59e0b, 'metal'));
    botCap.position.y = 0.35;
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.55, 8), palette.getMat(0x7c3aed, 'emissive'));
    glass.position.y = 1.25;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), palette.getMat(0xfef08a, 'emissive'));
    eyeL.position.set(-0.25, 1.45, 0.56);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), palette.getMat(0xfef08a, 'emissive'));
    eyeR.position.set(0.25, 1.45, 0.56);
    root.add(topCap, botCap, glass, eyeL, eyeR);
  } else if (type === 'semak_rimba') {
    const bush = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.4, 1.55), palette.getMat(0x16a34a, 'matte'));
    bush.position.y = 0.85;
    bush.castShadow = true;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.1), palette.getMat(0x22c55e, 'matte'));
    crown.position.y = 1.65;
    const flower = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.42), palette.getMat(0xf472b6, 'emissive'));
    flower.position.y = 2.02;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.1), palette.getMat(0xfef08a, 'emissive'));
    eyeL.position.set(-0.3, 0.95, 0.79);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.1), palette.getMat(0xfef08a, 'emissive'));
    eyeR.position.set(0.3, 0.95, 0.79);
    root.add(bush, crown, flower, eyeL, eyeR);
  } else if (type === 'creeper_kata') {
    // Classic Minecraft-style green voxel creeper with glowing fuse core
    const greenBody = palette.getMat(0x16a34a, 'matte');
    const greenHead = palette.getMat(0x22c55e, 'matte');
    const darkPixel = palette.getMat(0x0f172a, 'matte');
    const legGeo = new THREE.BoxGeometry(0.42, 0.55, 0.42);
    const legs: Array<[number, number]> = [
      [-0.36, 0.34],
      [0.36, 0.34],
      [-0.36, -0.34],
      [0.36, -0.34],
    ];
    legs.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, palette.getMat(0x15803d, 'matte'));
      leg.position.set(lx, 0.275, lz);
      leg.castShadow = true;
      root.add(leg);
    });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.25, 0.62), greenBody);
    torso.position.y = 1.15;
    torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.92, 0.96), greenHead);
    head.position.y = 2.2;
    head.castShadow = true;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.08), darkPixel);
    eyeL.position.set(-0.22, 2.3, 0.49);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.08), darkPixel);
    eyeR.position.set(0.22, 2.3, 0.49);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.08), darkPixel);
    mouth.position.set(0, 1.98, 0.49);
    const fuseCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.26, 0),
      palette.getMat(0xf97316, 'emissive'),
    );
    fuseCore.position.set(0, 1.35, 0.34);
    root.add(torso, head, eyeL, eyeR, mouth, fuseCore);
  } else if (type === 'kelelawar_gua') {
    // Winged voxel Cave Bat hovering below ceiling
    const batBodyMat = palette.getMat(0x312e81, 'matte');
    const batWingMat = palette.getMat(0x1e1b4b, 'matte');
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 0.72), batBodyMat);
    body.position.y = 0;
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 4), batBodyMat);
    earL.position.set(-0.2, 0.42, 0.12);
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 4), batBodyMat);
    earR.position.set(0.2, 0.42, 0.12);
    const eyeL = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.08),
      palette.getMat(0xf43f5e, 'emissive'),
    );
    eyeL.position.set(-0.15, 0.08, 0.38);
    const eyeR = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.08),
      palette.getMat(0xf43f5e, 'emissive'),
    );
    eyeR.position.set(0.15, 0.08, 0.38);
    const leftWing = new THREE.Group();
    leftWing.position.set(-0.31, 0.08, 0);
    const lwMesh = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.62), batWingMat);
    lwMesh.position.x = -0.58;
    leftWing.add(lwMesh);
    const rightWing = new THREE.Group();
    rightWing.position.set(0.31, 0.08, 0);
    const rwMesh = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.62), batWingMat);
    rwMesh.position.x = 0.58;
    rightWing.add(rwMesh);
    root.userData.leftWing = leftWing;
    root.userData.rightWing = rightWing;
    root.add(body, earL, earR, eyeL, eyeR, leftWing, rightWing);
  } else {
    const armor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 1.1), palette.getMat(0x1e1b4b, 'metal'));
    armor.position.y = 1.1;
    armor.castShadow = true;
    const helm = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.95, 1.05), palette.getMat(0x312e81, 'metal'));
    helm.position.y = 2.3;
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 5), palette.getMat(0xe879f9, 'emissive'));
    hornL.position.set(-0.52, 2.85, 0);
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 5), palette.getMat(0xe879f9, 'emissive'));
    hornR.position.set(0.52, 2.85, 0);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.12), palette.getMat(0x22d3ee, 'emissive'));
    visor.position.set(0, 2.3, 0.55);
    root.add(armor, helm, hornL, hornR, visor);
  }

  if (scale !== 1) {
    root.scale.setScalar(scale);
  }

  return root;
}

// 3D Armed Shooter Enemy (for Petualang & Pendekar difficulties)
export function createShooterMesh(palette: MaterialPalette): THREE.Group {
  const root = new THREE.Group();
  addShadow(root, palette, 0.9);
  const darkMetal = palette.getMat(0x1e293b, 'metal');
  const redGlow = palette.getMat(0xf43f5e, 'emissive');

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.25, 0.95), darkMetal);
  body.position.y = 0.85;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.68, 0.76), palette.getMat(0x334155, 'metal'));
  head.position.y = 1.85;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, 0.1), redGlow);
  visor.position.set(0, 1.88, 0.4);
  const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.95, 8), darkMetal);
  cannon.rotation.x = Math.PI / 2;
  cannon.position.set(0.58, 1.15, 0.45);
  const cannonTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), redGlow);
  cannonTip.position.set(0.58, 1.15, 0.95);

  root.add(body, head, visor, cannon, cannonTip);
  return root;
}

// 6. Swirling Stone Portal to Istana IELTS ("Portal Kerajaan")
export function createPortalArch(palette: MaterialPalette): PortalArchRig {
  const root = new THREE.Group();
  const stone = palette.getPixelMat('cobble', 0x94a3b8);
  const darkStone = palette.getPixelMat('cobble', 0x475569);

  const base = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.75, 4.4), darkStone);
  base.position.y = 0.375;
  base.receiveShadow = true;
  root.add(base);

  const step = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.38, 5.2), stone);
  step.position.y = 0.19;
  step.receiveShadow = true;
  root.add(step);

  const pillarL = new THREE.Mesh(new THREE.BoxGeometry(2.0, 7.2, 2.2), stone);
  pillarL.position.set(-3.9, 3.8, 0);
  pillarL.castShadow = true;
  const pillarR = new THREE.Mesh(new THREE.BoxGeometry(2.0, 7.2, 2.2), stone);
  pillarR.position.set(3.9, 3.8, 0);
  pillarR.castShadow = true;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(10.6, 1.8, 2.5), darkStone);
  lintel.position.set(0, 7.8, 0);
  lintel.castShadow = true;
  root.add(pillarL, pillarR, lintel);

  const torchL = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), palette.getMat(0xf59e0b, 'emissive'));
  torchL.position.set(-4.2, 1.8, 1.5);
  const torchR = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), palette.getMat(0xf59e0b, 'emissive'));
  torchR.position.set(4.2, 1.8, 1.5);
  root.add(torchL, torchR);

  const ringOuter = new THREE.Mesh(
    new THREE.TorusGeometry(2.75, 0.25, 10, 28),
    palette.getMat(0xa855f7, 'emissive'),
  );
  ringOuter.position.set(0, 4.1, 0);

  const ringInner = new THREE.Mesh(
    new THREE.TorusGeometry(1.9, 0.2, 8, 24),
    palette.getMat(0x22d3ee, 'emissive'),
  );
  ringInner.position.set(0, 4.1, 0.08);

  const coreDisc = new THREE.Mesh(
    new THREE.CircleGeometry(2.65, 24),
    new THREE.MeshBasicMaterial({
      color: 0x7e22ce,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    }),
  );
  coreDisc.position.set(0, 4.1, -0.05);
  root.add(ringOuter, ringInner, coreDisc);

  return { root, ringOuter, ringInner, coreDisc };
}

// 7. 6 Atmospheric Area Mists in Hutan Kata (lift dramatically when Zone Boss is beaten!)
export function createAreaMists(): Map<ZoneId, THREE.Mesh> {
  const mists = new Map<ZoneId, THREE.Mesh>();
  const zones = Object.keys(ZONE_INFO) as ZoneId[];
  for (const zId of zones) {
    const info = ZONE_INFO[zId];
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(info.badgeColor),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 10.5, 4.2, 20, 1, true), mat);
    ring.position.set(info.x, 2.1, info.z);
    mists.set(zId, ring);
  }
  return mists;
}

// 8. Minecraft-Styled RPG Zone Structures
export function createZoneLandmarks(palette: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  const cobbleMat = palette.getPixelMat('cobble');
  const oakPlankMat = palette.getPixelMat('oak_plank');
  const sprucePlankMat = palette.getPixelMat('spruce_plank');
  const oakLogMat = palette.getPixelMat('oak_log');
  const redWool = palette.getPixelMat('wool_red');
  const whiteWool = palette.getPixelMat('wool_white');
  const craftMat = palette.getPixelMat('crafting');
  const flameMat = palette.getMat(0xfef08a, 'emissive');
  const emberMat = palette.getMat(0xf97316, 'emissive');

  // Desa Sapaan: two cozy Minecraft timber-and-cobble cottages
  group.add(
    createMinecraftHouse(palette, {
      x: -33,
      z: -2,
      rotY: 0.5,
      width: 6.4,
      depth: 5.2,
      wallHeight: 3.5,
      roofTint: 0xc084fc,
      flowerBox: true,
    }),
  );
  group.add(
    createMinecraftHouse(palette, {
      x: -34,
      z: 14,
      rotY: 0.8,
      width: 6.0,
      depth: 5.0,
      wallHeight: 3.4,
      roofTint: 0xd8b4fe,
      flowerBox: true,
    }),
  );

  // Pasar Rasa (-31, 29): Minecraft Kitchen Stall with red-white striped canopy & cauldrons
  const market = new THREE.Group();
  market.position.set(-31, 0, 29);
  market.rotation.y = 0.7;

  const marketFloor = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.25, 5.2), cobbleMat);
  marketFloor.position.y = 0.125;
  marketFloor.receiveShadow = true;
  market.add(marketFloor);

  const counter = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.35, 1.6), oakPlankMat);
  counter.position.set(0, 0.8, 1.1);
  counter.castShadow = true;
  counter.receiveShadow = true;
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.22, 1.85), sprucePlankMat);
  counterTop.position.set(0, 1.54, 1.1);
  market.add(counter, counterTop);

  // Corner log posts
  [
    [-2.8, -1.8],
    [2.8, -1.8],
    [-2.8, 1.9],
    [2.8, 1.9],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 0.4), oakLogMat);
    post.position.set(px, 1.8, pz);
    post.castShadow = true;
    market.add(post);
  });

  // Striped red & white awning roof
  for (let s = 0; s < 6; s++) {
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(1.08, 0.35, 4.7),
      s % 2 === 0 ? redWool : whiteWool,
    );
    slat.position.set(-2.7 + s * 1.08, 3.55, 0.05);
    slat.rotation.x = 0.12;
    slat.castShadow = true;
    market.add(slat);
  }

  // Crafting table & cauldrons beside Pasar Rasa
  const mCraft = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), craftMat);
  mCraft.position.set(-3.7, 0.65, 0.4);
  mCraft.castShadow = true;
  market.add(mCraft);

  const cauldron = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.25, 1.5), palette.getMat(0x1e293b, 'metal'));
  cauldron.position.set(4.1, 0.65, 0.4);
  cauldron.castShadow = true;
  const soup = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.22, 1.25), palette.getMat(0x22c55e, 'emissive'));
  soup.position.set(4.1, 1.25, 0.4);
  market.add(cauldron, soup);

  // Market porch torches
  [-2.8, 2.8].forEach((tx) => {
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), oakLogMat);
    stick.position.set(tx, 2.45, 2.25);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), flameMat);
    tip.position.set(tx, 2.82, 2.25);
    market.add(stick, tip);
  });
  group.add(market);

  // Menara Waktu (-29, -27): Minecraft Cobblestone & Oak Clock Tower
  const tower = new THREE.Group();
  tower.position.set(-29, 0, -27);
  const tPlinth = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.0, 6.8), cobbleMat);
  tPlinth.position.y = 0.5;
  tPlinth.receiveShadow = true;
  const tBody = new THREE.Mesh(new THREE.BoxGeometry(5.6, 8.2, 5.6), cobbleMat);
  tBody.position.y = 4.6;
  tBody.castShadow = true;
  tBody.receiveShadow = true;
  tower.add(tPlinth, tBody);

  // Oak log corner columns
  [
    [-2.75, -2.75],
    [2.75, -2.75],
    [-2.75, 2.75],
    [2.75, 2.75],
  ].forEach(([cx, cz]) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.65, 8.8, 0.65), oakLogMat);
    beam.position.set(cx, 4.4, cz);
    beam.castShadow = true;
    tower.add(beam);
  });

  // Battlements & stepped Minecraft pyramid spire
  const belfry = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.85, 6.4), sprucePlankMat);
  belfry.position.y = 9.05;
  belfry.castShadow = true;
  tower.add(belfry);
  const spireTier1 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.4, 5.0), sprucePlankMat);
  spireTier1.position.y = 10.15;
  const spireTier2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 3.4), sprucePlankMat);
  spireTier2.position.y = 11.55;
  const spireTip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), palette.getMat(0xfacc15, 'metal'));
  spireTip.position.y = 12.95;
  tower.add(spireTier1, spireTier2, spireTip);

  const clockFrame = new THREE.Mesh(new THREE.BoxGeometry(3.1, 3.1, 0.35), oakPlankMat);
  clockFrame.position.set(0, 6.6, 2.85);
  const clockFace = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 0.38), flameMat);
  clockFace.position.set(0, 6.6, 2.95);
  const clockHands = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.14), emberMat);
  clockHands.position.set(0, 6.95, 3.16);
  const tDoor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.3, 0.25), sprucePlankMat);
  tDoor.position.set(0, 1.65, 2.85);
  const tStep = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.1), cobbleMat);
  tStep.position.set(0, 0.25, 3.7);
  tower.add(clockFrame, clockFace, clockHands, tDoor, tStep);
  addShadow(tower, palette, 4.8);
  group.add(tower);

  // Gerbang Kota (0, 35): Minecraft Village Gatehouse with cobblestone piers & hanging lanterns
  const bridge = new THREE.Group();
  bridge.position.set(0, 0, 35);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.36, 7.6), cobbleMat);
  deck.position.y = 0.18;
  deck.receiveShadow = true;
  const postL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.6, 1.1), cobbleMat);
  postL.position.set(-4.0, 2.3, -2.5);
  postL.castShadow = true;
  const postR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.6, 1.1), cobbleMat);
  postR.position.set(4.0, 2.3, -2.5);
  postR.castShadow = true;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.78, 1.2), oakLogMat);
  beam.position.set(0, 4.75, -2.5);
  beam.castShadow = true;
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.55, 2.1), sprucePlankMat);
  roofCap.position.set(0, 5.4, -2.5);
  roofCap.castShadow = true;
  const lantL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.55), flameMat);
  lantL.position.set(-3.1, 3.9, -2.5);
  const lantR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.55), flameMat);
  lantR.position.set(3.1, 3.9, -2.5);
  bridge.add(deck, postL, postR, beam, roofCap, lantL, lantR);
  group.add(bridge);

  // Hutan Satwa (33, -18): Minecraft Woodcutter / Ranger Cabin
  group.add(
    createMinecraftHouse(palette, {
      x: 33,
      z: -18,
      rotY: -0.7,
      width: 6.2,
      depth: 5.0,
      wallHeight: 3.4,
      roofTint: 0x4ade80,
      flowerBox: true,
    }),
  );

  return group;
}

export function getZoneForPosition(x: number, z: number): ZoneId {
  if (z < -22 && Math.abs(x) < 16) return 'gua_portal';
  if (x < -8 && z < -8) return 'menara_waktu';
  if (x < -10 && z >= -8 && z < 17) return 'desa_sapaan';
  if (x < -10 && z >= 17) return 'pasar_rasa';
  if (x > 12) return 'hutan_satwa';
  return 'gerbang_kota';
}

function createDoorSignSprite(
  def: DoorDef,
  disposables: Array<{ dispose: () => void }>,
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Dark carved RPG wooden plaque
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, 22);
  ctx.fill();

  ctx.lineWidth = 6;
  ctx.strokeStyle = def.index === 4 ? '#f43f5e' : '#f59e0b';
  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, 22);
  ctx.stroke();

  // Inner subtle highlight border
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.45)';
  ctx.beginPath();
  ctx.roundRect(18, 18, 476, 92, 16);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#fef3c7';
  ctx.fillText(`${def.index + 1}. ${def.name}`, 256, 48);

  ctx.font = 'bold 21px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(def.modeLabel, 256, 88);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  disposables.push(tex, mat);

  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4.1, 1.02, 1);
  // Ignore raycasts on text billboard so clicks/camera pass cleanly to solid meshes
  sprite.raycast = () => {};
  return sprite;
}

// 9. Distinct 3D Mission Landmarks inside Zone Dungeons (Pool, Tunnel, Echo Shrine, Bridge, Boss Gate)
export function createDungeonDoorRig(
  def: DoorDef,
  palette: MaterialPalette,
  disposables: Array<{ dispose: () => void }> = [],
): DungeonDoorRig {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.userData.doorIndex = def.index;
  // Face inward toward arena center
  group.rotation.y = Math.atan2(-def.x, -def.z);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.45,
    metalness: 0.25,
  });
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xfacc15,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  disposables.push(frameMat, orbMat);

  const stoneDark = palette.getMat(0x334155, 'matte');
  const stoneMid = palette.getMat(0x475569, 'matte');
  const stoneLight = palette.getMat(0x64748b, 'matte');
  const woodDark = palette.getMat(0x78350f, 'matte');
  const woodWarm = palette.getMat(0xb45309, 'matte');

  let orbBaseY = 3.6;

  if (def.mode === 'cards') {
    // Landmark 1: Luminous Memory Pool / Sacred Well (Kolam Ingatan / Sumur Tua / Genangan)
    const outerRim = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.55, 0.48, 8), stoneMid);
    outerRim.position.y = 0.24;
    outerRim.castShadow = true;
    outerRim.receiveShadow = true;

    const stoneCurb = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.24, 6, 8), frameMat);
    stoneCurb.rotation.x = Math.PI / 2;
    stoneCurb.rotation.z = Math.PI / 8;
    stoneCurb.position.y = 0.52;

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.72,
      roughness: 0.15,
      metalness: 0.15,
    });
    disposables.push(waterMat);
    const waterPool = new THREE.Mesh(new THREE.CylinderGeometry(1.88, 1.88, 0.14, 16), waterMat);
    waterPool.position.y = 0.46;

    // Floating rune lilypads/memory tiles inside the pool
    const runeMat = palette.getMat(0xa7f3d0, 'emissive');
    [
      [-0.7, 0.56, 0.4],
      [0.65, 0.56, -0.5],
      [0.15, 0.56, 0.75],
    ].forEach(([rx, ry, rz]) => {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.45), runeMat);
      tile.position.set(rx, ry, rz);
      tile.rotation.y = rx;
      group.add(tile);
    });

    // Four carved corner lantern posts supporting a well roof canopy
    const postOffsets: Array<[number, number]> = [
      [-1.55, -1.55],
      [1.55, -1.55],
      [-1.55, 1.55],
      [1.55, 1.55],
    ];
    postOffsets.forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.25, 0.28), woodDark);
      post.position.set(px, 1.45, pz);
      post.castShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.4), frameMat);
      cap.position.set(px, 2.55, pz);
      group.add(post, cap);
    });

    const canopyFrame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 3.4), woodWarm);
    canopyFrame.position.y = 2.68;
    const canopyPeak = new THREE.Mesh(new THREE.ConeGeometry(2.15, 0.85, 4), frameMat);
    canopyPeak.position.y = 3.18;
    canopyPeak.rotation.y = Math.PI / 4;

    group.add(outerRim, stoneCurb, waterPool, canopyFrame, canopyPeak);
    orbBaseY = 4.15;
  } else if (def.mode === 'duel') {
    // Landmark 2: Vaulted Lightning Duel Corridor / Tunnel (Lorong Kilat / Jalur / Jalan)
    const floorRunner = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.18, 3.8), stoneDark);
    floorRunner.position.y = 0.09;
    floorRunner.receiveShadow = true;

    const duelCarpet = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.06, 3.6),
      palette.getMat(0xbe123c, 'matte'),
    );
    duelCarpet.position.y = 0.2;

    // 3 sequential archways forming a genuine 3D walk-in corridor!
    [-1.25, 0, 1.25].forEach((az) => {
      const archL = new THREE.Mesh(new THREE.BoxGeometry(0.46, 3.0, 0.5), stoneMid);
      archL.position.set(-1.32, 1.5, az);
      archL.castShadow = true;
      const archR = new THREE.Mesh(new THREE.BoxGeometry(0.46, 3.0, 0.5), stoneMid);
      archR.position.set(1.32, 1.5, az);
      archR.castShadow = true;
      const archTop = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.55, 0.56), frameMat);
      archTop.position.set(0, 3.15, az);
      group.add(archL, archR, archTop);
    });

    // Corridor side beams connecting the 3 arches along top edges
    const sideBeamL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 3.3), woodWarm);
    sideBeamL.position.set(-1.32, 2.85, 0);
    const sideBeamR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 3.3), woodWarm);
    sideBeamR.position.set(1.32, 2.85, 0);

    // Twin crackling lightning/duel crystals flanking the corridor mouth
    [-1.78, 1.78].forEach((cx, i) => {
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.55, 5), orbMat);
      crystal.position.set(cx, 1.1, 1.45);
      crystal.rotation.z = i === 0 ? 0.22 : -0.22;
      group.add(crystal);
    });

    group.add(floorRunner, duelCarpet, sideBeamL, sideBeamR);
    orbBaseY = 4.1;
  } else if (def.mode === 'listen') {
    // Landmark 3: Acoustic Echo Shrine & Golden Resonance Bell (Lorong Gema / Ruang Lonceng)
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.28, 12), stoneDark);
    stage.position.y = 0.14;
    stage.receiveShadow = true;

    // Semicircular acoustic echo shell wall behind the bell
    const shellOffsets: Array<[number, number, number]> = [
      [-1.45, -0.55, 0.45],
      [-0.78, -1.22, 0.22],
      [0, -1.42, 0],
      [0.78, -1.22, -0.22],
      [1.45, -0.55, -0.45],
    ];
    shellOffsets.forEach(([sx, sz, rot]) => {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.3, 0.45), stoneMid);
      rib.position.set(sx, 1.65, sz);
      rib.rotation.y = rot;
      rib.castShadow = true;
      group.add(rib);
    });

    // Timber & gold bell-hanging frame
    const bellBeam = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.38, 0.55), frameMat);
    bellBeam.position.set(0, 3.35, -0.3);
    const bellBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.68, 0.95, 12),
      palette.getMat(0xfbbf24, 'metal'),
    );
    bellBody.position.set(0, 2.55, -0.2);
    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), orbMat);
    clapper.position.set(0, 2.0, -0.2);

    // Concentric glowing sound-wave echo rings in front of the bell
    const waveMat = palette.getMat(0x22d3ee, 'emissive');
    const waveInner = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.08, 8, 24), waveMat);
    waveInner.position.set(0, 2.15, 0.45);
    const waveOuter = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.08, 8, 28), waveMat);
    waveOuter.position.set(0, 2.15, 0.72);

    group.add(stage, bellBeam, bellBody, clapper, waveInner, waveOuter);
    orbBaseY = 4.25;
  } else if (def.mode === 'type') {
    // Landmark 4: Arched Timber-and-Stone Bridge over Underground Stream (Jembatan Huruf / Parit)
    const streamMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.75,
      roughness: 0.18,
    });
    disposables.push(streamMat);

    // Shimmering underground stream bed beneath the bridge
    const streamBed = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.1, 2.3), streamMat);
    streamBed.position.set(0, 0.05, 0);

    // Mossy stone riverbanks flanking the water
    const bankN = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.28, 0.45), stoneLight);
    bankN.position.set(0, 0.14, -1.32);
    const bankS = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.28, 0.45), stoneLight);
    bankS.position.set(0, 0.14, 1.32);

    // 3-step arched wooden deck spanning across the stream (walk-up ramp -> crest -> down ramp)
    const rampFront = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.24, 1.05), woodWarm);
    rampFront.position.set(0, 0.35, 1.05);
    rampFront.rotation.x = 0.24;
    const bridgeCrest = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.26, 1.35), woodWarm);
    bridgeCrest.position.set(0, 0.64, 0);
    bridgeCrest.castShadow = true;
    const rampBack = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.24, 1.05), woodWarm);
    rampBack.position.set(0, 0.35, -1.05);
    rampBack.rotation.x = -0.24;

    // Glowing letter-rune tiles inlaid on the bridge crest
    [-0.65, 0, 0.65].forEach((rx) => {
      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), orbMat);
      rune.position.set(rx, 0.8, 0);
      group.add(rune);
    });

    // Bridge handrail posts & side railings
    [-1.15, 1.15].forEach((px) => {
      [-1.15, 0, 1.15].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.45, 0.22), frameMat);
        post.position.set(px, pz === 0 ? 1.3 : 1.0, pz);
        group.add(post);
      });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 2.75), woodDark);
      rail.position.set(px, 1.72, 0);
      group.add(rail);
    });

    // Small arch span above center of bridge
    const spanTop = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.32, 0.38), frameMat);
    spanTop.position.set(0, 2.45, 0);

    group.add(streamBed, bankN, bankS, rampFront, bridgeCrest, rampBack, spanTop);
    orbBaseY = 3.45;
  } else {
    // Landmark 5 (Boss Gate): Grand Ancient Double Seal Portal (Pintu Teka-Teki -> Bos)
    const dais = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.34, 2.5), stoneDark);
    dais.position.y = 0.17;
    dais.receiveShadow = true;

    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 4.1, 0.85), stoneMid);
    pL.position.set(-1.6, 2.15, 0);
    pL.castShadow = true;
    const pR = new THREE.Mesh(new THREE.BoxGeometry(0.85, 4.1, 0.85), stoneMid);
    pR.position.set(1.6, 2.15, 0);
    pR.castShadow = true;

    const trimL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.4, 0.95), frameMat);
    trimL.position.set(-1.6, 4.25, 0);
    const trimR = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.4, 0.95), frameMat);
    trimR.position.set(1.6, 4.25, 0);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.72, 1.05), frameMat);
    lintel.position.set(0, 4.45, 0);

    // Double paneled doors with central boss seal ring
    const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(1.12, 3.6, 0.24), woodDark);
    doorLeft.position.set(-0.58, 2.1, 0);
    const doorRight = new THREE.Mesh(new THREE.BoxGeometry(1.12, 3.6, 0.24), woodDark);
    doorRight.position.set(0.58, 2.1, 0);

    const lockRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.12, 8, 20), orbMat);
    lockRing.position.set(0, 2.15, 0.18);

    // Twin flaming corner braziers at door steps
    [-2.05, 2.05].forEach((bx) => {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.22, 0.55, 8), stoneMid);
      bowl.position.set(bx, 0.55, 0.9);
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), orbMat);
      flame.position.set(bx, 1.0, 0.9);
      group.add(bowl, flame);
    });

    group.add(dais, pL, pR, trimL, trimR, lintel, doorLeft, doorRight, lockRing);
    orbBaseY = 5.4;
  }

  const orbMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), orbMat);
  orbMesh.position.set(0, orbBaseY, 0);
  orbMesh.userData.baseY = orbBaseY;

  const signSprite = createDoorSignSprite(def, disposables);
  signSprite.position.set(0, orbBaseY + 1.05, 0);

  group.add(orbMesh, signSprite);
  return { index: def.index, def, group, orbMesh, frameMat, orbMat };
}

export function updateDoorRigVisual(
  rig: DungeonDoorRig,
  status: 'locked' | 'open' | 'cleared',
): void {
  if (status === 'cleared') {
    rig.frameMat.color.setHex(0x10b981);
    rig.orbMat.color.setHex(0x34d399);
    rig.orbMat.emissive.setHex(0x10b981);
  } else if (status === 'locked') {
    rig.frameMat.color.setHex(0x64748b);
    rig.orbMat.color.setHex(0xef4444);
    rig.orbMat.emissive.setHex(0xdc2626);
  } else {
    rig.frameMat.color.setHex(0xf59e0b);
    rig.orbMat.color.setHex(0xfacc15);
    rig.orbMat.emissive.setHex(0xf59e0b);
  }
}

function createPixelVoxelTexture(
  baseHex: string,
  darkHex: string,
  lightHex: string,
  speckHex?: string,
  pattern: 'stone' | 'moss' | 'ore' | 'obsidian' | 'shield' = 'stone',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 16, 16);

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const h = (x * 37 + y * 91 + x * y * 13) % 19;
      if (h < 4) {
        ctx.fillStyle = darkHex;
        ctx.fillRect(x, y, 1, 1);
      } else if (h > 14) {
        ctx.fillStyle = lightHex;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  if (pattern === 'moss') {
    ctx.fillStyle = speckHex || '#22c55e';
    for (let x = 0; x < 16; x++) {
      const drop = 2 + ((x * 5) % 4);
      ctx.fillRect(x, 0, 1, drop);
    }
  } else if (pattern === 'ore' && speckHex) {
    ctx.fillStyle = speckHex;
    const spots = [
      [3, 3, 2, 2],
      [10, 4, 3, 2],
      [5, 10, 3, 2],
      [11, 11, 2, 3],
      [2, 12, 2, 2],
    ];
    spots.forEach(([sx, sy, sw, sh]) => ctx.fillRect(sx, sy, sw, sh));
  } else if (pattern === 'obsidian' && speckHex) {
    ctx.fillStyle = speckHex;
    ctx.fillRect(2, 2, 12, 1);
    ctx.fillRect(2, 13, 12, 1);
    ctx.fillRect(2, 2, 1, 12);
    ctx.fillRect(13, 2, 1, 12);
    ctx.fillRect(6, 5, 4, 2);
    ctx.fillRect(5, 9, 6, 2);
  } else if (pattern === 'shield' && speckHex) {
    // Timber & iron barricade frame with central shield cross
    ctx.fillStyle = darkHex;
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillRect(0, 0, 2, 16);
    ctx.fillRect(14, 0, 2, 16);
    ctx.fillStyle = speckHex;
    ctx.fillRect(7, 4, 2, 8);
    ctx.fillRect(4, 7, 8, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

export function createCaveTorchMesh(palette: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.95, 0.18),
    palette.getMat(0x78350f, 'matte'),
  );
  handle.position.y = 0.475;
  handle.castShadow = true;

  const collar = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.14, 0.24),
    palette.getMat(0x334155, 'metal'),
  );
  collar.position.y = 0.88;

  const ember = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.18, 0.22),
    palette.getMat(0xf97316, 'emissive'),
  );
  ember.position.y = 1.04;

  const flame = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.26, 0.18),
    palette.getMat(0xfef08a, 'emissive'),
  );
  flame.position.y = 1.24;
  flame.userData.isFlame = true;

  g.add(handle, collar, ember, flame);
  return g;
}

export function createCaveTntMesh(palette: MaterialPalette): THREE.Group {
  const g = new THREE.Group();
  const redMat = palette.getMat(0xdc2626, 'matte');
  const bandMat = palette.getMat(0xf8fafc, 'matte');
  const topCap = palette.getMat(0x991b1b, 'matte');
  const core = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.35, 1.35), redMat);
  core.position.y = 0.68;
  core.castShadow = true;
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.39, 0.42, 1.39), bandMat);
  band.position.y = 0.68;
  const fuse = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), topCap);
  fuse.position.y = 1.44;
  const spark = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18, 0),
    palette.getMat(0xfacc15, 'emissive'),
  );
  spark.position.y = 1.66;
  spark.userData.isTntSpark = true;
  g.add(core, band, fuse, spark);
  return g;
}

function createCrackOverlayTextures(): THREE.CanvasTexture[] {
  const segments: Array<Array<[number, number, number, number]>> = [
    [
      [7, 7, 2, 2],
      [6, 5, 1, 2],
      [9, 8, 2, 1],
    ],
    [
      [5, 3, 1, 3],
      [10, 9, 2, 2],
      [3, 8, 3, 1],
    ],
    [
      [2, 2, 3, 2],
      [11, 2, 2, 4],
      [12, 11, 2, 3],
      [3, 12, 3, 2],
    ],
    [
      [1, 5, 4, 2],
      [8, 1, 2, 5],
      [8, 10, 2, 5],
      [1, 13, 5, 2],
      [11, 7, 4, 2],
    ],
  ];

  const textures: THREE.CanvasTexture[] = [];
  for (let stage = 0; stage < 4; stage++) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 16, 16);
    for (let s = 0; s <= stage; s++) {
      ctx.fillStyle = s >= 2 ? 'rgba(9, 13, 22, 0.9)' : 'rgba(15, 23, 42, 0.72)';
      for (const [rx, ry, rw, rh] of segments[s]) {
        ctx.fillRect(rx, ry, rw, rh);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    textures.push(tex);
  }
  return textures;
}

export function createCaptiveMesh(
  kind: 'girl' | 'mother' | 'fox_kit' | 'student' | 'spirit',
  colorHex: number,
  palette: MaterialPalette,
): THREE.Group {
  const root = new THREE.Group();
  addShadow(root, palette, 0.72);
  const skin = palette.getMat(0xfed7aa, 'matte');
  const outfit = palette.getMat(colorHex, 'matte');
  const darkEye = palette.getMat(0x0f172a, 'matte');

  if (kind === 'fox_kit') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 0.85), outfit);
    body.position.y = 0.56;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.6, 0.68), outfit);
    head.position.set(0, 1.18, 0.16);
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.14), outfit);
    earL.position.set(-0.2, 1.56, 0.12);
    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.14), outfit);
    earR.position.set(0.2, 1.56, 0.12);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.62), palette.getMat(0xf8fafc, 'matte'));
    tail.position.set(0, 0.62, -0.58);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), darkEye);
    eyeL.position.set(-0.15, 1.22, 0.52);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), darkEye);
    eyeR.position.set(0.15, 1.22, 0.52);
    root.add(body, head, earL, earR, tail, eyeL, eyeR);
    return root;
  }

  if (kind === 'spirit') {
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      palette.getMat(colorHex, 'emissive'),
    );
    core.position.y = 1.45;
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.08, 6, 18),
      palette.getMat(0xfef08a, 'emissive'),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 1.45;
    const baseOrb = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.95, 6),
      palette.getMat(0x7c3aed, 'gloss'),
    );
    baseOrb.position.y = 0.65;
    root.add(baseOrb, core, halo);
    return root;
  }

  const heightScale = kind === 'girl' ? 0.82 : 0.96;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.88, 0.44), outfit);
  torso.position.y = 0.88;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.64, 0.64), skin);
  head.position.y = 1.68;
  head.castShadow = true;
  const hair = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.24, 0.68),
    palette.getMat(kind === 'mother' ? 0x57534e : 0x3b2008, 'matte'),
  );
  hair.position.y = 1.98;
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), darkEye);
  eyeL.position.set(-0.15, 1.68, 0.33);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), darkEye);
  eyeR.position.set(0.15, 1.68, 0.33);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.26), palette.getMat(0x1e293b, 'matte'));
  legL.position.set(-0.18, 0.24, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.26), palette.getMat(0x1e293b, 'matte'));
  legR.position.set(0.18, 0.24, 0);
  root.add(legL, legR, torso, head, hair, eyeL, eyeR);
  if (kind === 'girl') {
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.14), palette.getMat(0xe11d48, 'matte'));
    ribbon.position.set(0.24, 2.1, 0.12);
    root.add(ribbon);
  }
  root.scale.setScalar(heightScale);
  return root;
}

export function createPrisonKeyMesh(palette: MaterialPalette): THREE.Group {
  const root = new THREE.Group();
  const goldMat = palette.getMat(0xfacc15, 'metal');
  const glowMat = palette.getMat(0xfef08a, 'emissive');

  const beaconRing = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.55, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    }),
  );
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.y = 0.06;

  const keyPivot = new THREE.Group();
  keyPivot.position.y = 1.45;
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.1, 8, 16), goldMat);
  bow.position.x = -0.38;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.14), goldMat);
  shaft.position.x = 0.2;
  const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.14), goldMat);
  tooth1.position.set(0.48, -0.14, 0);
  const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.14), goldMat);
  tooth2.position.set(0.28, -0.11, 0);
  const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), glowMat);
  coreGem.position.set(-0.38, 0, 0);
  keyPivot.add(bow, shaft, tooth1, tooth2, coreGem);
  keyPivot.userData.animKind = 'bob';
  keyPivot.userData.baseY = 1.45;
  keyPivot.userData.phase = 0.2;

  root.add(beaconRing, keyPivot);
  root.userData.keyPivot = keyPivot;
  return root;
}

// 10. Minecraft-Style 3D Voxel Cave Arena (with Roof, Stalactites, Mineable Blocks & 5 Mission Doors!)
export function createDungeonEnvironment(
  zoneId: ZoneId,
  palette: MaterialPalette,
): DungeonArenaRig {
  const group = new THREE.Group();
  const animatables: THREE.Object3D[] = [];
  const caveBlocks: CaveBlockDef[] = [];
  const caveColliders: CaveStaticCollider[] = [];
  const cameraOccluders: THREE.Object3D[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const exitPadPos = new THREE.Vector3(0, 0, 17);

  const zoneStoneColors: Record<ZoneId, [string, string, string]> = {
    desa_sapaan: ['#6b7280', '#4b5563', '#9ca3af'],
    pasar_rasa: ['#9a3412', '#7c2d12', '#c2410c'],
    hutan_satwa: ['#3f6212', '#365314', '#65a30d'],
    gerbang_kota: ['#475569', '#334155', '#64748b'],
    menara_waktu: ['#312e81', '#1e1b4b', '#4338ca'],
    gua_portal: ['#3f3cbb', '#1e1b4b', '#6366f1'],
  };
  const [stBase, stDark, stLight] = zoneStoneColors[zoneId];

  const stoneTex = createPixelVoxelTexture(stBase, stDark, stLight, undefined, 'stone');
  const floorTex = createPixelVoxelTexture(stDark, '#0f172a', stBase, undefined, 'stone');
  floorTex.wrapS = THREE.RepeatWrapping;
  floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(18, 18);

  const mossTex = createPixelVoxelTexture('#78350f', '#451a03', '#92400e', '#22c55e', 'moss');
  const diamondOreTex = createPixelVoxelTexture('#475569', '#1e293b', '#64748b', '#22d3ee', 'ore');
  const heartOreTex = createPixelVoxelTexture('#475569', '#1e293b', '#64748b', '#fb7185', 'ore');
  const wordSealTex = createPixelVoxelTexture('#1e1b4b', '#090d16', '#312e81', '#c084fc', 'obsidian');
  const shieldBlockTex = createPixelVoxelTexture('#b45309', '#78350f', '#d97706', '#38bdf8', 'shield');
  disposables.push(
    stoneTex,
    floorTex,
    mossTex,
    diamondOreTex,
    heartOreTex,
    wordSealTex,
    shieldBlockTex,
  );

  const wallMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, metalness: 0.05 });
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92, metalness: 0.04 });
  const roofMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, metalness: 0.02 });
  const stoneBlockMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.85, metalness: 0.08 });
  const mossBlockMat = new THREE.MeshStandardMaterial({ map: mossTex, roughness: 0.9, metalness: 0.02 });
  const diamondOreMat = new THREE.MeshStandardMaterial({
    map: diamondOreTex,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.25,
    roughness: 0.55,
    metalness: 0.35,
  });
  const heartOreMat = new THREE.MeshStandardMaterial({
    map: heartOreTex,
    emissive: 0xf43f5e,
    emissiveIntensity: 0.25,
    roughness: 0.55,
    metalness: 0.25,
  });
  const wordSealMat = new THREE.MeshStandardMaterial({
    map: wordSealTex,
    emissive: 0xa855f7,
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.4,
  });
  const shieldBlockMat = new THREE.MeshStandardMaterial({
    map: shieldBlockTex,
    emissive: 0x0284c7,
    emissiveIntensity: 0.14,
    roughness: 0.7,
    metalness: 0.2,
  });
  disposables.push(
    wallMat,
    floorMat,
    roofMat,
    stoneBlockMat,
    mossBlockMat,
    diamondOreMat,
    heartOreMat,
    wordSealMat,
    shieldBlockMat,
  );

  // Cave Floor Slab (2m voxel-tiled surface)
  const arenaFloor = new THREE.Mesh(new THREE.BoxGeometry(44, 0.5, 44), floorMat);
  arenaFloor.position.y = -0.25;
  arenaFloor.receiveShadow = true;
  group.add(arenaFloor);

  // Voxel Cave Ceiling Slab (closed cavern ceiling at y = 9.8!)
  const ceilingSlab = new THREE.Mesh(new THREE.BoxGeometry(45, 0.8, 45), roofMat);
  ceilingSlab.position.y = 10.0;
  group.add(ceilingSlab);
  cameraOccluders.push(ceilingSlab);

  const ringHex =
    zoneId === 'gua_portal'
      ? 0xa855f7
      : zoneId === 'menara_waktu'
      ? 0xfacc15
      : zoneId === 'hutan_satwa'
      ? 0x34d399
      : zoneId === 'pasar_rasa'
      ? 0xf97316
      : zoneId === 'gerbang_kota'
      ? 0x38bdf8
      : 0xfbbf24;

  const centerRune = new THREE.Mesh(
    new THREE.RingGeometry(4.0, 4.7, 28),
    palette.getMat(ringHex, 'emissive'),
  );
  centerRune.rotation.x = -Math.PI / 2;
  centerRune.position.y = 0.03;
  group.add(centerRune);

  // Tall Voxel Cave Perimeter Walls (height = 10)
  const wallHeight = 10;
  const addWall = (x: number, z: number, w: number, h: number, d: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    cameraOccluders.push(m);
  };
  addWall(0, -21.5, 45, wallHeight, 2);
  addWall(-21.5, 0, 2, wallHeight, 45);
  addWall(21.5, 0, 2, wallHeight, 45);
  addWall(-13.5, 21.5, 17, wallHeight, 2);
  addWall(13.5, 21.5, 17, wallHeight, 2);
  addWall(0, 21.5, 10, 4.5, 2); // South archway lintel above exit portal
  group.children[group.children.length - 1].position.y = 7.75;

  // Hanging Voxel Stalactites & Glowing Ceiling Crystals
  const stalactiteCoords: Array<[number, number, number, boolean]> = [
    [-16, -15, 2.4, true],
    [-6, -14, 2.1, false],
    [6, -14, 2.3, true],
    [16, -15, 2.5, false],
    [-12, -3, 2.2, false],
    [0, -7, 1.9, true],
    [12, -3, 2.2, false],
    [-16, 4, 2.4, true],
    [16, 4, 2.3, true],
    [-8, 10, 2.0, false],
    [8, 10, 2.0, false],
    [-16, 15, 2.2, true],
    [16, 15, 2.2, false],
  ];
  const crystalMat = palette.getMat(ringHex, 'emissive');
  stalactiteCoords.forEach(([sx, sz, len, glow]) => {
    const topBlk = new THREE.Mesh(new THREE.BoxGeometry(1.6, len * 0.55, 1.6), wallMat);
    topBlk.position.set(sx, 9.6 - len * 0.275, sz);
    const tipBlk = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, len * 0.55, 0.85),
      glow ? crystalMat : wallMat,
    );
    tipBlk.position.set(sx, 9.6 - len * 0.8, sz);
    group.add(topBlk, tipBlk);
  });

  // Natural Voxel Cave Pillars (static colliders that form tunnels & alcoves)
  const pillarCoords: Array<[number, number]> = [
    [-10, 10],
    [-10, 2],
    [10, 10],
    [10, 2],
    [-4, -4],
    [4, -4],
    [-11, -14],
    [11, -14],
  ];
  pillarCoords.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2, 9.8, 2), wallMat);
    pillar.position.set(px, 4.9, pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
    cameraOccluders.push(pillar);
    caveColliders.push({ x: px, z: pz, halfW: 1.0 });
  });

  const caveStory = ZONE_CAVE_STORIES[zoneId];
  const prisonX = caveStory.prisonCorner === 'nw' ? -17.4 : 17.4;
  const prisonZ = -17.4;

  // Mineable Minecraft-style Voxel Blocks (2x2.2x2) guarding shortcuts, ores & hidden prison!
  const blockLayout: Array<[number, number, CaveBlockKind]> = [
    // Left Wing Barricade & Secret Alcove
    [-10, 8, 'moss_dirt'],
    [-10, 6, 'stone'],
    [-10, 4, 'moss_dirt'],
    [-18, 1, 'diamond_ore'],
    [-18, -1, 'stone'],
    [-16, 13, 'moss_dirt'],
    [-18, 13, 'heart_ore'],
    // Right Wing Barricade & Secret Alcove
    [10, 8, 'moss_dirt'],
    [10, 6, 'stone'],
    [10, 4, 'moss_dirt'],
    [18, 1, 'heart_ore'],
    [18, -1, 'stone'],
    [16, 13, 'moss_dirt'],
    [18, 13, 'diamond_ore'],
    // Central North Cavern Ridge (Word Seal shortcut!)
    [-2, -4, 'stone'],
    [0, -4, 'word_seal'],
    [2, -4, 'stone'],
    // Hidden Prison Alcove Concealed Wall + Opposite Corner Ores
    ...(caveStory.prisonCorner === 'nw'
      ? ([
          [-14.6, -17.2, 'stone'],
          [-17.2, -14.6, 'moss_dirt'],
          [18, -16, 'diamond_ore'],
          [16, -18, 'moss_dirt'],
        ] as Array<[number, number, CaveBlockKind]>)
      : ([
          [-18, -16, 'diamond_ore'],
          [-16, -18, 'moss_dirt'],
          [14.6, -17.2, 'stone'],
          [17.2, -14.6, 'moss_dirt'],
        ] as Array<[number, number, CaveBlockKind]>)),
    [-9, -16, 'word_seal'],
    [9, -16, 'word_seal'],
    [-18, -12, 'heart_ore'],
    [18, -12, 'stone'],
    // Mid-side pockets
    [-4, 5, 'moss_dirt'],
    [4, 5, 'moss_dirt'],
  ];

  const blockMeta: Record<CaveBlockKind, { label: string; hp: number; mat: THREE.Material }> = {
    stone: { label: 'Batu Gua', hp: 2, mat: stoneBlockMat },
    moss_dirt: { label: 'Tanah Berlumut', hp: 1, mat: mossBlockMat },
    diamond_ore: { label: 'Bijih Berlian', hp: 3, mat: diamondOreMat },
    heart_ore: { label: 'Kristal Hati', hp: 2, mat: heartOreMat },
    word_seal: { label: 'Obsidian Segel Kata', hp: 5, mat: wordSealMat },
    player_shield: { label: 'Blok Pelindung', hp: 4, mat: shieldBlockMat },
  };

  const blockGeo = new THREE.BoxGeometry(2.0, 2.2, 2.0);
  disposables.push(blockGeo);

  const crackTextures = createCrackOverlayTextures();
  const crackMaterials = crackTextures.map((tex) => {
    disposables.push(tex);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    disposables.push(mat);
    return mat;
  });
  const crackGeo = new THREE.BoxGeometry(2.04, 2.24, 2.04);
  disposables.push(crackGeo);

  // Elevated Voxel Cliff Terraces (for 3D Jump & Stair-Building Verticality!)
  const platforms: CaveCliffPlatform[] = [
    { id: 'cliff_sw', x: -17, z: 14, halfW: 2.2, halfD: 2.2, topY: 1.65 },
    { id: 'step_sw', x: -13.6, z: 14, halfW: 1.2, halfD: 1.2, topY: 0.85 },
    { id: 'cliff_se', x: 17, z: 14, halfW: 2.2, halfD: 2.2, topY: 1.65 },
    { id: 'step_se', x: 13.6, z: 14, halfW: 1.2, halfD: 1.2, topY: 0.85 },
  ];
  platforms.forEach((p) => {
    const platMesh = new THREE.Mesh(
      new THREE.BoxGeometry(p.halfW * 2, p.topY, p.halfD * 2),
      wallMat,
    );
    platMesh.position.set(p.x, p.topY / 2, p.z);
    platMesh.castShadow = true;
    platMesh.receiveShadow = true;
    group.add(platMesh);
  });

  // Molten Lava Chasm Trenches (jump across or bridge using Blok Pelindung!)
  const chasms: CaveLavaChasm[] = [];
  const chasmCoords: Array<[string, number, number]> = [
    ['chasm_nw', -15.5, -10.5],
    ['chasm_ne', 15.5, -10.5],
  ];
  const chasmRimGeoX = new THREE.BoxGeometry(5.3, 0.22, 0.25);
  const chasmRimGeoZ = new THREE.BoxGeometry(0.25, 0.22, 3.3);
  const chasmLavaGeo = new THREE.BoxGeometry(4.8, 0.08, 2.8);
  disposables.push(chasmRimGeoX, chasmRimGeoZ, chasmLavaGeo);

  chasmCoords.forEach(([cid, cx, cz]) => {
    const cGroup = new THREE.Group();
    cGroup.position.set(cx, 0, cz);
    const rimN = new THREE.Mesh(chasmRimGeoX, wallMat);
    rimN.position.set(0, 0.1, -1.52);
    const rimS = new THREE.Mesh(chasmRimGeoX, wallMat);
    rimS.position.set(0, 0.1, 1.52);
    const rimW = new THREE.Mesh(chasmRimGeoZ, wallMat);
    rimW.position.set(-2.52, 0.1, 0);
    const rimE = new THREE.Mesh(chasmRimGeoZ, wallMat);
    rimE.position.set(2.52, 0.1, 0);
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      emissive: 0xf97316,
      emissiveIntensity: 1.35,
      roughness: 0.3,
      metalness: 0.1,
    });
    disposables.push(lavaMat);
    const lavaBed = new THREE.Mesh(chasmLavaGeo, lavaMat);
    lavaBed.position.y = 0.02;
    cGroup.add(rimN, rimS, rimW, rimE, lavaBed);
    group.add(cGroup);
    chasms.push({ id: cid, x: cx, z: cz, halfW: 2.35, halfD: 1.35, lavaMat });
  });

  // Composite Voxel Crafting Bench & Furnace Station near Cave Entrance!
  const craftingTablePos = new THREE.Vector3(-4.5, 0, 11.5);
  const craftStation = new THREE.Group();
  craftStation.position.copy(craftingTablePos);
  craftStation.userData.craftingTable = true;
  const tableBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.1, 1.4),
    palette.getMat(0x78350f, 'matte'),
  );
  tableBase.position.set(-0.4, 0.55, 0);
  tableBase.castShadow = true;
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.62, 0.22, 1.52),
    palette.getMat(0xd97706, 'matte'),
  );
  tableTop.position.set(-0.4, 1.18, 0);
  const furnaceBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.25, 1.2),
    palette.getMat(0x475569, 'matte'),
  );
  furnaceBody.position.set(0.85, 0.625, 0);
  furnaceBody.castShadow = true;
  const furnaceMouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.45, 0.14),
    palette.getMat(0xf97316, 'emissive'),
  );
  furnaceMouth.position.set(0.85, 0.45, 0.62);
  const craftOrb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    palette.getMat(0x38bdf8, 'emissive'),
  );
  craftOrb.position.set(0.2, 2.05, 0);
  craftOrb.userData.animKind = 'bob';
  craftOrb.userData.baseY = 2.05;
  craftOrb.userData.phase = 1.1;
  animatables.push(craftOrb);
  craftStation.add(tableBase, tableTop, furnaceBody, furnaceMouth, craftOrb);
  group.add(craftStation);
  cameraOccluders.push(tableBase, furnaceBody);
  caveColliders.push({ x: craftingTablePos.x, z: craftingTablePos.z, halfW: 1.2 });

  blockLayout.forEach(([bx, bz, kind], idx) => {
    const info = blockMeta[kind];
    const id = `cb_${zoneId}_${idx}`;
    let basePlatformY = 0;
    for (const p of platforms) {
      if (Math.abs(bx - p.x) <= p.halfW && Math.abs(bz - p.z) <= p.halfD) {
        basePlatformY = Math.max(basePlatformY, p.topY);
      }
    }
    const blockY = basePlatformY + 1.1;
    const mesh = new THREE.Mesh(blockGeo, info.mat);
    mesh.position.set(bx, blockY, bz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.caveBlockId = id;
    group.add(mesh);

    caveBlocks.push({
      id,
      kind,
      label: info.label,
      x: bx,
      y: blockY,
      z: bz,
      halfW: 1.0,
      hp: info.hp,
      maxHp: info.hp,
      mesh,
      alive: true,
      hasAmbush: false,
    });
  });

  // Randomly hide Mine Ambush Guardians inside 2 mineable cave blocks per run!
  const ambushCandidates = caveBlocks.filter(
    (b) => b.kind === 'stone' || b.kind === 'moss_dirt' || b.kind === 'diamond_ore',
  );
  for (let i = ambushCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = ambushCandidates[i];
    ambushCandidates[i] = ambushCandidates[j];
    ambushCandidates[j] = tmp;
  }
  ambushCandidates.slice(0, 2).forEach((b) => {
    b.hasAmbush = true;
  });

  // Alternating Minecraft-style Voxel Environmental Floor Traps (Lava & Retractable Spikes!)
  const traps: CaveTrapRig[] = [];
  const trapLayout: Array<[number, number, 'lava' | 'spikes', number]> = [
    [-6, 8, 'lava', 0],
    [6, 8, 'spikes', Math.PI],
    [-14, 1, 'spikes', Math.PI],
    [14, 1, 'lava', 0],
    [-5, -12, 'lava', 0],
    [5, -12, 'spikes', Math.PI],
  ];
  const trapFrameMat = palette.getMat(0x1e293b, 'matte');
  const trapSpikeMat = palette.getMat(0xe11d48, 'metal');
  const trapFrameXGeo = new THREE.BoxGeometry(2.3, 0.14, 0.2);
  const trapFrameZGeo = new THREE.BoxGeometry(0.2, 0.14, 2.3);
  const trapCoreGeo = new THREE.BoxGeometry(1.9, 0.08, 1.9);
  const spikeConeGeo = new THREE.ConeGeometry(0.22, 0.72, 4);
  disposables.push(trapFrameXGeo, trapFrameZGeo, trapCoreGeo, spikeConeGeo);

  trapLayout.forEach(([tx, tz, kind, phaseOffset], idx) => {
    const tGroup = new THREE.Group();
    tGroup.position.set(tx, 0.02, tz);

    const frameN = new THREE.Mesh(trapFrameXGeo, trapFrameMat);
    frameN.position.set(0, 0.05, -1.05);
    const frameS = new THREE.Mesh(trapFrameXGeo, trapFrameMat);
    frameS.position.set(0, 0.05, 1.05);
    const frameW = new THREE.Mesh(trapFrameZGeo, trapFrameMat);
    frameW.position.set(-1.05, 0.05, 0);
    const frameE = new THREE.Mesh(trapFrameZGeo, trapFrameMat);
    frameE.position.set(1.05, 0.05, 0);
    tGroup.add(frameN, frameS, frameW, frameE);

    const coreMat = new THREE.MeshStandardMaterial({
      color: kind === 'lava' ? 0x7c2d12 : 0x334155,
      emissive: kind === 'lava' ? 0xea580c : 0x991b1b,
      emissiveIntensity: 0.25,
      roughness: kind === 'lava' ? 0.35 : 0.75,
      metalness: kind === 'lava' ? 0.1 : 0.4,
    });
    disposables.push(coreMat);

    const coreMesh = new THREE.Mesh(trapCoreGeo, coreMat);
    coreMesh.position.y = 0.03;
    tGroup.add(coreMesh);

    let spikesGroup: THREE.Group | undefined;
    if (kind === 'spikes') {
      spikesGroup = new THREE.Group();
      const offsets: Array<[number, number]> = [
        [-0.48, -0.48],
        [0.48, -0.48],
        [-0.48, 0.48],
        [0.48, 0.48],
      ];
      offsets.forEach(([sx, sz]) => {
        const sp = new THREE.Mesh(spikeConeGeo, trapSpikeMat);
        sp.position.set(sx, 0, sz);
        sp.rotation.y = Math.PI / 4;
        spikesGroup!.add(sp);
      });
      spikesGroup.position.y = -0.42;
      tGroup.add(spikesGroup);
    }

    group.add(tGroup);
    traps.push({
      id: `ctrap_${zoneId}_${idx}`,
      kind,
      x: tx,
      z: tz,
      halfW: 1.0,
      phaseOffset,
      group: tGroup,
      coreMat,
      spikesGroup,
      active: false,
    });
  });

  // Zone-specific ambient cave accents
  if (zoneId === 'menara_waktu') {
    const goldMat = palette.getMat(0xfbbf24, 'metal');
    const glowMat = palette.getMat(0x38bdf8, 'emissive');
    const gearGroup = new THREE.Group();
    gearGroup.position.set(0, 6.2, -19.5);
    const gearRing = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.36, 8, 24), goldMat);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.22, 8, 18), glowMat);
    gearGroup.add(gearRing, innerRing);
    gearGroup.userData.animKind = 'spinZ';
    group.add(gearGroup);
    animatables.push(gearGroup);
  }

  // Add the 5 Zone Mission Landmarks (Pool, Corridor Tunnel, Echo Shrine, Bridge, Boss Gate)!
  const doorDefs = ZONE_DOORS[zoneId];
  const doors: DungeonDoorRig[] = doorDefs.map((def) => {
    const dRig = createDungeonDoorRig(def, palette, disposables);
    dRig.orbMesh.userData.animKind = 'bob';
    dRig.orbMesh.userData.baseY = dRig.orbMesh.userData.baseY ?? 4.0;
    dRig.orbMesh.userData.phase = def.index * 0.9;
    animatables.push(dRig.orbMesh);
    group.add(dRig.group);
    cameraOccluders.push(dRig.group);
    return dRig;
  });

  // Exit Portal Gate at South Center (0, 0, 17)
  const exitGate = new THREE.Group();
  exitGate.position.copy(exitPadPos);
  exitGate.userData.dungeonExit = true;

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 3.0, 0.25, 20),
    palette.getMat(0x0ea5e9, 'emissive'),
  );
  pad.position.y = 0.12;
  const archL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.4, 0.8), palette.getMat(0x475569, 'matte'));
  archL.position.set(-2.3, 2.2, 0);
  const archR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.4, 0.8), palette.getMat(0x475569, 'matte'));
  archR.position.set(2.3, 2.2, 0);
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.9, 1.0), palette.getMat(0x334155, 'matte'));
  archTop.position.set(0, 4.6, 0);
  cameraOccluders.push(archL, archR, archTop);
  const exitRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.75, 0.18, 8, 24),
    palette.getMat(0x22d3ee, 'emissive'),
  );
  exitRing.position.set(0, 2.35, 0);
  exitRing.userData.animKind = 'spinZ';
  animatables.push(exitRing);

  exitGate.add(pad, archL, archR, archTop, exitRing);
  group.add(exitGate);

  // Minecraft-style Block Selection Wireframe Highlight
  const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.08, 2.28, 2.08));
  const edgesMat = new THREE.LineBasicMaterial({ color: 0xfef08a });
  const blockHighlight = new THREE.LineSegments(edgesGeo, edgesMat);
  blockHighlight.visible = false;
  group.add(blockHighlight);
  disposables.push(edgesGeo, edgesMat);

  // Ghost Block Placement Preview (when holding Blok Pelindung)
  const placeEdgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.02, 2.22, 2.02));
  const placeEdgesMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
  const blockPlacePreview = new THREE.LineSegments(placeEdgesGeo, placeEdgesMat);
  blockPlacePreview.visible = false;
  group.add(blockPlacePreview);
  disposables.push(placeEdgesGeo, placeEdgesMat);

  // Ghost Torch Placement Preview
  const torchPreview = createCaveTorchMesh(palette);
  torchPreview.scale.setScalar(0.95);
  torchPreview.visible = false;
  group.add(torchPreview);

  // Random Hidden Cave Weapon Chest (spawns in an alcove away from the Hidden Prison!)
  const safeChestSpots: Array<[number, number]> = [
    [-17, 15],
    [17, 15],
    [-17, -2],
    [17, -2],
    caveStory.prisonCorner === 'nw' ? [17, -17] : [-17, -17],
    [-14, 11],
    [14, 11],
  ];
  const [chestX, chestZ] = safeChestSpots[Math.floor(Math.random() * safeChestSpots.length)];
  let chestY = 0;
  for (const p of platforms) {
    if (Math.abs(chestX - p.x) <= p.halfW && Math.abs(chestZ - p.z) <= p.halfD) {
      chestY = Math.max(chestY, p.topY);
    }
  }
  const chestGroup = new THREE.Group();
  chestGroup.position.set(chestX, chestY, chestZ);
  chestGroup.userData.caveWeaponChest = true;

  const chestBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.95, 1.15),
    palette.getMat(0x92400e, 'matte'),
  );
  chestBase.position.y = 0.475;
  chestBase.castShadow = true;
  const chestBand = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 0.2, 1.22),
    palette.getMat(0xfbbf24, 'metal'),
  );
  chestBand.position.y = 0.88;
  const chestOrb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45, 0),
    palette.getMat(0x38bdf8, 'emissive'),
  );
  chestOrb.position.set(0, 1.7, 0);
  chestOrb.userData.animKind = 'bob';
  chestOrb.userData.baseY = 1.7;
  chestOrb.userData.phase = 0.4;
  animatables.push(chestOrb);
  chestGroup.add(chestBase, chestBand, chestOrb);
  group.add(chestGroup);

  const weaponChest: CaveWeaponChestRig = {
    x: chestX,
    y: chestY,
    z: chestZ,
    group: chestGroup,
    orb: chestOrb,
    collected: false,
  };

  // Cave Guardian NPC standing inside the cave entrance foyer
  const guardianPos = new THREE.Vector3(4.8, 0, 11.8);
  const guardianMesh = createZoneNpc(caveStory.guardianId, palette);
  guardianMesh.position.copy(guardianPos);
  guardianMesh.rotation.y = -0.65;
  guardianMesh.userData.caveGuardian = true;
  const guardianAuraMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(caveStory.accentColor),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.72,
  });
  const guardianRingGeo = new THREE.RingGeometry(1.1, 1.42, 22);
  const guardianAura = new THREE.Mesh(guardianRingGeo, guardianAuraMat);
  guardianAura.rotation.x = -Math.PI / 2;
  guardianAura.position.y = 0.07;
  guardianMesh.add(guardianAura);
  disposables.push(guardianAuraMat, guardianRingGeo);
  group.add(guardianMesh);

  // Hidden Prison Cell in the deep corner alcove with Captive Character inside!
  const prisonPos = new THREE.Vector3(prisonX, 0, prisonZ);
  const prisonGroup = new THREE.Group();
  prisonGroup.position.copy(prisonPos);
  prisonGroup.userData.hiddenPrison = true;

  const cellPad = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.22, 3.6),
    palette.getMat(0x334155, 'matte'),
  );
  cellPad.position.y = 0.11;
  cellPad.receiveShadow = true;
  prisonGroup.add(cellPad);

  const prisonBars = new THREE.Group();
  const barMat = palette.getMat(0x64748b, 'metal');
  const prisonLockMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.9,
    roughness: 0.35,
    metalness: 0.4,
  });
  disposables.push(prisonLockMat);

  const barCoords: Array<[number, number]> = [
    [-1.55, -1.55], [-0.55, -1.55], [0.55, -1.55], [1.55, -1.55],
    [-1.55, 1.55], [-0.55, 1.55], [0.55, 1.55], [1.55, 1.55],
    [-1.55, -0.55], [-1.55, 0.55],
    [1.55, -0.55], [1.55, 0.55],
  ];
  barCoords.forEach(([bx, bz]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 0.16), barMat);
    bar.position.set(bx, 1.7, bz);
    bar.castShadow = true;
    prisonBars.add(bar);
  });
  const cageTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.28, 3.5), barMat);
  cageTop.position.y = 3.35;
  const padlock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.78, 0.35), prisonLockMat);
  padlock.position.set(0, 1.65, 1.62);
  prisonBars.add(cageTop, padlock);
  prisonGroup.add(prisonBars);

  const captiveMesh = createCaptiveMesh(caveStory.captiveKind, caveStory.captiveColor, palette);
  captiveMesh.position.set(0, 0.22, 0);
  captiveMesh.rotation.y = caveStory.prisonCorner === 'nw' ? 0.75 : -0.75;
  prisonGroup.add(captiveMesh);
  group.add(prisonGroup);

  // Golden Prison Key (dropped in center boss arena upon boss defeat)
  const prisonKeyGroup = createPrisonKeyMesh(palette);
  prisonKeyGroup.position.set(0, 0, -9);
  prisonKeyGroup.visible = false;
  prisonKeyGroup.userData.prisonKey = true;
  if (prisonKeyGroup.userData.keyPivot) {
    animatables.push(prisonKeyGroup.userData.keyPivot as THREE.Object3D);
  }
  group.add(prisonKeyGroup);

  return {
    group,
    animatables,
    doors,
    exitPadPos,
    exitClickable: exitGate,
    craftingTablePos,
    caveBlocks,
    caveColliders,
    platforms,
    chasms,
    traps,
    blockHighlight,
    blockPlacePreview,
    torchPreview,
    shieldBlockMat,
    shieldBlockGeo: blockGeo,
    crackMaterials,
    crackGeo,
    weaponChest,
    guardianPos,
    guardianMesh,
    guardianAuraMat,
    prisonPos,
    prisonGroup,
    prisonBars,
    prisonLockMat,
    captiveMesh,
    prisonKeyGroup,
    cameraOccluders,
    disposables,
  };
}

// 11. Grand 3D Istana IELTS / Akademi Ujian Hall (Interior #8)
export function createAcademyHallEnvironment(palette: MaterialPalette): AcademyHallRig {
  const group = new THREE.Group();
  const animatables: THREE.Object3D[] = [];
  const cameraOccluders: THREE.Object3D[] = [];
  const exitPadPos = new THREE.Vector3(0, 0, 16);

  const outerFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    palette.getMat(0x1e1b4b, 'matte'),
  );
  outerFloor.rotation.x = -Math.PI / 2;
  outerFloor.position.y = -0.05;
  group.add(outerFloor);

  // Royal Marble Floor
  const marbleFloor = new THREE.Mesh(
    new THREE.BoxGeometry(44, 0.4, 44),
    palette.getMat(0xf8fafc, 'gloss'),
  );
  marbleFloor.position.y = -0.2;
  marbleFloor.receiveShadow = true;
  group.add(marbleFloor);

  // Royal Purple Carpet Runner
  const carpet = new THREE.Mesh(
    new THREE.BoxGeometry(6.5, 0.08, 34),
    palette.getMat(0x6d28d9, 'matte'),
  );
  carpet.position.set(0, 0.04, 1);
  const goldTrim = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.05, 34.4),
    palette.getMat(0xfbbf24, 'metal'),
  );
  goldTrim.position.set(0, 0.02, 1);
  group.add(goldTrim, carpet);

  // Royal Golden Throne Platform at North (Raja Penguji)
  const dais = new THREE.Mesh(
    new THREE.BoxGeometry(9.5, 0.65, 6.2),
    palette.getMat(0xfbbf24, 'metal'),
  );
  dais.position.set(0, 0.32, -14.5);
  group.add(dais);

  // Perimeter Palace Columns
  const pillarMat = palette.getMat(0xe2e8f0, 'matte');
  const goldMat = palette.getMat(0xfbbf24, 'metal');
  const crystalMat = palette.getMat(0xa855f7, 'emissive');
  const colPositions: Array<[number, number]> = [
    [-19, -18],
    [-19, -6],
    [-19, 6],
    [-19, 18],
    [19, -18],
    [19, -6],
    [19, 6],
    [19, 18],
  ];
  colPositions.forEach(([px, pz], idx) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 8.2, 12), pillarMat);
    col.position.set(px, 4.1, pz);
    col.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 2.4), goldMat);
    cap.position.set(px, 8.3, pz);
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), crystalMat);
    orb.position.set(px, 9.4, pz);
    orb.userData.animKind = 'bob';
    orb.userData.baseY = 9.4;
    orb.userData.phase = idx * 0.7;
    animatables.push(orb);
    group.add(col, cap, orb);
    cameraOccluders.push(col, cap);
  });

  // Back Royal Wall
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(44, 6.5, 1.5),
    palette.getMat(0x312e81, 'matte'),
  );
  backWall.position.set(0, 3.25, -21.5);
  group.add(backWall);
  cameraOccluders.push(backWall, dais);

  // Exit Portal back to Hutan Kata
  const exitGate = new THREE.Group();
  exitGate.position.copy(exitPadPos);
  exitGate.userData.academyExit = true;
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.8, 0.25, 20),
    palette.getMat(0x06b6d4, 'emissive'),
  );
  pad.position.y = 0.12;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.18, 8, 24),
    palette.getMat(0x38bdf8, 'emissive'),
  );
  ring.position.set(0, 2.3, 0);
  ring.userData.animKind = 'spinZ';
  animatables.push(ring);
  exitGate.add(pad, ring);
  group.add(exitGate);

  return { group, animatables, exitPadPos, exitClickable: exitGate, cameraOccluders };
}

// 12. First-Person Hand & Held Item Viewmodel (Minecraft-style bottom-right viewmodel)
export interface FirstPersonViewRig {
  root: THREE.Group;
  handPivot: THREE.Group;
  weaponGroup: THREE.Group;
  weaponTipMat: THREE.MeshStandardMaterial;
  pickaxeGroup: THREE.Group;
  pickaxeHeadMat: THREE.MeshStandardMaterial;
  torchGroup: THREE.Group;
  shieldBlockGroup: THREE.Group;
  tntGroup: THREE.Group;
}

export function createFirstPersonViewRig(palette: MaterialPalette): FirstPersonViewRig {
  const root = new THREE.Group();
  const handPivot = new THREE.Group();
  handPivot.position.set(0.42, -0.36, -0.68);
  handPivot.rotation.set(0.28, -0.34, 0.14);
  root.add(handPivot);

  const skin = palette.getMat(0xfed7aa, 'matte');
  const tunic = palette.getMat(0x16a34a, 'matte');

  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.34), tunic);
  sleeve.position.set(0, -0.05, 0.18);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.38), skin);
  arm.position.set(0, 0, -0.08);
  handPivot.add(sleeve, arm);

  // 1) Blaster weapon viewmodel
  const weaponTipMat = new THREE.MeshStandardMaterial({
    color: 0x4fd8ff,
    emissive: 0x4fd8ff,
    emissiveIntensity: 1.3,
    roughness: 0.2,
  });
  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(-0.04, 0.12, -0.24);
  const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.16, 0.38),
    palette.getMat(0x0ea5e9, 'metal'),
  );
  const gunBarrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.18),
    palette.getMat(0x1e293b, 'metal'),
  );
  gunBarrel.position.set(0, 0.03, -0.22);
  const gunTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), weaponTipMat);
  gunTip.position.set(0, 0.03, -0.34);
  weaponGroup.add(gunBody, gunBarrel, gunTip);
  handPivot.add(weaponGroup);

  // 2) Voxel Pickaxe viewmodel (color shifts with Pickaxe Tier!)
  const pickaxeGroup = new THREE.Group();
  pickaxeGroup.position.set(-0.06, 0.18, -0.25);
  pickaxeGroup.rotation.set(-0.4, 0.15, 0.2);
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.48, 0.055),
    palette.getMat(0x92400e, 'matte'),
  );
  const pickaxeHeadMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.45,
    metalness: 0.65,
  });
  const headMain = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.07), pickaxeHeadMat);
  headMain.position.set(0, 0.22, 0);
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.065), pickaxeHeadMat);
  tipL.position.set(-0.2, 0.17, 0);
  const tipR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.065), pickaxeHeadMat);
  tipR.position.set(0.2, 0.17, 0);
  pickaxeGroup.add(shaft, headMain, tipL, tipR);
  pickaxeGroup.visible = false;
  handPivot.add(pickaxeGroup);

  // 3) Voxel Torch viewmodel
  const torchGroup = new THREE.Group();
  torchGroup.position.set(-0.04, 0.16, -0.24);
  torchGroup.rotation.set(-0.2, 0, 0.08);
  const stick = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.42, 0.075),
    palette.getMat(0x78350f, 'matte'),
  );
  const flame = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.13, 0.11),
    palette.getMat(0xfacc15, 'emissive'),
  );
  flame.position.set(0, 0.26, 0);
  torchGroup.add(stick, flame);
  torchGroup.visible = false;
  handPivot.add(torchGroup);

  // 4) Held Voxel Shield Block viewmodel (Place Block)
  const shieldBlockGroup = new THREE.Group();
  shieldBlockGroup.position.set(-0.05, 0.14, -0.26);
  shieldBlockGroup.rotation.set(0.12, 0.35, 0);
  const shieldCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.24, 0.24),
    palette.getMat(0xd97706, 'matte'),
  );
  const shieldCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.08, 0.08),
    palette.getMat(0x38bdf8, 'emissive'),
  );
  shieldBlockGroup.add(shieldCube, shieldCore);
  shieldBlockGroup.visible = false;
  handPivot.add(shieldBlockGroup);

  // 5) Held Voxel TNT Block viewmodel
  const tntGroup = new THREE.Group();
  tntGroup.position.set(-0.05, 0.14, -0.26);
  tntGroup.rotation.set(0.12, 0.35, 0);
  const tntCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.23, 0.23, 0.23),
    palette.getMat(0xdc2626, 'matte'),
  );
  const tntBand = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.08, 0.24),
    palette.getMat(0xf8fafc, 'matte'),
  );
  tntGroup.add(tntCube, tntBand);
  tntGroup.visible = false;
  handPivot.add(tntGroup);

  return {
    root,
    handPivot,
    weaponGroup,
    weaponTipMat,
    pickaxeGroup,
    pickaxeHeadMat,
    torchGroup,
    shieldBlockGroup,
    tntGroup,
  };
}

export function setFirstPersonHeldVisual(
  rig: FirstPersonViewRig,
  mode: 'bare' | 'weapon' | 'pickaxe' | 'torch' | 'shield_block' | 'tnt',
  colorHex = 0x4fd8ff,
  pickaxeTier: 1 | 2 | 3 = 1,
): void {
  rig.weaponGroup.visible = mode === 'weapon';
  rig.pickaxeGroup.visible = mode === 'pickaxe';
  rig.torchGroup.visible = mode === 'torch';
  rig.shieldBlockGroup.visible = mode === 'shield_block';
  rig.tntGroup.visible = mode === 'tnt';
  rig.weaponTipMat.color.setHex(colorHex);
  rig.weaponTipMat.emissive.setHex(colorHex);
  const tierHex = pickaxeTier === 3 ? 0x22d3ee : pickaxeTier === 2 ? 0xe2e8f0 : 0x94a3b8;
  rig.pickaxeHeadMat.color.setHex(tierHex);
}

// 13. Blocky Minecraft-style Voxel Sky Clouds
export function createVoxelClouds(count = 26): THREE.InstancedMesh {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.9,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const x = ((i * 37) % 190) - 95;
    const z = ((i * 53) % 190) - 95;
    const y = 40 + (i % 3) * 2.5;
    const sx = 9 + (i % 4) * 5;
    const sz = 6 + ((i * 3) % 4) * 3.5;
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, 1.4, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

