import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import {
  ACADEMY_NPCS,
  ACADEMY_SHADOWS,
  AMMO_COST,
  BOSSES,
  DAILY_GOAL,
  DIFF_CONFIG,
  DOOR_MINI_MONSTER,
  DOOR_RESTORED_STORY,
  getLevelInfo,
  getRankTitle,
  MAX_AMMO,
  MONSTER_SPAWNS,
  NPC_CATALOG,
  RELICS,
  RIBBONS,
  SAVE_KEY,
  TUNE,
  WEAPON_ORDER,
  WEAPONS,
  ZONE_CAVE_STORIES,
  ZONE_DOORS,
  ZONE_INFO,
} from '../data/diglosaCatalog';
import {
  AreaWaveDeal,
  computeAreaWaveDeal,
  getWordsForZone,
  VOCAB_BY_ID,
  VOCAB_CATALOG,
} from '../data/vocabCatalog';
import {
  BattleContext,
  CameraMode,
  CaveSealContext,
  DungeonZoneState,
  GamePhase,
  GameSettings,
  LearningSessionContext,
  MonsterType,
  PickaxeTier,
  ProjectedLabel,
  RadarBlip,
  RadarBlipKind,
  RadarState,
  RelicId,
  RpgHudSnapshot,
  RpgQuestState,
  StoryDialogState,
  WeaponId,
  WordProgress,
  WorldLocationMode,
  ZoneId,
} from '../types/game';
import { createMaterialPalette, MaterialPalette } from './materials';
import {
  createMinecraftVillageWorld,
  MinecraftVillageRig,
  updateMinecraftVillage,
} from './minecraftVillage';
import {
  AcademyHallRig,
  CaveBlockDef,
  createAcademyHallEnvironment,
  createAreaMists,
  createCaveTntMesh,
  createCaveTorchMesh,
  createDungeonEnvironment,
  createFirstPersonViewRig,
  createHeroAvatar,
  createMonsterMesh,
  createOwlMessengerRig,
  createPortalArch,
  createShooterMesh,
  createStarterWeaponPickup,
  createVoxelClouds,
  createZoneLandmarks,
  createZoneNpc,
  DungeonArenaRig,
  FirstPersonViewRig,
  getZoneForPosition,
  HeroAvatarRig,
  OwlMessengerRig,
  PortalArchRig,
  setFirstPersonHeldVisual,
  setHeroWeaponVisual,
  updateDoorRigVisual,
} from './rpgModels';

interface CollectibleItem {
  active: boolean;
  kind: 'diamond' | 'heart';
  x: number;
  z: number;
  phase: number;
  respawnTimer: number;
}

interface RoamingMonster {
  id: string;
  type: MonsterType;
  name: string;
  zoneId: ZoneId;
  homeX: number;
  homeZ: number;
  x: number;
  y?: number;
  z: number;
  maxHp: number;
  rewardXp: number;
  rewardDiamonds: number;
  rewardScore: number;
  isBoss?: boolean;
  isAmbush?: boolean;
  isCaveMob?: boolean;
  combatOnly?: boolean;
  fuseTimer?: number;
  mobHp?: number;
  maxMobHp?: number;
  aggroActive?: boolean;
  attackCooldown?: number;
  windupTimer?: number;
  lungeTimer?: number;
  hitFlashTimer?: number;
  isAcademyShadow?: boolean;
  academySkill?: 'listening' | 'reading' | 'writing' | 'speaking';
  wordIds?: string[];
  mesh: THREE.Group;
  alive: boolean;
  respawnTimer: number;
  patrolPhase: number;
  angryTimer: number;
  stanceHp?: number;
}

interface CaveActiveTnt {
  x: number;
  y: number;
  z: number;
  timer: number;
  mesh: THREE.Group;
}

interface CaveFallingBoulder {
  x: number;
  z: number;
  timer: number;
  maxTime: number;
  rockMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
}

interface EnemyShooter {
  id: string;
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  hp: number;
  cooldown: number;
  phase: number;
  mesh: THREE.Group;
  alive: boolean;
  respawnTimer: number;
}

interface Projectile3D {
  active: boolean;
  fromPlayer: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  shieldDamage: number;
  pierceLeft: number;
  hitIds: Set<string>;
  life: number;
  mesh: THREE.Mesh;
}

interface ParticleItem {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface SavedStatePayload {
  version: number;
  xp: number;
  hp: number;
  maxHp: number;
  diamonds: number;
  score: number;
  maxStreak: number;
  dailyDate: string;
  dailyCount: number;
  monstersDefeated: number;
  wordProgress: Record<string, WordProgress>;
  activeWeapon: WeaponId;
  ownedWeapons: WeaponId[];
  weaponAmmo: Record<WeaponId, number>;
  starterWeaponPicked: boolean;
  ownedRelics: RelicId[];
  ribbons: ZoneId[];
  liberatedZones: ZoneId[];
  areaTrophies: ZoneId[];
  areaDoorsCleared: Record<ZoneId, number[]>;
  areaDeals: Partial<Record<ZoneId, AreaWaveDeal>>;
  ieltsScores: Record<'listening' | 'reading' | 'writing' | 'speaking' | 'full', number>;
  ieltsCleared: boolean;
  settings: GameSettings;
  introDone: boolean;
  caveIntrosSeen?: ZoneId[];
  defeatedBossZones?: ZoneId[];
  caveShieldBlocksLeft?: number;
  caveTntLeft?: number;
  pickaxeTier?: PickaxeTier;
}

const MAX_COLLECTIBLES = 22;
const MAX_PARTICLES = 110;
const MAX_PROJECTILES = 36;

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export interface RpgEngineCallbacks {
  onHudUpdate: (snapshot: RpgHudSnapshot) => void;
  onStartBattle: (battle: BattleContext) => void;
  onStartLearning: (session: LearningSessionContext) => void;
  onOpenNpcDialogue: (npcId: string) => void;
  onOpenAcademyExam: (skill: 'listening' | 'reading' | 'writing' | 'speaking' | 'full') => void;
  onOpenCaveSeal: (seal: CaveSealContext) => void;
  onOpenCrafting: () => void;
}

export class RpgWorldEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private playerCaveLight: THREE.PointLight;
  private palette: MaterialPalette;
  private hero: HeroAvatarRig;
  private fpViewRig: FirstPersonViewRig;
  private cloudsMesh: THREE.InstancedMesh;
  private owlRig: OwlMessengerRig;
  private portalRig: PortalArchRig;
  private starterPickupMesh: THREE.Group;
  private areaMists: Map<ZoneId, THREE.Mesh>;
  private isSoftwareGl: boolean;
  private callbacks: RpgEngineCallbacks;

  private frameId = 0;
  private lastTimeMs = 0;
  private elapsed = 0;
  private disposed = false;

  // Input & Raycasting
  private heldKeys = new Set<string>();
  private virtualMove = { x: 0, z: 0 };
  private tapMoveTarget: THREE.Vector3 | null = null;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private camRaycaster = new THREE.Raycaster();
  private camOccluderScratch: THREE.Object3D[] = [];
  private currentCamDist = 7.8;
  private lookPointer: {
    id: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null = null;
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private overworldClickables: THREE.Object3D[] = [];
  private dungeonClickables: THREE.Object3D[] = [];
  private academyClickables: THREE.Object3D[] = [];

  // World containers & entities
  private worldMode: WorldLocationMode = 'overworld';
  private overworldGroup: THREE.Group;
  private villageRig!: MinecraftVillageRig;
  private dungeonRig: DungeonArenaRig | null = null;
  private academyRig: AcademyHallRig | null = null;
  private dungeonAnimatables: THREE.Object3D[] = [];
  private dungeonExitPos = new THREE.Vector3(0, 0, 17);
  private dungeonState: DungeonZoneState | null = null;
  private savedOverworldHeroPos = new THREE.Vector3(0, 0, 14);

  // Voxel Cave State
  private caveTorches: Array<{
    x: number;
    z: number;
    mesh: THREE.Group;
    light: THREE.PointLight | null;
  }> = [];
  private caveTorchesLeft = 16;
  private caveShieldBlocksLeft = 4;
  private caveTntLeft = 1;
  private pickaxeTier: PickaxeTier = 1;
  private nearCraftingTable = false;
  private caveBlocksMined = 0;
  private targetedCaveBlock: CaveBlockDef | null = null;
  private chestAmbushTriggered = false;
  private caveBoulders: CaveFallingBoulder[] = [];
  private activeTnts: CaveActiveTnt[] = [];
  private bossBoulderTimer = 0;
  private ambushSeq = 0;

  private npcs: Map<string, { mesh: THREE.Group; alertMesh: THREE.Mesh; x: number; z: number }> = new Map();
  private academyNpcs: Map<string, { mesh: THREE.Group; x: number; z: number }> = new Map();
  private monsters: RoamingMonster[] = [];
  private dungeonMonsters: RoamingMonster[] = [];
  private academyMonsters: RoamingMonster[] = [];
  private shooters: EnemyShooter[] = [];
  private projectiles: Projectile3D[] = [];
  private collectibles: CollectibleItem[] = [];
  private diamondInstanced: THREE.InstancedMesh;
  private heartInstanced: THREE.InstancedMesh;
  private particles: ParticleItem[] = [];
  private particleMesh: THREE.InstancedMesh;
  private waterUniforms = { uTime: { value: 0 } };

  // Hero physics
  private heroPos = new THREE.Vector3(0, 0, 14);
  private heroVel = new THREE.Vector3(0, 0, 0);
  private heroVelY = 0;
  private heroOnGround = true;
  private heroYaw = Math.PI;
  private walkCycle = 0;
  private dashCooldown = 0;
  private fireCooldown = 0;
  private pulseRingTimer = 0;
  private encounterGraceTimer = 0;
  private hpRegenTimer = 0;
  private ketapelRegenTimer = 0;
  private shooterGemsThisArea = 0;

  // Story choreography state
  private introDone = false;
  private caveIntrosSeen = new Set<ZoneId>();
  private defeatedBossZones = new Set<ZoneId>();
  private storyDialog: StoryDialogState | null = null;
  private storyTimer = 0;
  private owlState: 'hidden' | 'fly' | 'land' | 'leave' = 'hidden';
  private cutsceneStartPos = new THREE.Vector3();
  private cutsceneTargetPos = new THREE.Vector3();

  // RPG Progression State
  private phase: GamePhase = 'title';
  private cameraMode: CameraMode = 'third_back';
  private cameraYaw = 0;
  private cameraPitch = 0.22;
  private thirdPersonDist = 7.8;
  private activeHotbarSlot = 0;
  private fpSwingTimer = 0;
  private xp = 0;
  private hp = TUNE.hpStart;
  private maxHp = TUNE.hpStart;
  private diamonds = 1;
  private score = 0;
  private streak = 0;
  private maxStreak = 0;
  private dailyDate = todayKey();
  private dailyCount = 0;
  private monstersDefeated = 0;

  private activeWeapon: WeaponId = 'ketapel';
  private ownedWeapons = new Set<WeaponId>();
  private weaponAmmo: Record<WeaponId, number> = {
    ketapel: 0,
    kerikil: 0,
    emas: 0,
    saus: 0,
    biji: 0,
    kertas: 0,
    jarum: 0,
    kristal: 0,
  };
  private starterWeaponPicked = false;
  private ownedRelics = new Set<RelicId>();
  private ribbons = new Set<ZoneId>();
  private liberatedZones = new Set<ZoneId>();
  private areaTrophies = new Set<ZoneId>();
  private areaDoorsCleared: Record<ZoneId, number[]> = {
    desa_sapaan: [],
    pasar_rasa: [],
    hutan_satwa: [],
    gerbang_kota: [],
    menara_waktu: [],
    gua_portal: [],
  };
  private areaDeals: Partial<Record<ZoneId, AreaWaveDeal>> = {};
  private wordProgress: Record<string, WordProgress> = {};
  private ieltsScores: Record<'listening' | 'reading' | 'writing' | 'speaking' | 'full', number> = {
    listening: 0,
    reading: 0,
    writing: 0,
    speaking: 0,
    full: 0,
  };
  private ieltsCleared = false;
  private settings: GameSettings = {
    difficulty: 'petualang',
    storyLocked: true,
    qtimer: true,
    fxLevel: 'full',
    touchControls: 'auto',
    dpadMode: 'joystick',
  };
  private quests: RpgQuestState[] = [];

  private nearbyNpcId: string | null = null;
  private nearbyMonsterId: string | null = null;
  private nearbyDoorIndex: number | null = null;
  private nearbyDungeonGuardian = false;
  private nearPrisonKey = false;
  private nearHiddenPrison = false;
  private nearPortal = false;
  private nearDungeonExit = false;
  private bannerMessage: string | null = null;
  private bannerTimer = 0;
  private lastHudPushMs = 0;
  private hasSave = false;

  constructor(container: HTMLElement, callbacks: RpgEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x9cd6fc);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0x9cd6fc, 0.0034);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.16, 400);
    this.camera.position.set(0, 30, 44);
    this.scene.add(this.camera);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.42;
    this.controls.minPolarAngle = 0.35;
    this.controls.minDistance = 14;
    this.controls.maxDistance = 88;
    this.controls.target.set(0, 2, 0);
    this.controls.enabled = false;

    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x5c913b, 0.98);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4d6, 1.95);
    this.sunLight.position.set(42, 68, 42);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 175;
    const d = 62;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0xd8b4fe, 0.42);
    this.rimLight.position.set(-40, 28, -45);
    this.scene.add(this.rimLight);

    this.playerCaveLight = new THREE.PointLight(0xffedd5, 0, 16, 1.6);
    this.playerCaveLight.position.set(0, 2.8, 0);
    this.scene.add(this.playerCaveLight);

    this.palette = createMaterialPalette(this.renderer, this.isSoftwareGl);
    this.overworldGroup = new THREE.Group();
    this.scene.add(this.overworldGroup);

    this.buildFantasyTerrain();
    this.overworldGroup.add(createZoneLandmarks(this.palette));

    this.portalRig = createPortalArch(this.palette);
    this.portalRig.root.position.set(2, 0, -33);
    this.portalRig.root.userData.portal = true;
    this.overworldGroup.add(this.portalRig.root);
    this.overworldClickables.push(this.portalRig.root);

    this.areaMists = createAreaMists();
    this.areaMists.forEach((m) => this.overworldGroup.add(m));

    this.starterPickupMesh = createStarterWeaponPickup(this.palette);
    this.starterPickupMesh.position.set(-7, 0, 12);
    this.starterPickupMesh.userData.starterPickup = true;
    this.overworldGroup.add(this.starterPickupMesh);
    this.overworldClickables.push(this.starterPickupMesh);

    this.cloudsMesh = createVoxelClouds(26);
    this.overworldGroup.add(this.cloudsMesh);

    this.hero = createHeroAvatar(this.palette);
    this.hero.root.position.copy(this.heroPos);
    setHeroWeaponVisual(this.hero, WEAPONS.ketapel.colorHex, false);
    this.scene.add(this.hero.root);

    this.fpViewRig = createFirstPersonViewRig(this.palette);
    this.fpViewRig.root.visible = false;
    setFirstPersonHeldVisual(this.fpViewRig, 'bare', WEAPONS.ketapel.colorHex);
    this.camera.add(this.fpViewRig.root);

    this.owlRig = createOwlMessengerRig(this.palette);
    this.owlRig.root.visible = false;
    this.scene.add(this.owlRig.root);

    this.initNpcs();
    this.initOverworldMonsters();
    this.initProjectilePool();

    const dGeo = new THREE.OctahedronGeometry(0.75, 0);
    const dMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.12,
      metalness: 0.35,
    });
    this.diamondInstanced = new THREE.InstancedMesh(dGeo, dMat, MAX_COLLECTIBLES);
    this.diamondInstanced.frustumCulled = false;
    this.overworldGroup.add(this.diamondInstanced);

    const hGeo = new THREE.BoxGeometry(0.85, 0.85, 0.45);
    const hMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.15,
    });
    this.heartInstanced = new THREE.InstancedMesh(hGeo, hMat, MAX_COLLECTIBLES);
    this.heartInstanced.frustumCulled = false;
    this.overworldGroup.add(this.heartInstanced);

    const pGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const pMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
      });
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.checkHasSave();
    this.initDefaultQuests();
    this.spawnCollectibles();
    this.bindEvents();
    this.pushHud(true);

    this.lastTimeMs = performance.now();
    this.scheduleNextTick();
  }

  private checkHasSave(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      this.hasSave = Boolean(raw);
    } catch {
      this.hasSave = false;
    }
  }

  private saveProgress(): void {
    try {
      const payload: SavedStatePayload = {
        version: 1,
        xp: this.xp,
        hp: this.hp,
        maxHp: this.maxHp,
        diamonds: this.diamonds,
        score: this.score,
        maxStreak: this.maxStreak,
        dailyDate: this.dailyDate,
        dailyCount: this.dailyCount,
        monstersDefeated: this.monstersDefeated,
        wordProgress: this.wordProgress,
        activeWeapon: this.activeWeapon,
        ownedWeapons: Array.from(this.ownedWeapons),
        weaponAmmo: { ...this.weaponAmmo },
        starterWeaponPicked: this.starterWeaponPicked,
        ownedRelics: Array.from(this.ownedRelics),
        ribbons: Array.from(this.ribbons),
        liberatedZones: Array.from(this.liberatedZones),
        areaTrophies: Array.from(this.areaTrophies),
        areaDoorsCleared: this.areaDoorsCleared,
        areaDeals: this.areaDeals,
        ieltsScores: this.ieltsScores,
        ieltsCleared: this.ieltsCleared,
        settings: this.settings,
        introDone: this.introDone,
        caveIntrosSeen: Array.from(this.caveIntrosSeen),
        defeatedBossZones: Array.from(this.defeatedBossZones),
        caveShieldBlocksLeft: this.caveShieldBlocksLeft,
        caveTntLeft: this.caveTntLeft,
        pickaxeTier: this.pickaxeTier,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      this.hasSave = true;
    } catch {
      // ignore storage quota errors
    }
  }

  private loadProgress(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as SavedStatePayload;
      this.xp = data.xp || 0;
      this.maxHp = data.maxHp || TUNE.hpStart;
      this.hp = Math.max(1, Math.min(this.maxHp, data.hp || this.maxHp));
      this.diamonds = data.diamonds ?? 1;
      this.score = data.score || 0;
      this.maxStreak = data.maxStreak || 0;
      const today = todayKey();
      if (data.dailyDate === today) {
        this.dailyDate = today;
        this.dailyCount = data.dailyCount || 0;
      } else {
        this.dailyDate = today;
        this.dailyCount = 0;
        // Daily +6 ketapel ammo bonus
        if (data.starterWeaponPicked) {
          data.weaponAmmo.ketapel = Math.min(MAX_AMMO, (data.weaponAmmo.ketapel || 0) + 6);
        }
      }
      this.monstersDefeated = data.monstersDefeated || 0;
      this.wordProgress = data.wordProgress || {};
      this.activeWeapon = data.activeWeapon || 'ketapel';
      this.ownedWeapons = new Set(data.ownedWeapons || []);
      this.weaponAmmo = {
        ketapel: data.weaponAmmo?.ketapel || 0,
        kerikil: data.weaponAmmo?.kerikil || 0,
        emas: data.weaponAmmo?.emas || 0,
        saus: data.weaponAmmo?.saus || 0,
        biji: data.weaponAmmo?.biji || 0,
        kertas: data.weaponAmmo?.kertas || 0,
        jarum: data.weaponAmmo?.jarum || 0,
        kristal: data.weaponAmmo?.kristal || 0,
      };
      this.caveShieldBlocksLeft = data.caveShieldBlocksLeft ?? 4;
      this.caveTntLeft = data.caveTntLeft ?? 1;
      this.pickaxeTier = data.pickaxeTier ?? 1;
      this.starterWeaponPicked = Boolean(data.starterWeaponPicked);
      this.ownedRelics = new Set(data.ownedRelics || []);
      this.ribbons = new Set(data.ribbons || []);
      this.liberatedZones = new Set(data.liberatedZones || []);
      this.areaTrophies = new Set(data.areaTrophies || []);
      this.areaDoorsCleared = data.areaDoorsCleared || {
        desa_sapaan: [],
        pasar_rasa: [],
        hutan_satwa: [],
        gerbang_kota: [],
        menara_waktu: [],
        gua_portal: [],
      };
      this.areaDeals = data.areaDeals || {};
      this.ieltsScores = data.ieltsScores || {
        listening: 0,
        reading: 0,
        writing: 0,
        speaking: 0,
        full: 0,
      };
      this.ieltsCleared = Boolean(data.ieltsCleared);
      if (data.settings) this.settings = { ...this.settings, ...data.settings };
      this.introDone = Boolean(data.introDone);
      this.caveIntrosSeen = new Set(data.caveIntrosSeen || []);
      this.defeatedBossZones = new Set(data.defeatedBossZones || []);
      return true;
    } catch {
      return false;
    }
  }

  private buildFantasyTerrain(): void {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 340), this.palette.meadowMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.overworldGroup.add(ground);

    const makeTrail = (pts: THREE.Vector3[], width: number) => {
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
      const samples = curve.getSpacedPoints(48);
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      const up = new THREE.Vector3(0, 1, 0);
      const tan = new THREE.Vector3();
      const side = new THREE.Vector3();

      for (let i = 0; i < samples.length; i++) {
        const p = samples[i];
        const next = samples[Math.min(samples.length - 1, i + 1)];
        const prev = samples[Math.max(0, i - 1)];
        tan.subVectors(next, prev).normalize();
        side.crossVectors(up, tan).normalize();
        const l = p.clone().addScaledVector(side, width * 0.5);
        const r = p.clone().addScaledVector(side, -width * 0.5);
        positions.push(l.x, 0.04, l.z, r.x, 0.04, r.z);
        uvs.push(i / 4, 0, i / 4, 1);
        if (i < samples.length - 1) {
          const b = i * 2;
          indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, this.palette.pathMat);
      mesh.receiveShadow = true;
      this.overworldGroup.add(mesh);
    };

    makeTrail(
      [new THREE.Vector3(0, 0, 38), new THREE.Vector3(0, 0, 10), new THREE.Vector3(2, 0, -28)],
      3.8,
    );
    makeTrail(
      [new THREE.Vector3(0, 0, 10), new THREE.Vector3(-19, 0, 6), new THREE.Vector3(-21, 0, -19)],
      3.4,
    );
    makeTrail([new THREE.Vector3(-19, 0, 6), new THREE.Vector3(-22, 0, 26)], 3.2);
    makeTrail(
      [new THREE.Vector3(0, 0, 10), new THREE.Vector3(17, 0, 4), new THREE.Vector3(23, 0, -12)],
      3.4,
    );

    const pondMat = this.palette.waterMat.clone();
    pondMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.waterUniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           transformed.y += sin(position.x * 1.1 + uTime * 2.5) * 0.05;`,
        );
    };
    const pondRim = new THREE.Mesh(
      new THREE.CylinderGeometry(8.6, 9.2, 0.35, 22),
      this.palette.getPixelMat('cobble'),
    );
    pondRim.position.set(-41, 0.14, -10);
    const pondWater = new THREE.Mesh(new THREE.CylinderGeometry(7.8, 7.8, 0.38, 22), pondMat);
    pondWater.position.set(-41, 0.18, -10);
    const cliff = new THREE.Mesh(new THREE.BoxGeometry(8, 7.5, 6), this.palette.getPixelMat('cobble'));
    cliff.position.set(-47, 3.7, -14);
    cliff.castShadow = true;
    const cliffCap = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.0, 6.2), this.palette.getPixelMat('grass_side'));
    cliffCap.position.set(-47, 7.6, -14);
    cliffCap.castShadow = true;
    const cascade = new THREE.Mesh(new THREE.BoxGeometry(2.6, 7.0, 1.2), this.palette.getMat(0x38bdf8, 'emissive'));
    cascade.position.set(-45, 3.5, -11);
    this.overworldGroup.add(pondRim, pondWater, cliff, cliffCap, cascade);

    // Living Minecraft Village, Villagers, Iron Golems, Farm, Market, Pillager Outpost & Forest
    this.villageRig = createMinecraftVillageWorld(this.palette);
    this.overworldGroup.add(this.villageRig.group);
    this.overworldClickables.push(...this.villageRig.clickables);
  }

  private initNpcs(): void {
    const alertGeo = new THREE.OctahedronGeometry(0.42, 0);
    const alertMat = this.palette.getMat(0xfacc15, 'emissive');

    for (const def of NPC_CATALOG) {
      const mesh = createZoneNpc(def.id, this.palette);
      mesh.position.set(def.x, 0, def.z);
      mesh.rotation.y = def.rotationY;
      mesh.userData.npcId = def.id;
      this.overworldGroup.add(mesh);
      this.overworldClickables.push(mesh);

      const alertMesh = new THREE.Mesh(alertGeo, alertMat);
      alertMesh.position.set(def.x, 4.4, def.z);
      this.overworldGroup.add(alertMesh);

      this.npcs.set(def.id, { mesh, alertMesh, x: def.x, z: def.z });
    }
  }

  private initOverworldMonsters(): void {
    for (const m of MONSTER_SPAWNS) {
      const mesh = createMonsterMesh(m.type, this.palette);
      mesh.position.set(m.x, 0, m.z);
      mesh.userData.monsterId = m.id;
      this.overworldGroup.add(mesh);
      this.overworldClickables.push(mesh);

      this.monsters.push({
        id: m.id,
        type: m.type,
        name: m.name,
        zoneId: m.zoneId,
        homeX: m.x,
        homeZ: m.z,
        x: m.x,
        z: m.z,
        maxHp: m.maxHp,
        rewardXp: m.rewardXp,
        rewardDiamonds: m.rewardDiamonds,
        rewardScore: m.rewardScore,
        mesh,
        alive: true,
        respawnTimer: 0,
        patrolPhase: Math.random() * Math.PI * 2,
        angryTimer: 0,
      });
    }
  }

  private initProjectilePool(): void {
    const geo = new THREE.OctahedronGeometry(0.32, 0);
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x4fd8ff });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        fromPlayer: true,
        x: 0,
        z: 0,
        vx: 0,
        vz: 0,
        damage: 1,
        shieldDamage: 1,
        pierceLeft: 0,
        hitIds: new Set(),
        life: 0,
        mesh,
      });
    }
  }

  private syncShootersForDifficulty(): void {
    // Clear previous shooters
    for (const s of this.shooters) {
      if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
    }
    this.shooters = [];

    const maxCount = DIFF_CONFIG[this.settings.difficulty].maxShooters;
    if (maxCount <= 0) return;

    const coords: Array<[number, number]> =
      this.worldMode === 'overworld'
        ? [
            [-11, -12],
            [14, 14],
          ]
        : this.worldMode === 'dungeon'
        ? [
            [-10, -10],
            [10, -10],
          ]
        : [
            [-12, 2],
            [12, 2],
          ];

    const parent =
      this.worldMode === 'dungeon' && this.dungeonRig
        ? this.dungeonRig.group
        : this.worldMode === 'academy' && this.academyRig
        ? this.academyRig.group
        : this.overworldGroup;

    for (let i = 0; i < maxCount; i++) {
      const [sx, sz] = coords[i % coords.length];
      const mesh = createShooterMesh(this.palette);
      mesh.position.set(sx, 0, sz);
      parent.add(mesh);
      this.shooters.push({
        id: `shooter_${this.worldMode}_${i}`,
        x: sx,
        z: sz,
        homeX: sx,
        homeZ: sz,
        hp: 3,
        cooldown: 1.5 + i * 0.7,
        phase: i * 1.4,
        mesh,
        alive: true,
        respawnTimer: 0,
      });
    }
  }

  private initDefaultQuests(): void {
    this.quests = NPC_CATALOG.map((npc) => ({
      id: `quest_${npc.id}`,
      npcId: npc.id,
      npcName: npc.name,
      zoneId: npc.zoneId as ZoneId,
      zoneName: npc.zoneName,
      title: npc.questTitle,
      type: npc.questType,
      target: npc.questTarget,
      progress: this.liberatedZones.has(npc.zoneId as ZoneId) ? 1 : 0,
      rewardXp: npc.rewardXp,
      rewardDiamonds: npc.rewardDiamonds,
      accepted: true,
      claimed: this.liberatedZones.has(npc.zoneId as ZoneId),
    }));
  }

  private spawnCollectibles(): void {
    this.collectibles = [];
    const spots: Array<[number, number, 'diamond' | 'heart']> = [
      [-10, 8, 'diamond'],
      [-16, 16, 'diamond'],
      [-8, 22, 'heart'],
      [8, 24, 'diamond'],
      [14, 10, 'diamond'],
      [16, -4, 'heart'],
      [8, -12, 'diamond'],
      [-8, -10, 'diamond'],
      [-16, -8, 'heart'],
      [-14, -22, 'diamond'],
      [16, -20, 'diamond'],
      [0, -2, 'diamond'],
    ];

    for (let i = 0; i < MAX_COLLECTIBLES; i++) {
      if (i < spots.length) {
        this.collectibles.push({
          active: true,
          kind: spots[i][2],
          x: spots[i][0],
          z: spots[i][1],
          phase: i * 0.8,
          respawnTimer: 0,
        });
      } else {
        this.collectibles.push({
          active: false,
          kind: 'diamond',
          x: 0,
          z: 0,
          phase: i,
          respawnTimer: 0,
        });
      }
    }
  }

  private refreshAreaMists(): void {
    this.areaMists.forEach((mist, zId) => {
      mist.visible = !this.liberatedZones.has(zId);
    });
  }

  private refreshWeaponVisual(): void {
    const w = WEAPONS[this.activeWeapon];
    const hasEquippedWeapon =
      this.activeHotbarSlot <= 7 && this.ownedWeapons.has(this.activeWeapon);
    setHeroWeaponVisual(this.hero, w.colorHex, hasEquippedWeapon);

    if (this.activeHotbarSlot === 8) {
      setFirstPersonHeldVisual(this.fpViewRig, 'pickaxe', w.colorHex, this.pickaxeTier);
    } else if (this.activeHotbarSlot === 9) {
      setFirstPersonHeldVisual(this.fpViewRig, 'torch', w.colorHex, this.pickaxeTier);
    } else if (this.activeHotbarSlot === 10) {
      setFirstPersonHeldVisual(this.fpViewRig, 'shield_block', w.colorHex, this.pickaxeTier);
    } else if (this.activeHotbarSlot === 11) {
      setFirstPersonHeldVisual(this.fpViewRig, 'tnt', w.colorHex, this.pickaxeTier);
    } else if (hasEquippedWeapon) {
      setFirstPersonHeldVisual(this.fpViewRig, 'weapon', w.colorHex, this.pickaxeTier);
    } else {
      setFirstPersonHeldVisual(this.fpViewRig, 'bare', w.colorHex, this.pickaxeTier);
    }

    this.starterPickupMesh.visible = !this.starterWeaponPicked;
  }

  public selectHotbarSlot(slotIndex: number): void {
    const idx = Math.max(0, Math.min(11, Math.floor(slotIndex)));
    this.activeHotbarSlot = idx;
    if (idx <= 7) {
      const wId = WEAPON_ORDER[idx];
      if (wId && this.ownedWeapons.has(wId)) {
        this.activeWeapon = wId;
      }
    }
    this.fpSwingTimer = 0.16;
    this.refreshWeaponVisual();
    soundEngine.playPick();
    this.saveProgress();
    this.pushHud(true);
  }

  private applyCameraVisibilityAndControls(): void {
    const isPlaying = this.phase === 'playing';
    const inFirstPerson = isPlaying && this.cameraMode === 'first_person';
    this.hero.body.visible = !inFirstPerson;
    this.fpViewRig.root.visible = inFirstPerson;
    this.controls.enabled = isPlaying && this.cameraMode === 'orbit';
  }

  private rayIntersectAabbDist(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number,
  ): number | null {
    let tMin = 0.05;
    let tMax = maxDist;
    const checkAxis = (o: number, d: number, mn: number, mx: number): boolean => {
      if (Math.abs(d) < 1e-6) {
        return o >= mn && o <= mx;
      }
      let t1 = (mn - o) / d;
      let t2 = (mx - o) / d;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      return tMin <= tMax;
    };
    if (!checkAxis(ox, dx, minX, maxX)) return null;
    if (!checkAxis(oy, dy, minY, maxY)) return null;
    if (!checkAxis(oz, dz, minZ, maxZ)) return null;
    return tMin <= maxDist ? tMin : null;
  }

  private computeSpringArmDist(
    originX: number,
    originY: number,
    originZ: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    desiredDist: number,
  ): number {
    let safeDist = desiredDist;

    // Prevent camera from dipping below the floor
    const minCamY = 0.78;
    if (dirY < -0.01 && originY + dirY * safeDist < minCamY) {
      safeDist = Math.min(safeDist, Math.max(1.2, (minCamY - originY) / dirY));
    }

    if (this.worldMode === 'dungeon' && this.dungeonRig) {
      // Keep camera cleanly below cavern ceiling (9.8)
      const maxCamY = 8.95;
      if (dirY > 0.01 && originY + dirY * safeDist > maxCamY) {
        safeDist = Math.min(safeDist, Math.max(1.2, (maxCamY - originY) / dirY));
      }

      this.camOccluderScratch.length = 0;
      for (const obj of this.dungeonRig.cameraOccluders) {
        this.camOccluderScratch.push(obj);
      }
      for (const blk of this.dungeonRig.caveBlocks) {
        if (blk.alive) this.camOccluderScratch.push(blk.mesh);
      }
      if (this.dungeonRig.prisonBars.visible) {
        this.camOccluderScratch.push(this.dungeonRig.prisonBars);
      }

      _v1.set(originX, originY, originZ);
      _v2.set(dirX, dirY, dirZ).normalize();
      this.camRaycaster.near = 0.15;
      this.camRaycaster.far = safeDist + 0.55;
      this.camRaycaster.set(_v1, _v2);

      const hits = this.camRaycaster.intersectObjects(this.camOccluderScratch, true);
      if (hits.length > 0) {
        safeDist = Math.min(safeDist, Math.max(1.15, hits[0].distance - 0.52));
      }
    } else if (this.worldMode === 'academy' && this.academyRig) {
      _v1.set(originX, originY, originZ);
      _v2.set(dirX, dirY, dirZ).normalize();
      this.camRaycaster.near = 0.15;
      this.camRaycaster.far = safeDist + 0.55;
      this.camRaycaster.set(_v1, _v2);
      const hits = this.camRaycaster.intersectObjects(this.academyRig.cameraOccluders, true);
      if (hits.length > 0) {
        safeDist = Math.min(safeDist, Math.max(1.2, hits[0].distance - 0.52));
      }
    } else if (this.worldMode === 'overworld') {
      for (const obs of this.villageRig.obstacles) {
        if (obs.halfW < 1.25 && obs.halfD < 1.25) continue;
        const h = obs.halfW >= 2.4 ? 6.2 : 3.8;
        const hit = this.rayIntersectAabbDist(
          originX,
          originY,
          originZ,
          dirX,
          dirY,
          dirZ,
          safeDist + 0.5,
          obs.x - obs.halfW,
          obs.x + obs.halfW,
          0,
          h,
          obs.z - obs.halfD,
          obs.z + obs.halfD,
        );
        if (hit !== null) {
          safeDist = Math.min(safeDist, Math.max(1.25, hit - 0.5));
        }
      }
      // Portal Arch stone pillars at (2 +- 3.9, -33)
      const portalPillars = [-1.9, 5.9];
      for (const px of portalPillars) {
        const hit = this.rayIntersectAabbDist(
          originX,
          originY,
          originZ,
          dirX,
          dirY,
          dirZ,
          safeDist + 0.5,
          px - 1.15,
          px + 1.15,
          0,
          7.6,
          -34.2,
          -31.8,
        );
        if (hit !== null) {
          safeDist = Math.min(safeDist, Math.max(1.25, hit - 0.5));
        }
      }
    }

    return safeDist;
  }

  private snapCameraBehindHero(): void {
    this.cameraYaw = 0;
    this.cameraPitch = 0.22;
    const sinY = Math.sin(this.cameraYaw);
    const cosY = Math.cos(this.cameraYaw);
    const cosP = Math.cos(this.cameraPitch);
    const sinP = Math.sin(this.cameraPitch);
    const targetY = this.heroPos.y + 1.92;
    const baseDist =
      this.worldMode === 'dungeon' ? Math.min(this.thirdPersonDist, 6.2) : this.thirdPersonDist;
    const dirX = sinY * cosP;
    const dirY = sinP;
    const dirZ = cosY * cosP;
    const safeDist = this.computeSpringArmDist(
      this.heroPos.x,
      targetY,
      this.heroPos.z,
      dirX,
      dirY,
      dirZ,
      baseDist,
    );
    this.currentCamDist = safeDist;
    this.camera.position.set(
      this.heroPos.x + dirX * safeDist,
      targetY + dirY * safeDist,
      this.heroPos.z + dirZ * safeDist,
    );
    this.controls.target.set(this.heroPos.x, targetY, this.heroPos.z);
    this.camera.lookAt(this.heroPos.x, targetY, this.heroPos.z);
  }

  public continueGame(): void {
    if (!this.loadProgress()) {
      this.startNewGame();
      return;
    }
    this.clearSubScenes();
    this.worldMode = 'overworld';
    this.overworldGroup.visible = true;
    this.phase = 'playing';
    this.storyDialog = null;
    this.owlRig.root.visible = false;
    this.owlState = 'hidden';

    const eqIdx = WEAPON_ORDER.indexOf(this.activeWeapon);
    this.activeHotbarSlot = eqIdx >= 0 ? eqIdx : 0;

    this.initDefaultQuests();
    this.spawnCollectibles();
    this.refreshAreaMists();
    this.refreshWeaponVisual();
    this.syncShootersForDifficulty();
    this.syncOverworldMonstersByDiff();

    this.heroPos.set(0, 0, 14);
    this.savedOverworldHeroPos.copy(this.heroPos);
    this.heroVel.set(0, 0, 0);
    this.heroVelY = 0;
    this.heroOnGround = true;
    this.tapMoveTarget = null;
    this.heroYaw = Math.PI;
    this.encounterGraceTimer = 2.0;

    if (this.cameraMode === 'orbit') this.cameraMode = 'third_back';
    this.applyCameraVisibilityAndControls();
    this.snapCameraBehindHero();

    this.showBanner('Selamat datang kembali, Hoot! Lanjutkan petualanganmu!', 3.6);
    soundEngine.playWin();
    this.pushHud(true);
  }

  public startNewGame(): void {
    this.clearSubScenes();
    this.worldMode = 'overworld';
    this.overworldGroup.visible = true;

    this.xp = 0;
    this.hp = TUNE.hpStart;
    this.maxHp = TUNE.hpStart;
    this.diamonds = 1;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.dailyDate = todayKey();
    this.dailyCount = 0;
    this.monstersDefeated = 0;
    this.ieltsCleared = false;
    this.wordProgress = {};
    this.activeWeapon = 'ketapel';
    this.activeHotbarSlot = 0;
    this.ownedWeapons.clear();
    this.weaponAmmo = {
      ketapel: 0,
      kerikil: 0,
      emas: 0,
      saus: 0,
      biji: 0,
      kertas: 0,
      jarum: 0,
      kristal: 0,
    };
    this.caveTorchesLeft = 16;
    this.caveShieldBlocksLeft = 4;
    this.caveTntLeft = 1;
    this.pickaxeTier = 1;
    this.starterWeaponPicked = false;
    this.ownedRelics.clear();
    this.ribbons.clear();
    this.liberatedZones.clear();
    this.areaTrophies.clear();
    this.areaDoorsCleared = {
      desa_sapaan: [],
      pasar_rasa: [],
      hutan_satwa: [],
      gerbang_kota: [],
      menara_waktu: [],
      gua_portal: [],
    };
    this.areaDeals = {};
    this.ieltsScores = { listening: 0, reading: 0, writing: 0, speaking: 0, full: 0 };
    this.introDone = false;
    this.caveIntrosSeen.clear();
    this.defeatedBossZones.clear();

    this.initDefaultQuests();
    this.spawnCollectibles();
    this.refreshAreaMists();
    this.refreshWeaponVisual();
    this.syncShootersForDifficulty();
    this.syncOverworldMonstersByDiff();

    this.heroPos.set(0, 0, 14);
    this.savedOverworldHeroPos.copy(this.heroPos);
    this.heroVel.set(0, 0, 0);
    this.heroVelY = 0;
    this.heroOnGround = true;
    this.tapMoveTarget = null;
    this.heroYaw = Math.PI;
    this.encounterGraceTimer = 3.0;

    this.cameraMode = 'third_back';
    this.applyCameraVisibilityAndControls();
    this.snapCameraBehindHero();

    // Begin Bab 4 Opening Story Sequence!
    this.startOpeningStory();
    this.saveProgress();
  }

  private startOpeningStory(): void {
    this.phase = 'story';
    this.applyCameraVisibilityAndControls();
    this.storyTimer = 0;
    this.owlState = 'fly';
    this.owlRig.root.visible = true;
    this.owlRig.envelope.visible = true;
    this.owlRig.root.position.set(-28, 12, 16);
    this.storyDialog = {
      kind: 'opening',
      step: 0,
      speakerName: 'Prolog · Serangan Malam Hari',
      speakerRole: 'Istana Kerajaan Kata · Hutan Kata',
      textEn: 'Armed shadow monsters raided the Palace in the dead of night, shattered the Royal Crown into 6 shards, and stole English words across the kingdom.',
      textId: 'Pada suatu malam gelap, monster bayangan bersenjata menyerbu Istana Kerajaan Kata, memecah Mahkota Kerajaan menjadi enam keping, dan mencuri kata Bahasa Inggris. Seekor burung hantu pos melintas menjatuhkan surat bersampul merah...',
      accentColor: '#f59e0b',
    };
    soundEngine.playDoor();
    this.pushHud(true);
  }

  public advanceStory(): void {
    if (!this.storyDialog) return;

    if (this.storyDialog.kind === 'opening') {
      const nextStep = this.storyDialog.step + 1;
      if (nextStep === 1) {
        // Surat bersampul merah dari Lila (adik kandung Hoot)
        this.owlRig.envelope.visible = false;
        this.storyDialog = {
          kind: 'opening',
          step: 1,
          speakerName: 'Lila (Surat Bersampul Merah)',
          speakerRole: 'Adik Kandung Hoot · Di Balik Pintu Ungu',
          textEn: 'Dear brother Hoot, monsters attacked the palace and shattered the crown! I hid behind the Purple Gate with Raja Aksara—I am scared and waiting for you.',
          textId: 'Kak Hoot, monster menyerang istana malam itu dan memecah mahkota! Aku dan Raja Aksara berlindung di balik Pintu Ungu di puncak hutan. Aku takut, Kak—aku menunggumu.',
          accentColor: '#e11d48',
        };
        soundEngine.speakEnglish('Dear brother Hoot, please save our kingdom and meet me at the palace!');
      } else if (nextStep === 2) {
        // Hoot runs to Portal Ungu & Raja Aksara speaks
        this.heroPos.set(2, 0, -24);
        this.heroYaw = Math.PI;
        this.hero.root.position.copy(this.heroPos);
        this.controls.target.set(2, 2.5, -28);
        this.camera.position.set(2, 19, -8);
        this.owlState = 'land';
        this.owlRig.root.position.set(-1.5, 4.5, -23);
        this.storyDialog = {
          kind: 'opening',
          step: 2,
          speakerName: 'Raja Aksara',
          speakerRole: 'Raja Kerajaan Kata · Puncak Tangga Batu',
          textEn: 'Only a few words remain inside the palace. Six crown shards are scattered across 6 regions, each guarded by a mighty boss monster!',
          textId: 'Hanya tersisa sedikit kata di istana, sementara enam pecahan mahkota tersebar di enam wilayah yang dijaga monster bos besar. Bebaskan keenam wilayah untuk memulihkan Kerajaan Kata!',
          accentColor: '#8b5cf6',
        };
        soundEngine.speakEnglish('Six crown shards are scattered across six regions. Free them all!');
      } else if (nextStep === 3) {
        // Owl hint + Senjata Pemula + 6 Pita Merah Lila
        this.owlRig.root.position.set(0.5, 1.8, -22.5);
        this.storyDialog = {
          kind: 'opening',
          step: 3,
          speakerName: 'Burung Hantu Pembimbing',
          speakerRole: 'Pesan Terakhir Sebelum Berangkat',
          textEn: 'You have no weapon yet! Find your Starter Weapon lying between hearts and diamonds in the meadow grass, follow Lila’s 6 secret red ribbons, and march to the Palace!',
          textId: 'Kamu belum memiliki senjata! Carilah Senjata Pemula yang terjatuh di antara hati dan berlian di rumput Hutan Kata. Di sepanjang enam wilayah nanti, temukan juga 6 helai pita merah penyemangat yang diam-diam ditinggalkan Lila.',
          accentColor: '#10b981',
        };
      } else {
        this.finishOpeningStory(false);
      }
      this.pushHud(true);
      return;
    }

    if (this.storyDialog.kind === 'dungeon_intro') {
      const zId = this.storyDialog.zoneId!;
      const story = ZONE_CAVE_STORIES[zId];
      const nextStep = this.storyDialog.step + 1;
      if (nextStep < story.introSteps.length) {
        const s = story.introSteps[nextStep];
        this.storyDialog = {
          kind: 'dungeon_intro',
          step: nextStep,
          zoneId: zId,
          speakerName: s.speakerName,
          speakerRole: s.speakerRole,
          textEn: s.textEn,
          textId: s.textId,
          accentColor: story.accentColor,
        };
        if (zId !== 'gua_portal' || nextStep !== 1) {
          soundEngine.speakEnglish(s.textEn);
        }
        this.pushHud(true);
      } else {
        this.finishDungeonIntroCutscene();
      }
      return;
    }

    if (this.storyDialog.kind === 'dungeon_rescue') {
      const zId = this.storyDialog.zoneId!;
      const story = ZONE_CAVE_STORIES[zId];
      const boss = BOSSES[zId];
      const rb = RIBBONS[zId];
      const wDef = WEAPONS[boss.rewardWeapon];
      const nextStep = this.storyDialog.step + 1;

      if (nextStep === 1) {
        if (this.dungeonRig) {
          this.dungeonRig.guardianAuraMat.color.setHex(0x22c55e);
        }
        this.storyDialog = {
          kind: 'dungeon_rescue',
          step: 1,
          zoneId: zId,
          speakerName: `${story.guardianName} (Suara Pulih!)`,
          speakerRole: `Penjaga ${ZONE_INFO[zId].name} · Reuni Keluarga`,
          textEn: story.rescueGuardianEn,
          textId: story.rescueGuardianId,
          accentColor: '#10b981',
        };
        soundEngine.playWin();
        soundEngine.speakEnglish(story.rescueGuardianEn);
        this.pushHud(true);
      } else if (nextStep === 2) {
        this.finalizeDungeonLiberation(zId);
        this.storyDialog = {
          kind: 'dungeon_rescue',
          step: 2,
          zoneId: zId,
          speakerName: 'Hadiah Kebebasan & Pita Merah Lila',
          speakerRole: `${ZONE_INFO[zId].name} Bebas · Pecahan Mahkota ${rb.number}/6`,
          textEn: `Area liberated! Earned Crown Shard #${rb.number}/6, ${RELICS[boss.rewardRelic].name}, and ${wDef.name}!`,
          textId: `${story.captiveName} kembali bersama ${story.guardianName}! Gua kini terang benderang dan bebas dari bayangan monster.`,
          accentColor: '#e11d48',
          ribbonName: rb.name,
          ribbonQuote: rb.quote,
          rewardSummary: `Pecahan Mahkota #${rb.number}/6 · ${RELICS[boss.rewardRelic].name} · ${wDef.name} (+Peluru) · +5 💎 · +180 XP`,
        };
        soundEngine.playFanfare();
        this.pushHud(true);
      } else {
        this.finishDungeonRescueCutscene(zId);
      }
      return;
    }

    if (this.storyDialog.kind === 'area_cleared') {
      this.storyDialog = null;
      this.phase = 'playing';
      this.pushHud(true);
      return;
    }
  }

  public skipStory(): void {
    if (!this.storyDialog) return;
    if (this.storyDialog.kind === 'opening') {
      this.finishOpeningStory(true);
    } else if (this.storyDialog.kind === 'dungeon_intro') {
      this.finishDungeonIntroCutscene();
    } else if (this.storyDialog.kind === 'dungeon_rescue') {
      this.finishDungeonRescueCutscene(this.storyDialog.zoneId);
    }
  }

  public skipOpeningStory(): void {
    this.skipStory();
  }

  private startDungeonIntroCutscene(zoneId: ZoneId): void {
    const story = ZONE_CAVE_STORIES[zoneId];
    const s0 = story.introSteps[0];
    this.phase = 'story';
    this.heldKeys.clear();
    this.applyCameraVisibilityAndControls();
    this.storyTimer = 0;

    this.heroPos.set(0, 0, 16.2);
    this.cutsceneStartPos.set(0, 0, 16.2);
    this.cutsceneTargetPos.set(2.4, 0, 12.6);
    this.heroYaw = Math.atan2(2.4, 12.6 - 16.2);
    this.hero.root.position.copy(this.heroPos);
    this.hero.body.rotation.y = this.heroYaw;

    this.camera.position.set(-2.2, 4.0, 18.2);
    this.controls.target.set(2.8, 1.8, 12.4);
    this.controls.update();

    this.storyDialog = {
      kind: 'dungeon_intro',
      step: 0,
      zoneId,
      speakerName: s0.speakerName,
      speakerRole: s0.speakerRole,
      textEn: s0.textEn,
      textId: s0.textId,
      accentColor: story.accentColor,
    };
    soundEngine.playDoor();
    this.pushHud(true);
  }

  private finishDungeonIntroCutscene(): void {
    const zId = this.storyDialog?.zoneId || this.dungeonState?.zoneId;
    if (zId) this.caveIntrosSeen.add(zId);
    this.storyDialog = null;
    this.phase = 'playing';
    this.heroPos.set(2.4, 0, 12.6);
    this.heroVel.set(0, 0, 0);
    this.heroVelY = 0;
    this.heroOnGround = true;
    this.hero.root.position.copy(this.heroPos);
    this.hero.leftLeg.rotation.x = 0;
    this.hero.rightLeg.rotation.x = 0;
    this.hero.leftArm.rotation.x = 0;
    this.hero.rightArm.rotation.x = 0;
    this.hero.body.position.y = 0;
    this.applyCameraVisibilityAndControls();
    this.snapCameraBehindHero();
    this.saveProgress();
    if (zId) {
      const st = ZONE_CAVE_STORIES[zId];
      this.showBanner(
        `Misi Gua ${ZONE_INFO[zId].name}: Buka 5 Pintu, kalahkan Bos, ambil Kunci Penjara & selamatkan ${st.captiveName}!`,
        4.8,
      );
    }
    soundEngine.playBuild();
    this.pushHud(true);
  }

  private startDungeonRescueCutscene(zoneId: ZoneId): void {
    const story = ZONE_CAVE_STORIES[zoneId];
    this.phase = 'story';
    this.heldKeys.clear();
    this.applyCameraVisibilityAndControls();
    this.storyTimer = 0;

    if (this.dungeonRig) {
      this.dungeonRig.prisonBars.visible = false;
      this.dungeonRig.group.add(this.dungeonRig.captiveMesh);
      this.dungeonRig.captiveMesh.position.set(3.3, 0, 11.8);
      this.dungeonRig.captiveMesh.rotation.y = -0.35;
    }
    this.heroPos.set(2.1, 0, 13.5);
    this.heroYaw = Math.atan2(3.8 - 2.1, 11.8 - 13.5);
    this.hero.root.position.copy(this.heroPos);
    this.hero.body.rotation.y = this.heroYaw;
    this.camera.position.set(0.4, 3.2, 16.8);
    this.controls.target.set(3.4, 1.7, 12.1);
    this.controls.update();

    this.storyDialog = {
      kind: 'dungeon_rescue',
      step: 0,
      zoneId,
      speakerName: story.captiveName,
      speakerRole: `${story.captiveRole} · Terbebas dari Penjara!`,
      textEn: story.rescueCaptiveEn,
      textId: story.rescueCaptiveId,
      accentColor: story.accentColor,
    };
    soundEngine.playFanfare();
    soundEngine.speakEnglish(story.rescueCaptiveEn);
    this.pushHud(true);
  }

  private finalizeDungeonLiberation(zoneId: ZoneId): void {
    const boss = BOSSES[zoneId];
    const wDef = WEAPONS[boss.rewardWeapon];
    this.defeatedBossZones.add(zoneId);
    if (!this.liberatedZones.has(zoneId)) {
      this.liberatedZones.add(zoneId);
      this.ribbons.add(zoneId);
      this.ownedRelics.add(boss.rewardRelic);
      this.ownedWeapons.add(boss.rewardWeapon);
      this.weaponAmmo[boss.rewardWeapon] = Math.min(
        MAX_AMMO,
        (this.weaponAmmo[boss.rewardWeapon] || 0) + wDef.packSize,
      );
      this.activeWeapon = boss.rewardWeapon;
      const eqIdx = WEAPON_ORDER.indexOf(boss.rewardWeapon);
      if (eqIdx >= 0) this.activeHotbarSlot = eqIdx;
      this.hp = this.maxHp;
      this.diamonds += 5;
      this.gainXp(180);
      this.score += 1200;

      const q = this.quests.find((item) => item.zoneId === zoneId);
      if (q) {
        q.accepted = true;
        q.progress = q.target;
        q.claimed = true;
      }
      this.checkAreaTrophy(zoneId);
      this.refreshWeaponVisual();
      this.refreshAreaMists();
    }

    if (this.dungeonState && this.dungeonState.zoneId === zoneId) {
      this.dungeonState.bossDefeated = true;
      this.dungeonState.prisonKeySpawned = false;
      this.dungeonState.prisonKeyCollected = true;
      this.dungeonState.prisonUnlocked = true;
      this.dungeonState.liberated = true;
    }
    if (this.dungeonRig) {
      this.dungeonRig.prisonBars.visible = false;
      this.dungeonRig.prisonKeyGroup.visible = false;
      this.dungeonRig.guardianAuraMat.color.setHex(0x22c55e);
      this.dungeonRig.group.add(this.dungeonRig.captiveMesh);
      this.dungeonRig.captiveMesh.position.set(3.3, 0, 11.8);
      this.dungeonRig.captiveMesh.rotation.y = -0.35;
    }
    this.applyAtmosphere('dungeon', zoneId, true);
  }

  private finishDungeonRescueCutscene(zoneId?: ZoneId): void {
    const zId = zoneId || this.storyDialog?.zoneId || this.dungeonState?.zoneId;
    if (zId) {
      this.finalizeDungeonLiberation(zId);
    }
    this.storyDialog = null;
    this.phase = 'playing';
    this.heroPos.set(2.1, 0, 13.5);
    this.heroVel.set(0, 0, 0);
    this.heroVelY = 0;
    this.heroOnGround = true;
    this.hero.root.position.copy(this.heroPos);
    this.applyCameraVisibilityAndControls();
    this.snapCameraBehindHero();
    this.saveProgress();
    if (zId) {
      const rb = RIBBONS[zId];
      const boss = BOSSES[zId];
      this.spawnBurst(3.8, 2.2, 11.8, 0x34d399, 36);
      this.showBanner(
        `🎉 ${ZONE_INFO[zId].name} Bebas! Dapat Pecahan Mahkota #${rb.number}/6, ${RELICS[boss.rewardRelic].name}, & ${WEAPONS[boss.rewardWeapon].name}!`,
        5.0,
      );
    }
    this.pushHud(true);
  }

  private finishOpeningStory(skipped: boolean): void {
    this.introDone = true;
    this.storyDialog = null;
    this.owlState = 'leave';
    this.storyTimer = 0;
    this.phase = 'playing';
    this.heroPos.set(0, 0, 12);
    this.hero.root.position.copy(this.heroPos);
    this.applyCameraVisibilityAndControls();
    this.snapCameraBehindHero();
    this.saveProgress();
    this.showBanner(
      skipped
        ? '🎯 Misi Awal: Ikuti cahaya biru di kiri Alun-Alun untuk ambil Senjata Pemula!'
        : '🎯 Misi Pertama: Cari cahaya biru & ambil Senjata Pemula di barat Alun-Alun!',
      4.8,
    );
    soundEngine.playBuild();
    this.pushHud(true);
  }

  public resolveDefeatExitChoice(returnToZone: boolean): void {
    const zId = this.storyDialog?.zoneId;
    this.storyDialog = null;
    this.phase = 'playing';
    if (returnToZone && zId) {
      this.enterZoneDungeon(zId, false);
    } else {
      this.pushHud(true);
    }
  }

  private syncOverworldMonstersByDiff(): void {
    const count = DIFF_CONFIG[this.settings.difficulty].roamingCount;
    this.monsters.forEach((m, idx) => {
      const enabled = idx < count;
      m.alive = enabled;
      m.mesh.visible = enabled;
      m.x = m.homeX;
      m.z = m.homeZ;
    });
  }

  private applyAtmosphere(mode: WorldLocationMode, zoneId?: ZoneId, dungeonBright = false): void {
    if (mode === 'dungeon') {
      if (dungeonBright) {
        const brightHex =
          zoneId === 'gua_portal'
            ? 0x3b2f63
            : zoneId === 'menara_waktu'
            ? 0x2b3b55
            : zoneId === 'hutan_satwa'
            ? 0x1e4e3a
            : zoneId === 'pasar_rasa'
            ? 0x4a2c1d
            : 0x334155;
        (this.scene.background as THREE.Color).setHex(brightHex);
        if (this.scene.fog instanceof THREE.FogExp2) {
          this.scene.fog.color.setHex(brightHex);
          this.scene.fog.density = 0.0065;
        }
        this.hemiLight.intensity = 1.18;
        this.sunLight.intensity = 1.45;
        this.rimLight.intensity = 0.58;
        this.scene.environmentIntensity = 0.92;
        this.playerCaveLight.intensity = 1.25;
      } else {
        const fogHex =
          zoneId === 'gua_portal'
            ? 0x0b0a1f
            : zoneId === 'menara_waktu'
            ? 0x0c142c
            : zoneId === 'hutan_satwa'
            ? 0x071f14
            : zoneId === 'pasar_rasa'
            ? 0x1c100a
            : 0x0f172a;
        (this.scene.background as THREE.Color).setHex(fogHex);
        if (this.scene.fog instanceof THREE.FogExp2) {
          this.scene.fog.color.setHex(fogHex);
          this.scene.fog.density = 0.022;
        }
        this.hemiLight.intensity = 0.36;
        this.sunLight.intensity = 0.2;
        this.rimLight.intensity = 0.16;
        this.scene.environmentIntensity = 0.25;
        this.playerCaveLight.intensity = 2.4;
      }
    } else if (mode === 'academy') {
      (this.scene.background as THREE.Color).setHex(0x1e1b4b);
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.setHex(0x1e1b4b);
        this.scene.fog.density = 0.008;
      }
      this.hemiLight.intensity = 0.85;
      this.sunLight.intensity = 1.35;
      this.rimLight.intensity = 0.45;
      this.scene.environmentIntensity = 0.85;
      this.playerCaveLight.intensity = 0;
    } else {
      (this.scene.background as THREE.Color).setHex(0x9cd6fc);
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.setHex(0x9cd6fc);
        this.scene.fog.density = 0.0034;
      }
      this.hemiLight.intensity = 0.98;
      this.sunLight.intensity = 1.95;
      this.rimLight.intensity = 0.42;
      this.scene.environmentIntensity = 1.0;
      this.playerCaveLight.intensity = 0;
    }
  }

  private clearSubScenes(): void {
    if (this.dungeonRig) {
      this.scene.remove(this.dungeonRig.group);
      this.dungeonRig.disposables.forEach((d) => d.dispose());
      this.dungeonRig.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      this.dungeonRig = null;
    }
    if (this.academyRig) {
      this.scene.remove(this.academyRig.group);
      this.academyRig.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      this.academyRig = null;
    }
    this.clearCaveBoulders();
    this.activeTnts.forEach((t) => {
      if (t.mesh.parent) t.mesh.parent.remove(t.mesh);
    });
    this.activeTnts = [];
    this.caveTorches = [];
    this.targetedCaveBlock = null;
    this.nearCraftingTable = false;
    this.chestAmbushTriggered = false;
    this.bossBoulderTimer = 0;
    this.dungeonAnimatables = [];
    this.dungeonMonsters = [];
    this.academyMonsters = [];
    this.dungeonClickables = [];
    this.academyClickables = [];
    this.academyNpcs.clear();
    this.dungeonState = null;
    this.nearDungeonExit = false;
    this.nearbyDoorIndex = null;
    this.nearbyDungeonGuardian = false;
    this.nearPrisonKey = false;
    this.nearHiddenPrison = false;
    this.tapMoveTarget = null;
    this.clearProjectiles();
    this.applyAtmosphere('overworld');
  }

  private clearCaveBoulders(): void {
    for (const b of this.caveBoulders) {
      if (b.rockMesh.parent) b.rockMesh.parent.remove(b.rockMesh);
      if (b.ringMesh.parent) b.ringMesh.parent.remove(b.ringMesh);
      b.rockMesh.geometry.dispose();
      (b.rockMesh.material as THREE.Material).dispose();
      b.ringMesh.geometry.dispose();
      (b.ringMesh.material as THREE.Material).dispose();
    }
    this.caveBoulders = [];
  }

  private clearProjectiles(): void {
    for (const p of this.projectiles) {
      p.active = false;
      p.mesh.visible = false;
      p.hitIds.clear();
    }
  }

  private getOrCreateAreaDeal(zoneId: ZoneId): AreaWaveDeal {
    if (!this.areaDeals[zoneId]) {
      this.areaDeals[zoneId] = computeAreaWaveDeal(zoneId);
      this.saveProgress();
    }
    return this.areaDeals[zoneId]!;
  }

  public enterZoneDungeon(zoneId: ZoneId, isMixedChallenge = false): void {
    if (this.worldMode === 'overworld') {
      this.savedOverworldHeroPos.copy(this.heroPos);
    }
    this.clearSubScenes();

    this.overworldGroup.visible = false;
    this.worldMode = 'dungeon';
    this.phase = 'playing';
    this.heldKeys.clear();
    this.shooterGemsThisArea = 0;
    this.chestAmbushTriggered = false;
    this.bossBoulderTimer = 0;
    this.caveTorchesLeft = Math.max(this.caveTorchesLeft, 16);
    this.caveShieldBlocksLeft = Math.max(this.caveShieldBlocksLeft, 4);

    const rig = createDungeonEnvironment(zoneId, this.palette);
    this.dungeonRig = rig;
    this.dungeonAnimatables = rig.animatables;
    this.dungeonExitPos.copy(rig.exitPadPos);
    this.dungeonClickables.push(
      rig.exitClickable,
      rig.weaponChest.group,
      rig.guardianMesh,
      rig.prisonGroup,
      rig.prisonKeyGroup,
    );
    rig.group.children.forEach((child) => {
      if (child.userData.craftingTable) this.dungeonClickables.push(child);
    });
    rig.doors.forEach((d) => this.dungeonClickables.push(d.group));
    rig.caveBlocks.forEach((b) => this.dungeonClickables.push(b.mesh));
    this.scene.add(rig.group);

    const liberated = this.liberatedZones.has(zoneId);
    const bossBeaten = liberated || this.defeatedBossZones.has(zoneId);
    this.applyAtmosphere('dungeon', zoneId, bossBeaten);

    const deal = this.getOrCreateAreaDeal(zoneId);
    const clearedSet = new Set(this.areaDoorsCleared[zoneId] || []);

    // 60% English Quiz Guardians (3 Penjaga Kata carrying 100% of remaining area vocab) +
    // 40% Pure Real-Time Action Brawlers (2 Petarung Gua — zero quiz, fight directly in 3D!)
    const quizWaves: string[][] = [[], [], []];
    deal.monsterWaves.forEach((wIds, idx) => {
      quizWaves[idx % 3].push(...wIds);
    });

    const quizCoords: Array<[number, number]> = [
      [-9, -1],
      [0, -11],
      [9, -1],
    ];
    const monsterTypes: MonsterType[] = [
      BOSSES[zoneId].monsterType,
      'bayangan_kata',
      BOSSES[zoneId].monsterType,
      'jam_pasir',
    ];

    quizWaves.forEach((wordIds, idx) => {
      const [mx, mz] = quizCoords[idx];
      const id = `dw_${zoneId}_${idx}`;
      const mType = monsterTypes[idx % monsterTypes.length];
      const mesh = createMonsterMesh(mType, this.palette, 1.0);
      mesh.position.set(mx, 0, mz);
      mesh.userData.monsterId = id;
      rig.group.add(mesh);
      this.dungeonClickables.push(mesh);

      this.dungeonMonsters.push({
        id,
        type: mType,
        name: `Penjaga Kata #${idx + 1}`,
        zoneId,
        homeX: mx,
        homeZ: mz,
        x: mx,
        z: mz,
        maxHp: Math.min(5, Math.max(2, Math.ceil(wordIds.length / 8))),
        rewardXp: 35,
        rewardDiamonds: 0, // Bab 8: noGems in dungeon monster drops
        rewardScore: 220,
        wordIds,
        mesh,
        alive: !bossBeaten,
        respawnTimer: 0,
        patrolPhase: idx * 1.4,
        angryTimer: 0,
      });
      if (bossBeaten) {
        mesh.visible = false;
      }
    });

    const brawlerCoords: Array<[number, number]> = [
      [-7, -9],
      [7, -9],
    ];
    const brawlerHp = this.settings.difficulty === 'pendekar' ? 5 : 4;
    brawlerCoords.forEach(([bx, bz], idx) => {
      const id = `db_${zoneId}_${idx}`;
      const mType = idx === 0 ? BOSSES[zoneId].monsterType : 'jam_pasir';
      const mesh = createMonsterMesh(mType, this.palette, 1.08);
      mesh.position.set(bx, 0, bz);
      mesh.userData.monsterId = id;

      // Glowing crimson battle ring underneath so players immediately spot 40% Pure Combat brawlers!
      const auraRing = new THREE.Mesh(
        new THREE.RingGeometry(0.95, 1.32, 18),
        new THREE.MeshBasicMaterial({
          color: 0xef4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        }),
      );
      auraRing.rotation.x = -Math.PI / 2;
      auraRing.position.y = 0.08;
      mesh.add(auraRing);
      mesh.userData.combatRing = auraRing;

      rig.group.add(mesh);
      this.dungeonClickables.push(mesh);

      this.dungeonMonsters.push({
        id,
        type: mType,
        name: `Petarung Gua #${idx + 1}`,
        zoneId,
        homeX: bx,
        homeZ: bz,
        x: bx,
        z: bz,
        maxHp: brawlerHp,
        mobHp: brawlerHp,
        maxMobHp: brawlerHp,
        combatOnly: true,
        aggroActive: false,
        attackCooldown: 1.4 + idx * 0.4,
        windupTimer: -1,
        lungeTimer: 0,
        hitFlashTimer: 0,
        rewardXp: 25,
        rewardDiamonds: 1,
        rewardScore: 220,
        mesh,
        alive: !bossBeaten,
        respawnTimer: 0,
        patrolPhase: idx * 2.2 + 0.7,
        angryTimer: 0,
      });
      if (bossBeaten) {
        mesh.visible = false;
      }
    });

    // Spawn Cave-Exclusive Mobs: 2 Creeper Kata (explosive) & 2 Kelelawar Gua (flying ceiling bats)
    const creeperSpots: Array<[number, number]> = [
      [-11, 2],
      [11, -3],
    ];
    creeperSpots.forEach(([cx, cz], idx) => {
      const cid = `creeper_${zoneId}_${idx}`;
      const cMesh = createMonsterMesh('creeper_kata', this.palette, 1.0);
      cMesh.position.set(cx, 0, cz);
      cMesh.visible = !bossBeaten;
      rig.group.add(cMesh);
      this.dungeonMonsters.push({
        id: cid,
        type: 'creeper_kata',
        name: 'Creeper Kata',
        zoneId,
        homeX: cx,
        homeZ: cz,
        x: cx,
        y: 0,
        z: cz,
        maxHp: 2,
        mobHp: 2,
        fuseTimer: -1,
        rewardXp: 15,
        rewardDiamonds: 0,
        rewardScore: 140,
        isCaveMob: true,
        mesh: cMesh,
        alive: !bossBeaten,
        respawnTimer: 0,
        patrolPhase: idx * 2.1,
        angryTimer: 0,
      });
    });

    const batSpots: Array<[number, number]> = [
      [-6, -5],
      [6, 3],
    ];
    batSpots.forEach(([bx, bz], idx) => {
      const bid = `bat_${zoneId}_${idx}`;
      const bMesh = createMonsterMesh('kelelawar_gua', this.palette, 1.05);
      bMesh.position.set(bx, 3.4, bz);
      bMesh.visible = !bossBeaten;
      rig.group.add(bMesh);
      this.dungeonMonsters.push({
        id: bid,
        type: 'kelelawar_gua',
        name: 'Kelelawar Gua',
        zoneId,
        homeX: bx,
        homeZ: bz,
        x: bx,
        y: 3.4,
        z: bz,
        maxHp: 2,
        mobHp: 2,
        rewardXp: 15,
        rewardDiamonds: 0,
        rewardScore: 140,
        isCaveMob: true,
        mesh: bMesh,
        alive: !bossBeaten,
        respawnTimer: 0,
        patrolPhase: idx * 2.7 + 0.8,
        angryTimer: 0,
      });
    });

    const caveStory = ZONE_CAVE_STORIES[zoneId];
    const wordMobs = this.dungeonMonsters.filter((m) => !m.isCaveMob);
    const aliveCount = wordMobs.filter((m) => m.alive).length;
    this.dungeonState = {
      zoneId,
      zoneName: ZONE_INFO[zoneId].name,
      doorsCleared: Array.from(clearedSet),
      monstersRemaining: aliveCount,
      monstersTotal: wordMobs.length,
      bossSpawned: bossBeaten,
      bossDefeated: bossBeaten,
      prisonKeySpawned: bossBeaten && !liberated,
      prisonKeyCollected: liberated,
      prisonUnlocked: liberated,
      captiveName: caveStory.captiveName,
      guardianName: caveStory.guardianName,
      liberated,
      isMixedChallenge,
    };

    if (liberated) {
      rig.prisonBars.visible = false;
      rig.prisonKeyGroup.visible = false;
      rig.guardianAuraMat.color.setHex(0x22c55e);
      rig.group.add(rig.captiveMesh);
      rig.captiveMesh.position.set(3.3, 0, 11.8);
      rig.captiveMesh.rotation.y = -0.35;
    } else if (bossBeaten) {
      rig.prisonKeyGroup.visible = true;
    }

    // If all 5 doors & monster waves already done (re-entering after Door 4), spawn Boss if not yet defeated
    this.updateDungeonDoorVisuals();
    this.syncShootersForDifficulty();
    if (bossBeaten) {
      this.shooters.forEach((s) => {
        s.alive = false;
        s.mesh.visible = false;
      });
    } else if (clearedSet.has(4)) {
      this.spawnDungeonBoss(zoneId);
    }

    this.nearbyNpcId = null;
    this.nearbyMonsterId = null;
    this.nearbyDoorIndex = null;
    this.nearbyDungeonGuardian = false;
    this.nearPrisonKey = false;
    this.nearHiddenPrison = false;
    this.nearPortal = false;
    this.nearDungeonExit = false;
    this.encounterGraceTimer = 1.6;
    if (this.cameraMode === 'orbit') this.cameraMode = 'third_back';

    if (!liberated && !this.caveIntrosSeen.has(zoneId)) {
      this.startDungeonIntroCutscene(zoneId);
      return;
    }

    this.heroPos.set(0, 0, 13);
    this.heroVel.set(0, 0, 0);
    this.heroVelY = 0;
    this.heroOnGround = true;
    this.heroYaw = Math.PI;
    this.hero.root.position.copy(this.heroPos);
    this.hero.body.rotation.y = this.heroYaw;

    this.applyCameraVisibilityAndControls();
    this.snapCameraBehindHero();

    this.spawnBurst(0, 1.8, 13, 0xa855f7, 22);
    soundEngine.playDoor();
    this.showBanner(
      liberated
        ? `Gua ${ZONE_INFO[zoneId].name} Bebas & Terang · ${caveStory.guardianName} & ${caveStory.captiveName} aman!`
        : bossBeaten
        ? `Bos kalah & gua terang! Ambil Kunci Penjara emas di tengah gua lalu selamatkan ${caveStory.captiveName}!`
        : `Gua ${ZONE_INFO[zoneId].name}: Buka 5 Pintu, kalahkan Bos, lalu selamatkan ${caveStory.captiveName}!`,
      4.8,
    );
    this.pushHud(true);
  }

  private updateDungeonDoorVisuals(): void {
    if (!this.dungeonRig || !this.dungeonState) return;
    const cleared = new Set(this.dungeonState.doorsCleared);
    const readyForDoor4 =
      cleared.has(0) &&
      cleared.has(1) &&
      cleared.has(2) &&
      cleared.has(3) &&
      this.dungeonState.monstersRemaining === 0;

    for (const d of this.dungeonRig.doors) {
      if (cleared.has(d.index)) {
        updateDoorRigVisual(d, 'cleared');
      } else if (d.index === 4 && !readyForDoor4) {
        updateDoorRigVisual(d, 'locked');
      } else {
        updateDoorRigVisual(d, 'open');
      }
    }
  }

  public enterAcademy(): void {
    if (this.settings.storyLocked && this.ribbons.size < 6) {
      this.showBanner(
        `Istana IELTS terkunci (Mode Cerita)! Kumpulkan 6 Mahkota (${this.ribbons.size}/6) atau ubah ke Bebas di Opsi.`,
        4.0,
      );
      soundEngine.playNo();
      return;
    }
    if (this.worldMode === 'overworld') {
      this.savedOverworldHeroPos.copy(this.heroPos);
    }
    this.clearSubScenes();
    this.overworldGroup.visible = false;
    this.worldMode = 'academy';
    this.phase = 'playing';
    this.heldKeys.clear();
    this.shooterGemsThisArea = 0;

    const rig = createAcademyHallEnvironment(this.palette);
    this.academyRig = rig;
    this.dungeonAnimatables = rig.animatables;
    this.dungeonExitPos.copy(rig.exitPadPos);
    this.academyClickables.push(rig.exitClickable);
    this.scene.add(rig.group);
    this.applyAtmosphere('academy');

    for (const def of ACADEMY_NPCS) {
      const mesh = createZoneNpc(def.id, this.palette);
      mesh.position.set(def.x, 0, def.z);
      mesh.rotation.y = def.rotationY;
      mesh.userData.npcId = def.id;
      rig.group.add(mesh);
      this.academyClickables.push(mesh);
      this.academyNpcs.set(def.id, { mesh, x: def.x, z: def.z });
    }

    for (const s of ACADEMY_SHADOWS) {
      const mesh = createMonsterMesh(s.type, this.palette, 1.0);
      mesh.position.set(s.x, 0, s.z);
      mesh.userData.monsterId = s.id;
      rig.group.add(mesh);
      this.academyClickables.push(mesh);
      this.academyMonsters.push({
        id: s.id,
        type: s.type,
        name: s.name,
        zoneId: s.zoneId,
        homeX: s.x,
        homeZ: s.z,
        x: s.x,
        z: s.z,
        maxHp: s.maxHp,
        rewardXp: s.rewardXp,
        rewardDiamonds: s.rewardDiamonds,
        rewardScore: s.rewardScore,
        isAcademyShadow: true,
        academySkill: s.academySkill,
        mesh,
        alive: true,
        respawnTimer: 0,
        patrolPhase: Math.random() * Math.PI * 2,
        angryTimer: 0,
      });
    }

    this.syncShootersForDifficulty();

    this.heroPos.set(0, 0, 12);
    this.heroVel.set(0, 0, 0);
    this.heroVelY = 0;
    this.heroOnGround = true;
    this.heroYaw = Math.PI;
    this.hero.root.position.copy(this.heroPos);
    this.encounterGraceTimer = 1.6;
    if (this.cameraMode === 'orbit') this.cameraMode = 'third_back';
    this.applyCameraVisibilityAndControls();
    this.snapCameraBehindHero();

    soundEngine.playFanfare();
    this.showBanner(
      'Epilog Istana IELTS! Keenam Pecahan Mahkota bersatu — Raja Aksara & Lila menyambutmu di aula!',
      5.0,
    );
    this.pushHud(true);
  }

  public exitDungeon(): void {
    if (this.worldMode === 'overworld') return;
    this.clearSubScenes();
    this.worldMode = 'overworld';
    this.overworldGroup.visible = true;
    this.phase = 'playing';
    this.heldKeys.clear();

    this.heroPos.copy(this.savedOverworldHeroPos);
    this.heroVel.set(0, 0, 0);
    this.heroVelY = 0;
    this.heroOnGround = true;
    this.hero.root.position.copy(this.heroPos);
    this.encounterGraceTimer = 2.0;

    this.refreshAreaMists();
    this.syncShootersForDifficulty();
    this.applyCameraVisibilityAndControls();
    this.snapCameraBehindHero();

    this.spawnBurst(this.heroPos.x, 1.5, this.heroPos.z, 0x38bdf8, 18);
    soundEngine.playDoor();
    this.showBanner('Kembali ke Hutan Kata', 2.4);
    this.pushHud(true);
  }

  private triggerDefeatExit(lastZoneId?: ZoneId): void {
    this.clearSubScenes();
    this.worldMode = 'overworld';
    this.overworldGroup.visible = true;
    this.heroPos.set(0, 0, 14);
    this.heroVel.set(0, 0, 0);
    this.heroVelY = 0;
    this.heroOnGround = true;
    this.hero.root.position.copy(this.heroPos);
    this.hp = Math.ceil(this.maxHp / 2);
    this.encounterGraceTimer = 6.0;
    this.refreshAreaMists();
    this.syncShootersForDifficulty();

    this.controls.target.set(0, 2, 14);
    this.camera.position.set(0, 22, 34);
    this.controls.update();

    const npc = lastZoneId ? NPC_CATALOG.find((n) => n.zoneId === lastZoneId) : NPC_CATALOG[0];
    this.phase = 'story';
    this.applyCameraVisibilityAndControls();
    this.storyDialog = {
      kind: 'defeat_exit',
      step: 0,
      zoneId: lastZoneId,
      speakerName: npc?.name || 'Kakek Sapa',
      speakerRole: npc?.zoneName || 'Hutan Kata',
      textEn: 'Rest up, Hoot! Your heart is half-recovered. Want to head right back or catch your breath first?',
      textId: `Jangan menyerah, Hoot! Nyawamu dipulihkan (${this.hp}/${this.maxHp} ❤️). Ingin langsung kembali ke ${npc?.zoneName || 'sana'} atau istirahat dulu?`,
      accentColor: npc?.accentColor || '#f59e0b',
    };
    soundEngine.playLose();
    this.saveProgress();
    this.pushHud(true);
  }

  public setPhase(next: GamePhase): void {
    this.phase = next;
    this.heldKeys.clear();
    this.lookPointer = null;
    this.applyCameraVisibilityAndControls();
    this.pushHud(true);
  }

  public toggleCameraMode(): void {
    const order: CameraMode[] = ['third_back', 'first_person', 'orbit'];
    const curIdx = order.indexOf(this.cameraMode);
    const nextIdx = curIdx >= 0 ? (curIdx + 1) % order.length : 0;
    this.cameraMode = order[nextIdx];
    this.applyCameraVisibilityAndControls();
    if (this.cameraMode === 'orbit') {
      this.controls.target.set(this.heroPos.x, 2.0, this.heroPos.z);
      if (this.camera.position.distanceTo(this.controls.target) < 12) {
        this.camera.position.set(this.heroPos.x, 18, this.heroPos.z + 22);
      }
      this.controls.update();
    }
    const labels: Record<CameraMode, string> = {
      third_back: 'Kamera: 3D GTA (Orbit 360° Anti-Tembok)',
      first_person: 'Kamera: Orang Pertama (FPS)',
      third_front: 'Kamera: Orang Ketiga (Depan)',
      orbit: 'Kamera: Bebas / Foto 3D',
    };
    this.showBanner(labels[this.cameraMode], 2.2);
    this.pushHud(true);
  }

  public updateSettings(partial: Partial<GameSettings>): void {
    const prevDiff = this.settings.difficulty;
    this.settings = { ...this.settings, ...partial };
    if (partial.difficulty && partial.difficulty !== prevDiff) {
      this.syncShootersForDifficulty();
      if (this.worldMode === 'overworld') this.syncOverworldMonstersByDiff();
    }
    this.saveProgress();
    this.pushHud(true);
  }

  public equipWeapon(id: WeaponId): void {
    if (!this.ownedWeapons.has(id)) return;
    this.activeWeapon = id;
    const slotIdx = WEAPON_ORDER.indexOf(id);
    if (slotIdx >= 0) this.activeHotbarSlot = slotIdx;
    this.refreshWeaponVisual();
    soundEngine.playPick();
    this.saveProgress();
    this.pushHud(true);
  }

  public buyAmmoWithDiamonds(): boolean {
    if (!this.ownedWeapons.size || this.diamonds < AMMO_COST) {
      soundEngine.playNo();
      return false;
    }
    const w = WEAPONS[this.activeWeapon];
    if (this.weaponAmmo[this.activeWeapon] >= MAX_AMMO) {
      soundEngine.playNo();
      return false;
    }
    this.diamonds -= AMMO_COST;
    this.weaponAmmo[this.activeWeapon] = Math.min(
      MAX_AMMO,
      this.weaponAmmo[this.activeWeapon] + w.packSize,
    );
    soundEngine.playPick();
    this.saveProgress();
    this.pushHud(true);
    return true;
  }

  public startAmmoQuiz(): void {
    const pool = [...VOCAB_CATALOG].sort(() => Math.random() - 0.5).slice(0, 3);
    this.phase = 'learning';
    this.heldKeys.clear();
    this.callbacks.onStartLearning({
      mode: 'quiz',
      title: 'Kuis Isi Peluru Gratis (+6 Peluru)',
      minPct: 60,
      wordIds: pool.map((v) => v.id),
      isAmmoQuiz: true,
    });
    this.pushHud(true);
  }

  public startQuickLearning(mode: LearningSessionContext['mode'], catId?: number, zoneId?: ZoneId): void {
    const pool =
      catId !== undefined
        ? VOCAB_CATALOG.filter((v) => v.catId === catId)
        : zoneId
        ? getWordsForZone(zoneId)
        : VOCAB_CATALOG;
    const count = mode === 'match' ? 8 : 10;
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    this.phase = 'learning';
    this.heldKeys.clear();
    this.callbacks.onStartLearning({
      mode,
      title: catId !== undefined ? `Latihan Kategori` : zoneId ? ZONE_INFO[zoneId].name : 'Mode Belajar Cepat',
      zoneId,
      catId,
      minPct: 60,
      wordIds: picked.map((v) => v.id),
    });
    this.pushHud(true);
  }

  public openDungeonDoor(doorIndex: number): void {
    if (this.worldMode !== 'dungeon' || !this.dungeonState) return;
    const zId = this.dungeonState.zoneId;
    const door = ZONE_DOORS[zId][doorIndex];
    if (!door) return;

    const cleared = new Set(this.dungeonState.doorsCleared);
    if (doorIndex === 4) {
      const ready =
        cleared.has(0) &&
        cleared.has(1) &&
        cleared.has(2) &&
        cleared.has(3) &&
        this.dungeonState.monstersRemaining === 0;
      if (!ready) {
        soundEngine.playNo();
        this.showBanner(
          'Selesaikan Pintu 1–4 & semua Monster Kata area ini dulu sebelum membuka Pintu Bos!',
          3.4,
        );
        return;
      }
    }

    if (door.mode === 'duel') {
      const mini = DOOR_MINI_MONSTER[zId];
      this.phase = 'battle';
      this.heldKeys.clear();
      soundEngine.playBoss();
      this.callbacks.onStartBattle({
        monsterId: `door1_${zId}`,
        monsterType: mini.type,
        monsterName: mini.name,
        zoneId: zId,
        isIeltsBoss: false,
        monsterHp: mini.hp,
        monsterMaxHp: mini.hp,
        roundNumber: 1,
        doorIndex: 1,
      });
      this.pushHud(true);
      return;
    }

    const deal = this.getOrCreateAreaDeal(zId);
    const wordIds = deal.doorWords[doorIndex] || getWordsForZone(zId).slice(0, 10).map((v) => v.id);
    this.phase = 'learning';
    this.heldKeys.clear();
    soundEngine.playDoor();
    this.callbacks.onStartLearning({
      mode: door.mode,
      title: `${door.name} — ${door.modeLabel}`,
      zoneId: zId,
      doorIndex,
      minPct: door.minPct,
      wordIds,
    });
    this.pushHud(true);
  }

  public recordWordAttempt(vocabId: string, ok: boolean, noLevel = false): void {
    const prev = this.wordProgress[vocabId] || { b: 0, r: 0, w: 0 };
    const next: WordProgress = {
      b: ok ? (noLevel ? prev.b : Math.min(5, prev.b + 1)) : Math.max(0, prev.b - 1),
      r: ok ? prev.r + 1 : prev.r,
      w: ok ? prev.w : prev.w + 1,
    };
    this.wordProgress[vocabId] = next;

    const t = todayKey();
    if (this.dailyDate !== t) {
      this.dailyDate = t;
      this.dailyCount = 0;
    }
    this.dailyCount += 1;
  }

  public completeLearningSession(
    ctx: LearningSessionContext,
    pct: number,
    xpEarned: number,
    cekCepatPassed?: boolean,
  ): void {
    this.phase = 'playing';
    if (xpEarned > 0) {
      this.gainXp(xpEarned);
      this.score += xpEarned * 12;
    }
    if (pct >= 70) {
      this.gainXp(20); // Bab 7: +20 XP session completion bonus
      this.score += 180;
    }

    if (ctx.isAmmoQuiz) {
      if (pct >= 60 && this.ownedWeapons.size > 0) {
        this.weaponAmmo[this.activeWeapon] = Math.min(
          MAX_AMMO,
          this.weaponAmmo[this.activeWeapon] + 6,
        );
        soundEngine.playPick();
        this.showBanner(`Berhasil! +6 Peluru untuk ${WEAPONS[this.activeWeapon].name}!`, 3.2);
      } else {
        this.showBanner('Skor belum cukup 60% untuk bonus peluru. Coba lagi!', 2.6);
      }
      this.saveProgress();
      this.pushHud(true);
      return;
    }

    // Check Door Clear inside Dungeon
    if (
      ctx.zoneId &&
      ctx.doorIndex !== undefined &&
      this.worldMode === 'dungeon' &&
      this.dungeonState &&
      this.dungeonState.zoneId === ctx.zoneId
    ) {
      const passed = pct >= ctx.minPct;
      if (passed) {
        const list = this.areaDoorsCleared[ctx.zoneId] || [];
        if (!list.includes(ctx.doorIndex)) {
          this.areaDoorsCleared[ctx.zoneId] = [...list, ctx.doorIndex];
        }
        this.dungeonState.doorsCleared = [...this.areaDoorsCleared[ctx.zoneId]];

        const storyLine = DOOR_RESTORED_STORY[ctx.zoneId]?.[ctx.doorIndex];
        if (ctx.doorIndex === 0 && cekCepatPassed) {
          this.hp = Math.min(this.maxHp, this.hp + 1);
          this.showBanner(
            `${storyLine || `Pintu "${ctx.title}" terbuka!`} (+1 Hati ditemukan!)`,
            4.2,
          );
        } else {
          this.showBanner(storyLine || `Pintu "${ctx.title}" Berhasil Dibuka!`, 4.0);
        }
        soundEngine.playWin();

        if (ctx.doorIndex === 4 && !this.dungeonState.bossDefeated && !this.dungeonState.bossSpawned) {
          this.spawnDungeonBoss(ctx.zoneId);
        }
        this.updateDungeonDoorVisuals();
      } else {
        soundEngine.playNo();
        this.showBanner(`Butuh minimal ${ctx.minPct}% untuk membuka pintu ini (Skor: ${pct}%).`, 3.4);
      }
    }

    if (ctx.zoneId) {
      this.checkAreaTrophy(ctx.zoneId);
    }
    this.saveProgress();
    this.pushHud(true);
  }

  private spawnDungeonBoss(zoneId: ZoneId): void {
    if (!this.dungeonRig || !this.dungeonState) return;
    const boss = BOSSES[zoneId];
    this.dungeonState.bossSpawned = true;
    const mesh = createMonsterMesh(boss.monsterType, this.palette, 1.65);
    mesh.position.set(0, 0, -9);
    mesh.userData.monsterId = boss.id;
    this.dungeonRig.group.add(mesh);
    this.dungeonClickables.push(mesh);

    this.dungeonMonsters.push({
      id: boss.id,
      type: boss.monsterType,
      name: boss.name,
      zoneId,
      homeX: 0,
      homeZ: -9,
      x: 0,
      z: -9,
      maxHp: boss.hpPerPhase * boss.phases,
      rewardXp: 250,
      rewardDiamonds: 5,
      rewardScore: 950,
      isBoss: true,
      mesh,
      alive: true,
      respawnTimer: 0,
      patrolPhase: 0,
      angryTimer: 0,
    });

    this.bossBoulderTimer = 1.6;
    const guardCount = this.settings.difficulty === 'santai' ? 1 : 2;
    const guardCoords: Array<[number, number]> = [
      [-12, -8],
      [12, -8],
    ];
    for (let i = 0; i < guardCount; i++) {
      const [gx, gz] = guardCoords[i];
      const gMesh = createShooterMesh(this.palette);
      gMesh.position.set(gx, 0, gz);
      this.dungeonRig.group.add(gMesh);
      this.shooters.push({
        id: `boss_guard_${i}`,
        x: gx,
        z: gz,
        homeX: gx,
        homeZ: gz,
        hp: 3,
        cooldown: 1.3 + i * 0.6,
        phase: i * 1.9,
        mesh: gMesh,
        alive: true,
        respawnTimer: 0,
      });
    }

    soundEngine.playBoss();
    this.spawnBurst(0, 2.5, -9, 0xef4444, 34);
    this.showBanner(
      `AWAS! BOS ${boss.name.toUpperCase()} + BATU RUNTUH & PENGAWAL MUNCUL!`,
      4.8,
    );
  }

  public recordIeltsScore(
    skill: 'listening' | 'reading' | 'writing' | 'speaking' | 'full',
    pct: number,
  ): void {
    this.ieltsScores[skill] = Math.max(this.ieltsScores[skill] || 0, pct);
    const xpGain = skill === 'full' ? Math.round(pct / 5) + 30 : Math.round(pct / 5);
    this.gainXp(xpGain);
    this.score += xpGain * 20;
    if (pct >= 70 && skill === 'full') {
      this.ieltsCleared = true;
    }
    soundEngine.playWin();
    this.showBanner(
      `Selesai Ujian ${skill.toUpperCase()} (${pct}%) · +${xpGain} XP!`,
      4.0,
    );
    this.saveProgress();
    this.pushHud(true);
  }

  private checkAreaTrophy(zoneId: ZoneId): void {
    if (this.areaTrophies.has(zoneId)) return;
    const words = getWordsForZone(zoneId);
    if (words.length === 0) return;
    let seen = 0;
    let mastered = 0;
    for (const w of words) {
      const p = this.wordProgress[w.id];
      if (p && p.r + p.w > 0) seen++;
      if (p && p.b >= 3) mastered++;
    }
    if (seen / words.length >= 0.6 && mastered / words.length >= 0.2) {
      this.areaTrophies.add(zoneId);
      this.diamonds += 5;
      this.maxHp = Math.min(TUNE.hpCap, this.maxHp + 1);
      this.hp = this.maxHp;
      soundEngine.playFanfare();
      this.showBanner(
        `TROFI PENGUASAAN ${ZONE_INFO[zoneId].name}! +5 💎, Nyawa Penuh & +1 Max ❤️!`,
        4.6,
      );
    }
  }

  public teleportToZone(zoneId: ZoneId): void {
    if (this.worldMode !== 'overworld') {
      this.exitDungeon();
    }
    const z = ZONE_INFO[zoneId];
    if (!z) return;
    this.heroPos.set(z.x, 0, z.z + 3);
    this.heroVel.set(0, 0, 0);
    this.tapMoveTarget = null;
    this.hero.root.position.copy(this.heroPos);
    this.applyCameraVisibilityAndControls();
    this.snapCameraBehindHero();
    this.encounterGraceTimer = 1.8;
    this.spawnBurst(this.heroPos.x, 1.5, this.heroPos.z, 0x38bdf8, 18);
    soundEngine.playDoor();
    this.showBanner(`Berpindah ke ${z.name}`, 2.5);
    this.pushHud(true);
  }

  public acceptQuest(npcId: string): void {
    const q = this.quests.find((item) => item.npcId === npcId);
    if (!q) return;
    if (!q.accepted) {
      q.accepted = true;
      this.showBanner(`Misi Diterima: ${q.title}`, 3.0);
      soundEngine.playBuild();
    } else if (q.progress >= q.target && !q.claimed) {
      q.claimed = true;
      this.gainXp(q.rewardXp);
      this.diamonds += q.rewardDiamonds;
      this.score += q.rewardXp * 3;
      this.hp = Math.min(this.maxHp, this.hp + 1);
      soundEngine.playQuestComplete();
      this.showBanner(
        `Hadiah Misi Diklaim! +${q.rewardXp} XP · +${q.rewardDiamonds} 💎!`,
        3.6,
      );
    }
    this.saveProgress();
    this.pushHud(true);
  }

  public learnVocabFromNpc(vocabIds: string[]): void {
    let newlySeen = 0;
    for (const id of vocabIds) {
      if (!this.wordProgress[id]) {
        this.wordProgress[id] = { b: 1, r: 1, w: 0 };
        newlySeen++;
      }
    }
    if (newlySeen > 0) {
      this.gainXp(newlySeen * 5);
      this.score += newlySeen * 25;
      this.saveProgress();
      this.pushHud(true);
    }
  }

  public startIeltsTrial(): void {
    this.enterAcademy();
  }

  public applyBattleAnswer(
    correct: boolean,
    vocabId: string,
    options?: {
      shieldBlocked?: boolean;
      duelHitStreak?: number;
      duelAmmoGained?: number;
      isAcademyMini?: boolean;
    },
  ): { ammoAwarded: number } {
    let ammoAwarded = 0;
    if (!options?.isAcademyMini && VOCAB_BY_ID[vocabId]) {
      this.recordWordAttempt(vocabId, correct, false);
    }

    if (correct) {
      this.streak += 1;
      this.maxStreak = Math.max(this.maxStreak, this.streak);
      this.score += 100 + this.streak * 20;
      this.gainXp(2); // Bab 8: +2 XP per duel hit
      if (this.ownedWeapons.size > 0 && (options?.duelAmmoGained || 0) < 10) {
        const bonus = (options?.duelHitStreak || 1) % 3 === 0 ? 2 : 1;
        const allowed = Math.min(bonus, 10 - (options?.duelAmmoGained || 0));
        this.weaponAmmo[this.activeWeapon] = Math.min(
          MAX_AMMO,
          this.weaponAmmo[this.activeWeapon] + allowed,
        );
        ammoAwarded = allowed;
      }
      soundEngine.playOk();
    } else {
      this.streak = 0;
      if (!options?.shieldBlocked) {
        this.hp = Math.max(0, this.hp - 1);
        soundEngine.playHurt();
      } else {
        soundEngine.playPick();
      }
    }
    this.saveProgress();
    this.pushHud(true);
    return { ammoAwarded };
  }

  public healOneHeart(): void {
    this.hp = Math.min(this.maxHp, this.hp + 1);
    soundEngine.playPick();
    this.pushHud(true);
  }

  public finishBattle(
    outcome: 'victory' | 'defeat' | 'fled',
    battle: BattleContext,
  ): void {
    this.encounterGraceTimer = outcome === 'victory' ? TUNE.invKill : TUNE.invHit;

    if (outcome === 'fled') {
      const fledMonster = this.getActiveMonsters().find((item) => item.id === battle.monsterId);
      if (fledMonster) fledMonster.stanceHp = 3;
      this.hp = Math.max(0, this.hp - 1);
      this.streak = 0;
      _forward.set(Math.sin(this.heroYaw), 0, Math.cos(this.heroYaw));
      this.heroVel.addScaledVector(_forward, -16);
      if (this.hp <= 0) {
        if (this.worldMode !== 'overworld') {
          this.triggerDefeatExit(battle.zoneId);
        } else {
          this.phase = 'gameover';
          soundEngine.playLose();
        }
      } else {
        this.phase = 'playing';
        this.showBanner('Berhasil kabur dari duel (-1 ❤️)', 2.4);
      }
      this.saveProgress();
      this.pushHud(true);
      return;
    }

    if (outcome === 'defeat' || this.hp <= 0) {
      if (this.worldMode !== 'overworld') {
        this.triggerDefeatExit(battle.zoneId);
      } else {
        this.phase = 'gameover';
        soundEngine.playLose();
        this.pushHud(true);
      }
      return;
    }

    // Victory!
    this.phase = 'playing';
    this.monstersDefeated += 1;

    // Door 1 Mini-Monster Duel Clear
    if (battle.doorIndex === 1 && this.worldMode === 'dungeon' && this.dungeonState) {
      const zId = this.dungeonState.zoneId;
      const list = this.areaDoorsCleared[zId] || [];
      if (!list.includes(1)) {
        this.areaDoorsCleared[zId] = [...list, 1];
      }
      this.dungeonState.doorsCleared = [...this.areaDoorsCleared[zId]];
      this.gainXp(25);
      this.score += 320;
      this.updateDungeonDoorVisuals();
      soundEngine.playWin();
      const duelLine = DOOR_RESTORED_STORY[zId]?.[1];
      this.showBanner(
        duelLine || `Pintu Duel "${ZONE_DOORS[zId][1].name}" Berhasil Dibuka!`,
        4.0,
      );
      this.checkAreaTrophy(zId);
      this.saveProgress();
      this.pushHud(true);
      return;
    }

    if (this.worldMode === 'academy' && battle.isAcademyShadow) {
      const m = this.academyMonsters.find((item) => item.id === battle.monsterId);
      if (m) {
        m.alive = false;
        m.mesh.visible = false;
        m.respawnTimer = TUNE.respawnSec;
      }
      this.gainXp(45);
      this.score += 350;
      soundEngine.playWin();
      this.showBanner(`${battle.monsterName} dikalahkan! +45 XP!`, 3.0);
    } else if (this.worldMode === 'dungeon' && this.dungeonState) {
      const m = this.dungeonMonsters.find((item) => item.id === battle.monsterId);
      if (m) {
        m.alive = false;
        m.mesh.visible = false;
        // Mark all carried words seen/mastered boost
        if (m.wordIds) {
          m.wordIds.forEach((wId) => {
            if (!this.wordProgress[wId]) {
              this.wordProgress[wId] = { b: 1, r: 1, w: 0 };
            }
          });
        }
        this.gainXp(m.rewardXp);
        this.score += m.rewardScore;
        this.spawnBurst(m.x, 2.0, m.z, 0xfacc15, 28);
      }

      if (battle.isZoneBoss) {
        const zId = this.dungeonState.zoneId;
        const boss = BOSSES[zId];
        const caveStory = ZONE_CAVE_STORIES[zId];
        this.defeatedBossZones.add(zId);
        this.dungeonState.bossDefeated = true;
        this.dungeonState.prisonKeySpawned = true;
        this.dungeonState.monstersRemaining = 0;
        this.clearCaveBoulders();
        this.shooters.forEach((s) => {
          s.alive = false;
          s.mesh.visible = false;
        });
        this.dungeonMonsters.forEach((dm) => {
          dm.alive = false;
          dm.mesh.visible = false;
        });
        this.applyAtmosphere('dungeon', zId, true);
        if (this.dungeonRig) {
          this.dungeonRig.prisonKeyGroup.visible = true;
        }
        this.hp = Math.min(this.maxHp, this.hp + 2);
        this.gainXp(80);
        this.score += 500;
        this.spawnBurst(0, 2.0, -9, 0xfacc15, 42);
        this.spawnBurst(this.heroPos.x, 2.4, this.heroPos.z, 0xfef08a, 24);
        soundEngine.playFanfare();
        const cornerHint =
          caveStory.prisonCorner === 'nw' ? 'Kiri Atas (Barat Laut)' : 'Kanan Atas (Timur Laut)';
        this.showBanner(
          `✨ Bos ${boss.name} kalah! Gua menjadi terang! Ambil Kunci Penjara Emas di tengah gua lalu gali sudut ${cornerHint} untuk menyelamatkan ${caveStory.captiveName}!`,
          6.0,
        );
      } else if (m?.isAmbush) {
        this.diamonds += 1;
        if (this.ownedWeapons.size > 0) {
          this.weaponAmmo[this.activeWeapon] = Math.min(
            MAX_AMMO,
            this.weaponAmmo[this.activeWeapon] + 3,
          );
        }
        soundEngine.playWin();
        this.showBanner(
          `${battle.monsterName} kalah! +${m.rewardXp} XP · +1 💎 · +3 Peluru!`,
          3.2,
        );
      } else {
        const remainingNonBoss = this.dungeonMonsters.filter(
          (item) => item.alive && !item.isBoss && !item.isAmbush && !item.isCaveMob,
        ).length;
        this.dungeonState.monstersRemaining = remainingNonBoss;
        this.updateDungeonDoorVisuals();
        soundEngine.playWin();
        this.showBanner(
          remainingNonBoss > 0
            ? `${battle.monsterName} kalah! Sisa ${remainingNonBoss} kelompok monster kata.`
            : 'Semua monster kata kalah! Buka Pintu ke-5 untuk memanggil Bos!',
          3.4,
        );
      }
      this.checkAreaTrophy(this.dungeonState.zoneId);
    } else {
      // Overworld roaming monster (+10 XP, +1 Diamond)
      const m = this.monsters.find((item) => item.id === battle.monsterId);
      if (m) {
        m.alive = false;
        m.respawnTimer = TUNE.respawnSec;
        m.mesh.visible = false;
        this.gainXp(10);
        this.diamonds += 1;
        this.score += m.rewardScore;
        this.spawnBurst(m.x, 1.8, m.z, 0xfacc15, 24);
      }
      soundEngine.playWin();
      this.showBanner(`Menang melawan ${battle.monsterName}! +10 XP · +1 💎`, 2.8);
    }

    this.saveProgress();
    this.pushHud(true);
  }

  private gainXp(amount: number): void {
    const prevLv = getLevelInfo(this.xp).level;
    this.xp += amount;
    const nextLv = getLevelInfo(this.xp);
    if (nextLv.level > prevLv) {
      this.hp = this.maxHp;
      soundEngine.playFanfare();
      this.showBanner(`NAIK LEVEL ${nextLv.level}: ${nextLv.title}! Nyawa pulih penuh!`, 3.6);
      this.spawnBurst(this.heroPos.x, 2.5, this.heroPos.z, 0xfacc15, 28);
    }
  }

  private showBanner(msg: string, duration = 2.8): void {
    this.bannerMessage = msg;
    this.bannerTimer = duration;
  }

  private spawnBurst(x: number, y: number, z: number, colorHex: number, count: number): void {
    if (this.settings.fxLevel === 'off') return;
    const actual = this.settings.fxLevel === 'lite' ? Math.max(2, Math.ceil(count / 3)) : count;
    let spawned = 0;
    _color.setHex(colorHex);
    for (let i = 0; i < this.particles.length && spawned < actual; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        const a = Math.random() * Math.PI * 2;
        const spd = 2.5 + Math.random() * 6.5;
        p.vx = Math.cos(a) * spd;
        p.vy = 3.5 + Math.random() * 6;
        p.vz = Math.sin(a) * spd;
        p.life = 0;
        p.maxLife = 0.55 + Math.random() * 0.4;
        this.particleMesh.setColorAt(i, _color);
        spawned++;
      }
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  public setVirtualMove(vx: number, vz: number): void {
    this.virtualMove.x = vx;
    this.virtualMove.z = vz;
    if (Math.hypot(vx, vz) > 0.1) {
      this.tapMoveTarget = null;
    }
  }

  public triggerPrimaryAction(): void {
    if (this.phase !== 'playing') return;

    if (this.worldMode === 'dungeon' && this.nearPrisonKey) {
      this.collectPrisonKey();
      return;
    }

    if (this.worldMode === 'dungeon' && this.nearHiddenPrison) {
      this.interactWithHiddenPrison();
      return;
    }

    if (this.worldMode !== 'overworld' && this.nearDungeonExit) {
      this.exitDungeon();
      return;
    }

    if (this.worldMode === 'dungeon' && this.nearbyDoorIndex !== null) {
      this.openDungeonDoor(this.nearbyDoorIndex);
      return;
    }

    if (
      this.worldMode === 'dungeon' &&
      this.dungeonRig &&
      !this.dungeonRig.weaponChest.collected &&
      Math.hypot(
        this.heroPos.x - this.dungeonRig.weaponChest.x,
        this.heroPos.z - this.dungeonRig.weaponChest.z,
      ) < 4.2 &&
      Math.abs(this.heroPos.y - this.dungeonRig.weaponChest.y) < 1.8
    ) {
      this.collectCaveWeaponChest();
      return;
    }

    if (this.worldMode === 'dungeon' && this.nearCraftingTable) {
      this.openCraftingTable();
      return;
    }

    if (this.worldMode === 'dungeon' && this.nearbyDungeonGuardian) {
      this.talkToCaveGuardian();
      return;
    }

    if (
      this.worldMode === 'dungeon' &&
      this.targetedCaveBlock &&
      this.targetedCaveBlock.kind === 'word_seal'
    ) {
      this.openWordSealChallenge(this.targetedCaveBlock);
      return;
    }

    if (this.worldMode === 'academy' && this.nearbyNpcId) {
      const npc = ACADEMY_NPCS.find((n) => n.id === this.nearbyNpcId);
      if (npc?.academySkill === 'exit') {
        this.exitDungeon();
      } else if (npc?.academySkill) {
        this.phase = 'academy';
        this.heldKeys.clear();
        this.callbacks.onOpenAcademyExam(npc.academySkill);
        this.pushHud(true);
      }
      return;
    }

    if (this.worldMode === 'overworld' && this.nearbyNpcId) {
      this.phase = 'dialogue';
      this.heldKeys.clear();
      this.callbacks.onOpenNpcDialogue(this.nearbyNpcId);
      this.pushHud(true);
      return;
    }

    if (this.worldMode === 'overworld' && this.nearPortal) {
      this.enterAcademy();
      return;
    }

    if (this.nearbyMonsterId) {
      const pool = this.getActiveMonsters();
      const m = pool.find((item) => item.id === this.nearbyMonsterId && item.alive);
      if (m) {
        this.engageMonster(m);
        return;
      }
    }

    // Otherwise Dash
    if (this.dashCooldown <= 0) {
      this.dashCooldown = 1.1;
      this.pulseRingTimer = 0.4;
      _forward.set(Math.sin(this.heroYaw), 0, Math.cos(this.heroYaw));
      this.heroVel.addScaledVector(_forward, 22);
      soundEngine.playDash();
    }
  }

  private collectPrisonKey(): void {
    if (
      !this.dungeonRig ||
      !this.dungeonState ||
      !this.dungeonState.prisonKeySpawned ||
      this.dungeonState.prisonKeyCollected
    ) {
      return;
    }
    this.dungeonState.prisonKeyCollected = true;
    this.dungeonRig.prisonKeyGroup.visible = false;
    this.nearPrisonKey = false;
    this.spawnBurst(0, 1.6, -9, 0xfacc15, 28);
    soundEngine.playPick();
    const cornerLabel =
      ZONE_CAVE_STORIES[this.dungeonState.zoneId].prisonCorner === 'nw'
        ? 'Kiri Atas (Barat Laut)'
        : 'Kanan Atas (Timur Laut)';
    this.showBanner(
      `🔑 Kunci Penjara Emas didapat! Gali batu sudut ${cornerLabel} & buka sel untuk menyelamatkan ${this.dungeonState.captiveName}!`,
      5.2,
    );
    this.saveProgress();
    this.pushHud(true);
  }

  private interactWithHiddenPrison(): void {
    if (!this.dungeonRig || !this.dungeonState || this.dungeonState.prisonUnlocked) return;
    if (!this.dungeonState.prisonKeyCollected) {
      soundEngine.playNo();
      this.showBanner(
        this.dungeonState.bossDefeated
          ? `Penjara ${this.dungeonState.captiveName} masih terkunci! Ambil Kunci Emas di tengah gua dulu!`
          : `Penjara ${this.dungeonState.captiveName} terkunci rapat! Buka 5 Pintu & kalahkan Bos untuk merebut Kuncinya!`,
        3.8,
      );
      return;
    }
    this.dungeonState.prisonUnlocked = true;
    this.nearHiddenPrison = false;
    this.spawnBurst(
      this.dungeonRig.prisonPos.x,
      1.8,
      this.dungeonRig.prisonPos.z,
      0x34d399,
      36,
    );
    this.startDungeonRescueCutscene(this.dungeonState.zoneId);
  }

  private talkToCaveGuardian(): void {
    if (!this.dungeonState) return;
    const zId = this.dungeonState.zoneId;
    const story = ZONE_CAVE_STORIES[zId];
    soundEngine.playPick();
    if (this.dungeonState.liberated) {
      this.showBanner(`${story.guardianName}: "${story.rescueGuardianId}"`, 4.8);
      soundEngine.speakEnglish(story.rescueGuardianEn);
    } else if (this.dungeonState.prisonKeyCollected) {
      const corner =
        story.prisonCorner === 'nw' ? 'Kiri Atas (Barat Laut)' : 'Kanan Atas (Timur Laut)';
      this.showBanner(
        `${story.guardianName}: Kamu sudah pegang Kuncinya! Cepat buka sel rahasia di sudut ${corner} untuk selamatkan ${story.captiveName}!`,
        4.6,
      );
    } else if (this.dungeonState.bossDefeated) {
      this.showBanner(
        `${story.guardianName}: Gua sudah terang! Ambil Kunci Penjara Emas di tengah arena lalu bebaskan ${story.captiveName}!`,
        4.6,
      );
    } else {
      this.showBanner(
        `${story.guardianName}: Buka 5 Pintu Misi & kalahkan Bos agar ${story.captiveName} bisa diselamatkan!`,
        4.2,
      );
    }
  }

  public openWordSealChallenge(block?: CaveBlockDef): void {
    const target = block || this.targetedCaveBlock;
    if (!target || !target.alive || target.kind !== 'word_seal' || !this.dungeonState) return;
    const pool = getWordsForZone(this.dungeonState.zoneId);
    if (pool.length === 0) return;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    this.phase = 'learning';
    this.heldKeys.clear();
    this.callbacks.onOpenCaveSeal({
      blockId: target.id,
      zoneId: this.dungeonState.zoneId,
      vocabId: picked.id,
    });
    this.pushHud(true);
  }

  public resolveWordSeal(blockId: string, correct: boolean, vocabId: string): void {
    this.recordWordAttempt(vocabId, correct, false);
    this.phase = 'playing';
    this.applyCameraVisibilityAndControls();

    if (correct) {
      const blk = this.dungeonRig?.caveBlocks.find((b) => b.id === blockId && b.alive);
      if (blk) {
        this.shatterCaveBlock(blk, true);
      } else {
        this.diamonds += 2;
        this.gainXp(15);
        soundEngine.playWin();
      }
    } else {
      this.hp = Math.max(0, this.hp - 1);
      soundEngine.playHurt();
      if (this.hp <= 0) {
        this.triggerDefeatExit(this.dungeonState?.zoneId);
        return;
      }
      this.showBanner('Jawaban belum tepat! Segel tetap kokoh (-1 ❤️)', 2.8);
    }
    this.saveProgress();
    this.pushHud(true);
  }

  private updateBlockCrackVisual(blk: CaveBlockDef): void {
    const rig = this.dungeonRig;
    if (!rig) return;
    if (!blk.alive || blk.hp <= 0 || blk.hp >= blk.maxHp) {
      if (blk.crackMesh) blk.crackMesh.visible = false;
      return;
    }
    const frac = 1 - blk.hp / Math.max(1, blk.maxHp);
    const stage = Math.min(3, Math.max(0, Math.floor(frac * 4)));
    if (!blk.crackMesh) {
      const cMesh = new THREE.Mesh(rig.crackGeo, rig.crackMaterials[stage]);
      cMesh.position.set(blk.x, blk.y, blk.z);
      rig.group.add(cMesh);
      blk.crackMesh = cMesh;
    } else {
      blk.crackMesh.position.set(blk.x, blk.y, blk.z);
      blk.crackMesh.material = rig.crackMaterials[stage];
      blk.crackMesh.visible = true;
    }
  }

  private shatterCaveBlock(blk: CaveBlockDef, fromQuiz: boolean): void {
    blk.alive = false;
    blk.mesh.visible = false;
    if (blk.crackMesh) blk.crackMesh.visible = false;
    this.caveBlocksMined += 1;
    if (this.targetedCaveBlock?.id === blk.id) {
      this.targetedCaveBlock = null;
      if (this.dungeonRig) this.dungeonRig.blockHighlight.visible = false;
    }

    const burstColor =
      blk.kind === 'diamond_ore'
        ? 0x22d3ee
        : blk.kind === 'heart_ore'
        ? 0xfb7185
        : blk.kind === 'word_seal'
        ? 0xc084fc
        : blk.kind === 'moss_dirt'
        ? 0x22c55e
        : 0x94a3b8;
    this.spawnBurst(blk.x, 1.2, blk.z, burstColor, 20);
    soundEngine.playBoom();

    if (blk.kind === 'diamond_ore') {
      this.diamonds += 1;
      this.gainXp(10);
      this.score += 120;
      soundEngine.playPick();
      this.showBanner('Bijih Berlian Ditambang! +1 💎 · +10 XP!', 2.8);
    } else if (blk.kind === 'heart_ore') {
      this.hp = Math.min(this.maxHp, this.hp + 1);
      this.gainXp(6);
      this.score += 80;
      soundEngine.playPick();
      this.showBanner('Kristal Hati Ditemukan! +1 ❤️ · +6 XP!', 2.8);
    } else if (blk.kind === 'word_seal') {
      this.diamonds += 2;
      this.gainXp(15);
      this.score += 240;
      if (this.ownedWeapons.size > 0) {
        this.weaponAmmo[this.activeWeapon] = Math.min(
          MAX_AMMO,
          this.weaponAmmo[this.activeWeapon] + 4,
        );
      }
      soundEngine.playWin();
      this.showBanner(
        fromQuiz
          ? 'Segel Kata Terpecahkan! +2 💎 · +4 Peluru · +15 XP!'
          : 'Obsidian Segel Kata Hancur! +2 💎 · +15 XP!',
        3.2,
      );
    } else if (blk.kind === 'player_shield') {
      this.caveShieldBlocksLeft = Math.min(32, this.caveShieldBlocksLeft + 1);
      this.showBanner('Blok Pelindung diambil kembali (+1 🧱)!', 2.0);
    } else if (blk.kind === 'moss_dirt') {
      this.gainXp(2);
      this.score += 25;
      this.caveShieldBlocksLeft = Math.min(32, this.caveShieldBlocksLeft + 1);
      if (this.ownedWeapons.size > 0 && Math.random() < 0.35) {
        this.weaponAmmo[this.activeWeapon] = Math.min(
          MAX_AMMO,
          this.weaponAmmo[this.activeWeapon] + 1,
        );
        this.showBanner('Tanah Berlumut Digali! +1 🧱 Blok · +1 Peluru', 2.2);
      } else if (this.caveTorchesLeft < 24 && Math.random() < 0.35) {
        this.caveTorchesLeft += 1;
        this.showBanner('Menemukan +1 Obor 🔦 & +1 🧱 Blok Pelindung!', 2.2);
      } else {
        this.showBanner('Tanah Berlumut Digali! +1 🧱 Blok Pelindung', 1.8);
      }
    } else {
      this.gainXp(2);
      this.score += 30;
      this.caveShieldBlocksLeft = Math.min(32, this.caveShieldBlocksLeft + 1);
      if (this.caveTorchesLeft < 24 && Math.random() < 0.25) {
        this.caveTorchesLeft += 1;
        this.showBanner('Batu Gua Pecah! +1 🧱 Blok · +1 Obor 🔦!', 2.2);
      } else {
        this.showBanner('Batu Gua Pecah! +1 🧱 Blok Pelindung (Tekan B untuk pasang)', 2.2);
      }
    }

    if (!fromQuiz && blk.hasAmbush && this.worldMode === 'dungeon' && this.dungeonState) {
      this.spawnCaveAmbushMonster(blk.x, blk.z, 'Penjaga Tambang', 0xf97316);
      this.showBanner('AWAS KEJUTAN TAMBANG! Penjaga Gua muncul dari balik balok!', 3.2);
    }
  }

  private spawnCaveAmbushMonster(
    originX: number,
    originZ: number,
    title: string,
    accentHex: number,
  ): void {
    if (!this.dungeonRig || !this.dungeonState) return;
    const zId = this.dungeonState.zoneId;
    const zoneWords = getWordsForZone(zId);
    const pickedWords: string[] = [];
    for (let i = 0; i < Math.min(4, zoneWords.length); i++) {
      const w = zoneWords[Math.floor(Math.random() * zoneWords.length)];
      if (w && !pickedWords.includes(w.id)) pickedWords.push(w.id);
    }

    let dx = originX - this.heroPos.x;
    let dz = originZ - this.heroPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.4) {
      dx = -this.heroPos.x;
      dz = -this.heroPos.z;
    }
    const len = Math.max(0.5, Math.hypot(dx, dz));
    const sx = THREE.MathUtils.clamp(this.heroPos.x + (dx / len) * 2.5, -17.2, 17.2);
    const sz = THREE.MathUtils.clamp(this.heroPos.z + (dz / len) * 2.5, -17.2, 17.2);

    this.ambushSeq += 1;
    const isCombatAmbush = Math.random() < 0.4;
    const id = `ambush_${zId}_${this.ambushSeq}`;
    const mesh = createMonsterMesh(
      isCombatAmbush ? 'jam_pasir' : 'bayangan_kata',
      this.palette,
      isCombatAmbush ? 1.02 : 0.95,
    );
    mesh.position.set(sx, 0, sz);
    mesh.userData.monsterId = id;

    if (isCombatAmbush) {
      const auraRing = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.25, 16),
        new THREE.MeshBasicMaterial({
          color: 0xef4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        }),
      );
      auraRing.rotation.x = -Math.PI / 2;
      auraRing.position.y = 0.08;
      mesh.add(auraRing);
      mesh.userData.combatRing = auraRing;
    }

    this.dungeonRig.group.add(mesh);
    this.dungeonClickables.push(mesh);

    this.dungeonMonsters.push({
      id,
      type: isCombatAmbush ? 'jam_pasir' : 'bayangan_kata',
      name: isCombatAmbush ? title.replace('Penjaga', 'Petarung') : title,
      zoneId: zId,
      homeX: sx,
      homeZ: sz,
      x: sx,
      z: sz,
      maxHp: isCombatAmbush ? 3 : 2,
      mobHp: isCombatAmbush ? 3 : undefined,
      maxMobHp: isCombatAmbush ? 3 : undefined,
      combatOnly: isCombatAmbush,
      aggroActive: isCombatAmbush,
      attackCooldown: 1.1,
      windupTimer: -1,
      lungeTimer: 0,
      hitFlashTimer: 0,
      rewardXp: 30,
      rewardDiamonds: 1,
      rewardScore: 260,
      isAmbush: true,
      wordIds: isCombatAmbush ? undefined : pickedWords,
      mesh,
      alive: true,
      respawnTimer: 0,
      patrolPhase: Math.random() * Math.PI * 2,
      angryTimer: 0,
      stanceHp: isCombatAmbush ? undefined : 2,
    });

    this.encounterGraceTimer = Math.max(this.encounterGraceTimer, 1.15);
    soundEngine.playBoss();
    this.spawnBurst(sx, 1.8, sz, accentHex, 24);
  }

  private performCaveMeleeStrike(damage: number): boolean {
    if (this.worldMode !== 'dungeon') return false;
    let hitAny = false;
    for (const m of this.dungeonMonsters) {
      if (!m.alive || (!m.combatOnly && !m.isCaveMob)) continue;
      const dist = Math.hypot(m.x - this.heroPos.x, m.z - this.heroPos.z);
      if (dist <= 3.35) {
        hitAny = true;
        this.damageRealTimeMonster(m, damage, m.x - this.heroPos.x, m.z - this.heroPos.z);
        break;
      }
    }
    return hitAny;
  }

  private damageRealTimeMonster(
    m: RoamingMonster,
    damage: number,
    dirX: number,
    dirZ: number,
  ): void {
    m.mobHp = (m.mobHp ?? m.maxMobHp ?? 4) - damage;
    if (m.type === 'creeper_kata') {
      m.fuseTimer = -1;
      m.mesh.scale.setScalar(1.0);
    } else if (m.combatOnly) {
      m.aggroActive = true;
      m.hitFlashTimer = 0.22;
    }

    const len = Math.max(0.25, Math.hypot(dirX, dirZ));
    m.x = THREE.MathUtils.clamp(m.x + (dirX / len) * 1.15, -18, 18);
    m.z = THREE.MathUtils.clamp(m.z + (dirZ / len) * 1.15, -18, 18);
    soundEngine.playHit();
    this.spawnBurst(m.x, (m.y ?? 0) + 1.3, m.z, m.combatOnly ? 0xef4444 : 0x22c55e, 12);

    if (m.mobHp <= 0) {
      this.handleRealTimeMonsterDefeated(m);
    } else if (m.combatOnly) {
      this.showBanner(
        `⚔️ Kena ${m.name}! Sisa HP ${m.mobHp}/${m.maxMobHp ?? 4}`,
        1.4,
      );
    } else {
      this.showBanner(`Kena ${m.name}! Tembak 1× lagi untuk melumpuhkan!`, 1.4);
    }
  }

  private handleRealTimeMonsterDefeated(m: RoamingMonster): void {
    m.alive = false;
    m.mesh.visible = false;
    soundEngine.playBoom();
    this.spawnBurst(m.x, (m.y ?? 0) + 1.5, m.z, 0xfacc15, 26);

    if (m.isCaveMob) {
      m.respawnTimer = 28;
      this.gainXp(15);
      this.score += m.rewardScore;
      if (this.ownedWeapons.size > 0) {
        this.weaponAmmo[this.activeWeapon] = Math.min(
          MAX_AMMO,
          this.weaponAmmo[this.activeWeapon] + 3,
        );
      }
      if (m.type === 'creeper_kata') {
        this.caveShieldBlocksLeft = Math.min(32, this.caveShieldBlocksLeft + 1);
      } else {
        this.caveTorchesLeft = Math.min(24, this.caveTorchesLeft + 1);
      }
      this.showBanner(
        `${m.name} kalah! +15 XP · +3 Peluru · ${m.type === 'creeper_kata' ? '+1 🧱' : '+1 🔦'}`,
        2.6,
      );
      return;
    }

    // Combat-only Cave Guardian or Combat Ambush!
    this.monstersDefeated += 1;
    this.gainXp(m.rewardXp);
    this.score += m.rewardScore;
    if (this.ownedWeapons.size > 0) {
      this.weaponAmmo[this.activeWeapon] = Math.min(
        MAX_AMMO,
        this.weaponAmmo[this.activeWeapon] + 4,
      );
    }
    if (this.hp < this.maxHp) {
      this.hp += 1;
    } else {
      this.diamonds += 1;
    }

    if (this.dungeonState && !m.isAmbush) {
      const remainingNonBoss = this.dungeonMonsters.filter(
        (item) => item.alive && !item.isBoss && !item.isAmbush && !item.isCaveMob,
      ).length;
      this.dungeonState.monstersRemaining = remainingNonBoss;
      this.updateDungeonDoorVisuals();
      this.showBanner(
        remainingNonBoss > 0
          ? `⚔️ ${m.name} kalah dalam duel aksi! +${m.rewardXp} XP · +4 Peluru (Sisa ${remainingNonBoss} penjaga)`
          : '⚔️ Semua Penjaga Gua kalah! Buka Pintu ke-5 untuk memanggil Bos!',
        3.4,
      );
    } else {
      this.showBanner(
        `⚔️ ${m.name} kalah! +${m.rewardXp} XP · +4 Peluru · +1 ❤️/💎!`,
        3.0,
      );
    }
    this.saveProgress();
    this.pushHud(true);
  }

  public mineTargetedBlock(): void {
    if (this.phase !== 'playing') return;
    this.fpSwingTimer = 0.24;

    if (this.worldMode !== 'dungeon' || !this.dungeonRig) {
      soundEngine.playDash();
      this.showBanner('Masuk ke Gua Wilayah (lewat NPC/Peta) untuk menambang blok gua!', 2.6);
      return;
    }

    const blk = this.targetedCaveBlock;
    if (!blk || !blk.alive) {
      if (this.performCaveMeleeStrike(this.pickaxeTier)) {
        this.saveProgress();
        this.pushHud(true);
        return;
      }
      soundEngine.playDash();
      this.showBanner('Arahkan ke blok batu atau Petarung Gua di depanmu!', 2.0);
      return;
    }

    blk.hp -= this.pickaxeTier;
    soundEngine.playHit();
    const chipHex =
      blk.kind === 'diamond_ore'
        ? 0x22d3ee
        : blk.kind === 'heart_ore'
        ? 0xfb7185
        : blk.kind === 'word_seal'
        ? 0xc084fc
        : 0x94a3b8;
    this.spawnBurst(blk.x, blk.y + 0.2, blk.z, chipHex, 8);

    if (blk.hp <= 0) {
      this.shatterCaveBlock(blk, false);
    } else {
      blk.mesh.scale.setScalar(0.92);
      if (blk.crackMesh) blk.crackMesh.scale.setScalar(0.92);
      this.updateBlockCrackVisual(blk);
    }
    this.saveProgress();
    this.pushHud(true);
  }

  public placeCaveTorch(): void {
    if (this.phase !== 'playing') return;
    this.fpSwingTimer = 0.24;

    if (this.worldMode !== 'dungeon' || !this.dungeonRig) {
      soundEngine.playDash();
      this.showBanner('Masuk ke Gua Wilayah untuk memasang Obor penerang!', 2.6);
      return;
    }

    if (this.caveTorchesLeft <= 0) {
      soundEngine.playNo();
      this.showBanner('Obor habis! Gali Batu Gua untuk mendapat tambahan obor.', 2.6);
      return;
    }

    const dirX =
      this.cameraMode === 'first_person'
        ? -Math.sin(this.cameraYaw)
        : Math.sin(this.heroYaw);
    const dirZ =
      this.cameraMode === 'first_person'
        ? -Math.cos(this.cameraYaw)
        : Math.cos(this.heroYaw);

    const tx = THREE.MathUtils.clamp(this.heroPos.x + dirX * 2.1, -19.2, 19.2);
    const tz = THREE.MathUtils.clamp(this.heroPos.z + dirZ * 2.1, -19.2, 19.2);

    // Prevent placing inside a solid block or stacking directly on another torch
    for (const blk of this.dungeonRig.caveBlocks) {
      if (!blk.alive) continue;
      if (Math.abs(tx - blk.x) < 1.1 && Math.abs(tz - blk.z) < 1.1) {
        soundEngine.playNo();
        this.showBanner('Titik tertutup blok batu! Mundur sedikit atau gali dulu.', 2.0);
        return;
      }
    }
    for (const t of this.caveTorches) {
      if (Math.hypot(tx - t.x, tz - t.z) < 1.3) {
        soundEngine.playNo();
        this.showBanner('Sudah ada obor terang di titik ini!', 1.8);
        return;
      }
    }

    this.caveTorchesLeft -= 1;
    const torchMesh = createCaveTorchMesh(this.palette);
    torchMesh.position.set(tx, 0, tz);
    this.dungeonRig.group.add(torchMesh);

    // Cap active dynamic PointLights to 8 per cave for smooth FPS on HP & Software WebGL
    let light: THREE.PointLight | null = null;
    const activeLightsCount = this.caveTorches.filter((item) => item.light !== null).length;
    if (activeLightsCount >= 8) {
      const oldest = this.caveTorches.find((item) => item.light !== null);
      if (oldest && oldest.light) {
        light = oldest.light;
        oldest.light = null;
        light.position.set(tx, 1.5, tz);
      }
    }
    if (!light) {
      light = new THREE.PointLight(0xffb74d, 4.4, 18, 1.55);
      light.position.set(tx, 1.5, tz);
      this.dungeonRig.group.add(light);
    }

    this.caveTorches.push({ x: tx, z: tz, mesh: torchMesh, light });
    this.spawnBurst(tx, 1.35, tz, 0xfacc15, 10);
    soundEngine.playBuild();
    this.showBanner('Obor dipasang! Jalur gua terang & monster di dekat cahaya lebih tenang.', 2.6);
    this.pushHud(true);
  }

  private getDungeonSupportHeight(x: number, z: number, refY: number): number {
    if (this.worldMode !== 'dungeon' || !this.dungeonRig) return 0;
    let supportY = 0;
    for (const p of this.dungeonRig.platforms) {
      if (Math.abs(x - p.x) <= p.halfW + 0.35 && Math.abs(z - p.z) <= p.halfD + 0.35) {
        if (refY >= p.topY - 0.65) {
          supportY = Math.max(supportY, p.topY);
        }
      }
    }
    for (const blk of this.dungeonRig.caveBlocks) {
      if (!blk.alive) continue;
      if (Math.abs(x - blk.x) <= blk.halfW + 0.35 && Math.abs(z - blk.z) <= blk.halfW + 0.35) {
        const topY = blk.y + 1.1;
        if (refY >= topY - 0.65) {
          supportY = Math.max(supportY, topY);
        }
      }
    }
    return supportY;
  }

  public jumpHero(): void {
    if (this.phase !== 'playing' || !this.heroOnGround) return;
    this.heroVelY = 11.4;
    this.heroOnGround = false;
    soundEngine.playDash();
  }

  public openCraftingTable(): void {
    if (this.phase !== 'playing' || this.worldMode !== 'dungeon') return;
    this.phase = 'learning';
    this.heldKeys.clear();
    this.callbacks.onOpenCrafting();
    this.pushHud(true);
  }

  public craftCaveItem(recipe: 'pickaxe_2' | 'pickaxe_3' | 'torches' | 'ammo' | 'tnt'): void {
    if (recipe === 'pickaxe_2') {
      if (this.pickaxeTier >= 2 || this.caveShieldBlocksLeft < 4) {
        soundEngine.playNo();
        return;
      }
      this.caveShieldBlocksLeft -= 4;
      this.pickaxeTier = 2;
      this.showBanner('Beliung Besi (Tier 2) dibuat! Gali 2× lebih cepat!', 3.2);
    } else if (recipe === 'pickaxe_3') {
      if (this.pickaxeTier < 2 || this.pickaxeTier >= 3 || this.caveShieldBlocksLeft < 4 || this.diamonds < 2) {
        soundEngine.playNo();
        return;
      }
      this.caveShieldBlocksLeft -= 4;
      this.diamonds -= 2;
      this.pickaxeTier = 3;
      this.showBanner('Beliung Berlian (Tier 3) dibuat! Gali 3× lebih cepat!', 3.4);
    } else if (recipe === 'torches') {
      if (this.caveShieldBlocksLeft < 2 || this.caveTorchesLeft >= 24) {
        soundEngine.playNo();
        return;
      }
      this.caveShieldBlocksLeft -= 2;
      this.caveTorchesLeft = Math.min(24, this.caveTorchesLeft + 6);
      this.showBanner('Berhasil merakit +6 Obor Gua (🔦)!', 2.6);
    } else if (recipe === 'ammo') {
      if (this.ownedWeapons.size === 0 || this.caveShieldBlocksLeft < 2 || this.diamonds < 1) {
        soundEngine.playNo();
        return;
      }
      this.caveShieldBlocksLeft -= 2;
      this.diamonds -= 1;
      this.weaponAmmo[this.activeWeapon] = Math.min(
        MAX_AMMO,
        (this.weaponAmmo[this.activeWeapon] || 0) + 10,
      );
      this.showBanner(`Amunisi ${WEAPONS[this.activeWeapon].name} +10 Peluru dibuat!`, 2.8);
    } else if (recipe === 'tnt') {
      if (this.caveShieldBlocksLeft < 3 || this.caveTntLeft >= 16) {
        soundEngine.playNo();
        return;
      }
      this.caveShieldBlocksLeft -= 3;
      this.caveTntLeft = Math.min(16, this.caveTntLeft + 2);
      this.showBanner('Berhasil merakit +2 TNT Tambang (🧨 · Slot T)!', 3.0);
    }
    soundEngine.playUpgrade();
    this.refreshWeaponVisual();
    this.saveProgress();
    this.pushHud(true);
  }

  private getShieldPlacementCoords(): { x: number; y: number; z: number } {
    const dirX =
      this.cameraMode === 'first_person'
        ? -Math.sin(this.cameraYaw)
        : Math.sin(this.heroYaw);
    const dirZ =
      this.cameraMode === 'first_person'
        ? -Math.cos(this.cameraYaw)
        : Math.cos(this.heroYaw);
    const rawX = this.heroPos.x + dirX * 2.45;
    const rawZ = this.heroPos.z + dirZ * 2.45;
    const x = THREE.MathUtils.clamp(Math.round(rawX / 2) * 2, -18, 18);
    const z = THREE.MathUtils.clamp(Math.round(rawZ / 2) * 2, -18, 18);
    const supportTop = this.getDungeonSupportHeight(x, z, this.heroPos.y + 0.35);
    const y = Math.min(3.3, supportTop + 1.1);
    return { x, y, z };
  }

  public placeShieldBlock(): void {
    if (this.phase !== 'playing') return;
    this.fpSwingTimer = 0.22;

    if (this.worldMode !== 'dungeon' || !this.dungeonRig || !this.dungeonState) {
      soundEngine.playDash();
      this.showBanner('Masuk ke Gua Wilayah untuk menyusun Blok Pelindung!', 2.6);
      return;
    }

    if (this.caveShieldBlocksLeft <= 0) {
      soundEngine.playNo();
      this.showBanner('Stok Blok Pelindung habis! Gali Batu Gua (Slot 9 ⛏️) untuk dapat blok.', 2.6);
      return;
    }

    const { x: bx, y: by, z: bz } = this.getShieldPlacementCoords();
    if (Math.hypot(bx - this.heroPos.x, bz - this.heroPos.z) < 1.35 && Math.abs(by - (this.heroPos.y + 1.1)) < 1.1) {
      soundEngine.playNo();
      this.showBanner('Terlalu dekat dengan posisimu! Arahkan sedikit lebih jauh.', 1.8);
      return;
    }

    for (const col of this.dungeonRig.caveColliders) {
      if (Math.abs(bx - col.x) < 1.5 && Math.abs(bz - col.z) < 1.5) {
        soundEngine.playNo();
        this.showBanner('Titik tertutup pilar batu!', 1.8);
        return;
      }
    }
    for (const blk of this.dungeonRig.caveBlocks) {
      if (
        blk.alive &&
        Math.abs(bx - blk.x) < 1.5 &&
        Math.abs(bz - blk.z) < 1.5 &&
        Math.abs(by - blk.y) < 1.4
      ) {
        soundEngine.playNo();
        this.showBanner('Sudah ada blok di kotak ini!', 1.8);
        return;
      }
    }
    for (const door of ZONE_DOORS[this.dungeonState.zoneId]) {
      if (Math.hypot(bx - door.x, bz - door.z) < 2.6) {
        soundEngine.playNo();
        this.showBanner('Tidak bisa menutup gerbang Pintu Misi!', 2.0);
        return;
      }
    }
    if (Math.hypot(bx - this.dungeonExitPos.x, bz - this.dungeonExitPos.z) < 3.0) {
      soundEngine.playNo();
      this.showBanner('Tidak bisa menutup portal keluar gua!', 2.0);
      return;
    }

    this.caveShieldBlocksLeft -= 1;
    const id = `ps_${Date.now()}_${Math.floor(Math.random() * 999)}`;
    const mesh = new THREE.Mesh(this.dungeonRig.shieldBlockGeo, this.dungeonRig.shieldBlockMat);
    mesh.position.set(bx, by, bz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.caveBlockId = id;
    this.dungeonRig.group.add(mesh);
    this.dungeonClickables.push(mesh);

    this.dungeonRig.caveBlocks.push({
      id,
      kind: 'player_shield',
      label: 'Blok Pelindung',
      x: bx,
      y: by,
      z: bz,
      halfW: 1.0,
      hp: 4,
      maxHp: 4,
      mesh,
      alive: true,
    });

    this.spawnBurst(bx, by + 0.1, bz, 0x38bdf8, 10);
    soundEngine.playBuild();
    this.showBanner(
      'Blok Pelindung dipasang! Bisa jadi benteng peluru, penahan Creeper, atau pijakan jembatan!',
      2.6,
    );
    this.saveProgress();
    this.pushHud(true);
  }

  public placeAndTriggerTnt(): void {
    if (this.phase !== 'playing') return;
    this.fpSwingTimer = 0.24;

    if (this.worldMode !== 'dungeon' || !this.dungeonRig) {
      soundEngine.playDash();
      this.showBanner('Masuk ke Gua Wilayah untuk memasang TNT Tambang!', 2.6);
      return;
    }

    if (this.caveTntLeft <= 0) {
      soundEngine.playNo();
      this.showBanner('TNT habis! Buat lagi di ⚒️ Meja Craft gua (3 🧱 = +2 🧨).', 2.6);
      return;
    }

    const dirX =
      this.cameraMode === 'first_person'
        ? -Math.sin(this.cameraYaw)
        : Math.sin(this.heroYaw);
    const dirZ =
      this.cameraMode === 'first_person'
        ? -Math.cos(this.cameraYaw)
        : Math.cos(this.heroYaw);
    const tx = THREE.MathUtils.clamp(this.heroPos.x + dirX * 2.1, -18.0, 18.0);
    const tz = THREE.MathUtils.clamp(this.heroPos.z + dirZ * 2.1, -18.0, 18.0);
    const ty = this.getDungeonSupportHeight(tx, tz, this.heroPos.y + 0.5);

    this.caveTntLeft -= 1;
    const mesh = createCaveTntMesh(this.palette);
    mesh.position.set(tx, ty, tz);
    this.dungeonRig.group.add(mesh);
    this.activeTnts.push({ x: tx, y: ty, z: tz, timer: 1.7, mesh });

    soundEngine.playBuild();
    this.showBanner('🧨 TNT aktif! Menjauh — meledak dalam 1,7 detik!', 2.2);
    this.saveProgress();
    this.pushHud(true);
  }

  private collectCaveWeaponChest(): void {
    const rig = this.dungeonRig;
    if (!rig || rig.weaponChest.collected) return;
    rig.weaponChest.collected = true;
    rig.weaponChest.group.visible = false;

    const firstUnlock = !this.ownedWeapons.has('kerikil');
    this.ownedWeapons.add('kerikil');
    const gainAmmo = firstUnlock ? 12 : 10;
    this.weaponAmmo.kerikil = Math.min(MAX_AMMO, (this.weaponAmmo.kerikil || 0) + gainAmmo);
    if (!firstUnlock) {
      this.diamonds += 1;
    }
    this.activeWeapon = 'kerikil';
    const slotIdx = WEAPON_ORDER.indexOf('kerikil');
    if (slotIdx >= 0) this.activeHotbarSlot = slotIdx;

    this.refreshWeaponVisual();
    this.spawnBurst(rig.weaponChest.x, rig.weaponChest.y + 1.5, rig.weaponChest.z, 0x38bdf8, 28);
    if (firstUnlock) {
      soundEngine.playFanfare();
      this.showBanner(
        'Peti Rahasia Gua! Dapat Ketapel Kerikil (+12 Peluru · 3× bidik buka kuis monster)!',
        4.6,
      );
    } else {
      soundEngine.playPick();
      this.showBanner('Peti Rahasia Gua! +10 Peluru Kerikil & +1 💎!', 3.4);
    }
    this.saveProgress();
    this.pushHud(true);
  }

  public fireActiveWeapon(): void {
    if (this.phase !== 'playing') return;

    if (this.activeHotbarSlot === 8) {
      this.mineTargetedBlock();
      return;
    }
    if (this.activeHotbarSlot === 9) {
      this.placeCaveTorch();
      return;
    }
    if (this.activeHotbarSlot === 10) {
      this.placeShieldBlock();
      return;
    }
    if (this.activeHotbarSlot === 11) {
      this.placeAndTriggerTnt();
      return;
    }

    if (this.ownedWeapons.size === 0) {
      this.showBanner(
        '🔎 Belum punya senjata! Ikuti cahaya biru ke kiri Alun-Alun untuk mengambil Senjata Pertamamu!',
        3.2,
      );
      soundEngine.playNo();
      return;
    }

    const slotWeapon = WEAPON_ORDER[this.activeHotbarSlot];
    if (slotWeapon && !this.ownedWeapons.has(slotWeapon)) {
      this.showBanner(
        `${WEAPONS[slotWeapon].name} belum terbuka! (${WEAPONS[slotWeapon].originLabel})`,
        2.8,
      );
      soundEngine.playNo();
      return;
    }

    if (this.fireCooldown > 0) return;

    const wDef = WEAPONS[this.activeWeapon];
    if ((this.weaponAmmo[this.activeWeapon] || 0) <= 0) {
      this.fireCooldown = 0.35;
      this.fpSwingTimer = 0.2;
      if (this.performCaveMeleeStrike(1)) {
        this.saveProgress();
        this.pushHud(true);
        return;
      }
      soundEngine.playNo();
      this.showBanner(`Peluru ${wDef.name} habis! Gali batu / pakai Beliung untuk pukulan dekat.`, 2.6);
      return;
    }

    this.weaponAmmo[this.activeWeapon] -= 1;
    this.fireCooldown = wDef.cooldown;
    this.fpSwingTimer = 0.2;
    soundEngine.playShoot();

    // Auto-Aim within 34 units toward nearest Shooter or Word Monster
    let aimYaw = this.heroYaw;
    let bestDist = TUNE.autoAimRange;
    for (const s of this.shooters) {
      if (!s.alive) continue;
      const d = Math.hypot(s.x - this.heroPos.x, s.z - this.heroPos.z);
      if (d < bestDist) {
        bestDist = d;
        aimYaw = Math.atan2(s.x - this.heroPos.x, s.z - this.heroPos.z);
      }
    }
    for (const m of this.getActiveMonsters()) {
      if (!m.alive) continue;
      const d = Math.hypot(m.x - this.heroPos.x, m.z - this.heroPos.z);
      if (d < bestDist) {
        bestDist = d;
        aimYaw = Math.atan2(m.x - this.heroPos.x, m.z - this.heroPos.z);
      }
    }
    this.heroYaw = aimYaw;

    const angles = wDef.spread === 3 ? [-0.22, 0, 0.22] : [0];
    for (const offset of angles) {
      const a = aimYaw + offset;
      this.spawnProjectile({
        fromPlayer: true,
        x: this.heroPos.x + Math.sin(a) * 1.1,
        z: this.heroPos.z + Math.cos(a) * 1.1,
        vx: Math.sin(a) * wDef.speed,
        vz: Math.cos(a) * wDef.speed,
        damage: wDef.damage,
        shieldDamage: wDef.shieldDamage,
        pierceLeft: wDef.pierce || 0,
        colorHex: wDef.colorHex,
      });
    }
    this.pushHud(true);
  }

  private spawnProjectile(opts: {
    fromPlayer: boolean;
    x: number;
    z: number;
    vx: number;
    vz: number;
    damage: number;
    shieldDamage: number;
    pierceLeft: number;
    colorHex: number;
  }): void {
    const slot = this.projectiles.find((p) => !p.active);
    if (!slot) return;
    slot.active = true;
    slot.fromPlayer = opts.fromPlayer;
    slot.x = opts.x;
    slot.z = opts.z;
    slot.vx = opts.vx;
    slot.vz = opts.vz;
    slot.damage = opts.damage;
    slot.shieldDamage = opts.shieldDamage;
    slot.pierceLeft = opts.pierceLeft;
    slot.hitIds.clear();
    slot.life = 1.45;
    (slot.mesh.material as THREE.MeshBasicMaterial).color.setHex(opts.colorHex);
    slot.mesh.scale.setScalar(opts.damage > 1 ? 1.45 : 1.0);
    slot.mesh.position.set(opts.x, 1.35, opts.z);
    slot.mesh.visible = true;
  }

  private getActiveMonsters(): RoamingMonster[] {
    if (this.worldMode === 'dungeon') return this.dungeonMonsters;
    if (this.worldMode === 'academy') return this.academyMonsters;
    return this.monsters;
  }

  private engageMonster(m: RoamingMonster): void {
    if (m.combatOnly || m.isCaveMob) return;
    this.phase = 'battle';
    this.heldKeys.clear();
    this.tapMoveTarget = null;
    soundEngine.playBoss();
    const isZoneBoss = Boolean(m.isBoss && this.worldMode === 'dungeon');
    const boss = isZoneBoss ? BOSSES[m.zoneId] : undefined;
    this.callbacks.onStartBattle({
      monsterId: m.id,
      monsterType: m.type,
      monsterName: m.name,
      zoneId: m.zoneId,
      isIeltsBoss: false,
      isZoneBoss,
      isAcademyShadow: m.isAcademyShadow,
      academySkill: m.academySkill,
      bossMechanic: boss?.mechanic,
      isMixedChallenge: this.worldMode === 'dungeon' && Boolean(this.dungeonState?.isMixedChallenge),
      monsterHp: isZoneBoss && boss ? boss.hpPerPhase : m.maxHp,
      monsterMaxHp: isZoneBoss && boss ? boss.hpPerPhase : m.maxHp,
      bossPhase: isZoneBoss ? 1 : undefined,
      roundNumber: 1,
      wordIds: m.wordIds,
    });
    this.pushHud(true);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('pointercancel', this.onPointerCancel);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onWindowBlur = (): void => {
    this.heldKeys.clear();
    this.lookPointer = null;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    this.heldKeys.add(e.code);
    if (e.repeat) return;

    if (this.phase === 'playing') {
      if (e.code.startsWith('Digit')) {
        const num = Number(e.code.slice(5));
        if (num >= 1 && num <= 9) {
          this.selectHotbarSlot(num - 1);
          return;
        }
        if (num === 0) {
          this.selectHotbarSlot(9);
          return;
        }
      }
      if (e.code === 'KeyB') {
        this.selectHotbarSlot(10);
        return;
      }
      if (e.code === 'KeyT') {
        this.selectHotbarSlot(11);
        return;
      }
      if (e.code === 'KeyJ' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        this.jumpHero();
        return;
      }
      if (e.code === 'KeyE' || e.code === 'Enter') {
        e.preventDefault();
        this.triggerPrimaryAction();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (this.activeHotbarSlot >= 8 || this.ownedWeapons.size > 0) {
          this.fireActiveWeapon();
        } else {
          this.triggerPrimaryAction();
        }
      } else if (e.code === 'KeyF') {
        if (this.dashCooldown <= 0) {
          this.dashCooldown = 1.1;
          this.pulseRingTimer = 0.4;
          _forward.set(Math.sin(this.heroYaw), 0, Math.cos(this.heroYaw));
          this.heroVel.addScaledVector(_forward, 22);
          soundEngine.playDash();
        }
      } else if (e.code === 'KeyC' || e.code === 'F5') {
        e.preventDefault();
        this.toggleCameraMode();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private onWheel = (e: WheelEvent): void => {
    if (this.phase !== 'playing') return;
    if (this.cameraMode === 'third_back' || this.cameraMode === 'third_front') {
      e.preventDefault();
      this.thirdPersonDist = THREE.MathUtils.clamp(
        this.thirdPersonDist + e.deltaY * 0.008,
        4.0,
        15.0,
      );
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (this.phase !== 'playing') return;
    if (this.lookPointer === null) {
      this.lookPointer = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: false,
      };
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.phase !== 'playing' || this.cameraMode === 'orbit') return;

    if (document.pointerLockElement === this.renderer.domElement) {
      this.cameraYaw -= e.movementX * 0.0045;
      const minP = this.cameraMode === 'first_person' ? -1.1 : -0.36;
      this.cameraPitch = THREE.MathUtils.clamp(
        this.cameraPitch + e.movementY * 0.004,
        minP,
        1.12,
      );
      return;
    }

    if (!this.lookPointer || this.lookPointer.id !== e.pointerId) return;
    const dx = e.clientX - this.lookPointer.lastX;
    const dy = e.clientY - this.lookPointer.lastY;
    this.lookPointer.lastX = e.clientX;
    this.lookPointer.lastY = e.clientY;

    if (
      !this.lookPointer.moved &&
      Math.hypot(e.clientX - this.lookPointer.startX, e.clientY - this.lookPointer.startY) > 5
    ) {
      this.lookPointer.moved = true;
    }

    if (this.lookPointer.moved) {
      const sens = e.pointerType === 'touch' ? 0.0072 : 0.0048;
      this.cameraYaw -= dx * sens;
      const minP = this.cameraMode === 'first_person' ? -1.1 : -0.36;
      this.cameraPitch = THREE.MathUtils.clamp(
        this.cameraPitch + dy * sens,
        minP,
        1.12,
      );
    }
  };

  private onPointerCancel = (e: PointerEvent): void => {
    if (this.lookPointer?.id === e.pointerId) {
      this.lookPointer = null;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    const lp = this.lookPointer;
    if (lp && lp.id === e.pointerId) {
      this.lookPointer = null;
      if (lp.moved) return;
    } else if (lp !== null) {
      return;
    }
    if (this.phase !== 'playing') return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    const targets =
      this.worldMode === 'dungeon'
        ? this.dungeonClickables
        : this.worldMode === 'academy'
        ? this.academyClickables
        : this.overworldClickables;
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (
        obj &&
        !obj.userData.npcId &&
        !obj.userData.monsterId &&
        !obj.userData.portal &&
        !obj.userData.dungeonExit &&
        !obj.userData.academyExit &&
        !obj.userData.caveBlockId &&
        !obj.userData.caveWeaponChest &&
        !obj.userData.craftingTable &&
        !obj.userData.caveGuardian &&
        !obj.userData.prisonKey &&
        !obj.userData.hiddenPrison &&
        obj.userData.doorIndex === undefined
      ) {
        obj = obj.parent;
      }
      if (obj) {
        if (obj.userData.prisonKey && this.worldMode === 'dungeon' && this.dungeonState) {
          if (Math.hypot(this.heroPos.x, this.heroPos.z + 9) < 6.5) {
            this.collectPrisonKey();
          } else {
            this.tapMoveTarget = new THREE.Vector3(0, 0, -9);
            this.showBanner('Menuju Kunci Penjara Emas...', 2.0);
          }
          return;
        }
        if (
          obj.userData.hiddenPrison &&
          this.worldMode === 'dungeon' &&
          this.dungeonRig &&
          this.dungeonState
        ) {
          if (
            Math.hypot(
              this.dungeonRig.prisonPos.x - this.heroPos.x,
              this.dungeonRig.prisonPos.z - this.heroPos.z,
            ) < 6.0
          ) {
            this.interactWithHiddenPrison();
          } else {
            this.tapMoveTarget = this.dungeonRig.prisonPos.clone();
            this.showBanner(`Menuju Penjara Tersembunyi (${this.dungeonState.captiveName})...`, 2.2);
          }
          return;
        }
        if (
          obj.userData.caveGuardian &&
          this.worldMode === 'dungeon' &&
          this.dungeonRig
        ) {
          if (
            Math.hypot(
              this.dungeonRig.guardianPos.x - this.heroPos.x,
              this.dungeonRig.guardianPos.z - this.heroPos.z,
            ) < 6.5
          ) {
            this.talkToCaveGuardian();
          } else {
            this.tapMoveTarget = new THREE.Vector3(2.8, 0, 12.2);
            this.showBanner(`Menuju ${this.dungeonState?.guardianName || 'Penjaga Gua'}...`, 2.0);
          }
          return;
        }
        if (
          obj.userData.craftingTable &&
          this.worldMode === 'dungeon' &&
          this.dungeonRig &&
          Math.hypot(
            this.dungeonRig.craftingTablePos.x - this.heroPos.x,
            this.dungeonRig.craftingTablePos.z - this.heroPos.z,
          ) < 7.5
        ) {
          this.openCraftingTable();
          return;
        }
        if (
          obj.userData.caveWeaponChest &&
          this.worldMode === 'dungeon' &&
          this.dungeonRig &&
          !this.dungeonRig.weaponChest.collected &&
          Math.hypot(
            this.dungeonRig.weaponChest.x - this.heroPos.x,
            this.dungeonRig.weaponChest.z - this.heroPos.z,
          ) < 7.5
        ) {
          if (Math.abs(this.heroPos.y - this.dungeonRig.weaponChest.y) < 1.8) {
            this.collectCaveWeaponChest();
          } else {
            this.showBanner('Lompat ke atas tebing batu (⬆️ / J) untuk mengambil Peti Senjata!', 2.4);
          }
          return;
        }
        if (obj.userData.caveBlockId && this.worldMode === 'dungeon' && this.dungeonRig) {
          const blk = this.dungeonRig.caveBlocks.find(
            (b) => b.id === obj!.userData.caveBlockId && b.alive,
          );
          if (blk && Math.hypot(blk.x - this.heroPos.x, blk.z - this.heroPos.z) < 7.5) {
            this.targetedCaveBlock = blk;
            this.dungeonRig.blockHighlight.position.set(blk.x, blk.y, blk.z);
            this.dungeonRig.blockHighlight.visible = true;
            if (blk.kind === 'word_seal' && this.activeHotbarSlot !== 8) {
              this.openWordSealChallenge(blk);
            } else if (this.activeHotbarSlot === 8) {
              this.mineTargetedBlock();
            } else if (this.activeHotbarSlot === 9) {
              this.placeCaveTorch();
            } else if (this.activeHotbarSlot === 10) {
              this.placeShieldBlock();
            } else if (this.activeHotbarSlot === 11) {
              this.placeAndTriggerTnt();
            } else {
              this.showBanner(`Pilih Slot 9 (⛏️ Beliung) untuk menggali ${blk.label}!`, 2.2);
            }
            return;
          }
        }
        if (obj.userData.dungeonExit || obj.userData.academyExit) {
          this.exitDungeon();
          return;
        }
        if (obj.userData.doorIndex !== undefined && this.worldMode === 'dungeon') {
          this.openDungeonDoor(Number(obj.userData.doorIndex));
          return;
        }
        if (obj.userData.npcId) {
          if (this.worldMode === 'academy') {
            const npc = ACADEMY_NPCS.find((n) => n.id === obj!.userData.npcId);
            if (npc?.academySkill === 'exit') this.exitDungeon();
            else if (npc?.academySkill) {
              this.phase = 'academy';
              this.callbacks.onOpenAcademyExam(npc.academySkill);
            }
          } else {
            this.phase = 'dialogue';
            this.heldKeys.clear();
            this.callbacks.onOpenNpcDialogue(obj.userData.npcId as string);
          }
          this.pushHud(true);
          return;
        }
        if (obj.userData.portal && this.worldMode === 'overworld') {
          this.enterAcademy();
          return;
        }
        if (obj.userData.starterPickup && this.worldMode === 'overworld' && !this.starterWeaponPicked) {
          this.tapMoveTarget = new THREE.Vector3(-7, 0, 12);
          this.showBanner('Menuju ke Senjata Pertamamu...', 2.0);
          return;
        }
        if (obj.userData.villageId && this.worldMode === 'overworld') {
          const vItem = this.villageRig.interactables.find(
            (item) => item.id === obj!.userData.villageId,
          );
          if (vItem) {
            this.showBanner(vItem.message, 3.4);
            soundEngine.playPick();
          }
          return;
        }
        if (obj.userData.monsterId) {
          const m = this.getActiveMonsters().find((item) => item.id === obj!.userData.monsterId && item.alive);
          if (m) {
            if (m.combatOnly || m.isCaveMob) {
              this.heroYaw = Math.atan2(m.x - this.heroPos.x, m.z - this.heroPos.z);
              this.fireActiveWeapon();
            } else {
              this.engageMonster(m);
            }
            return;
          }
        }
      }
    }

    // Tap-to-Move onto ground plane!
    const groundHit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, groundHit)) {
      this.tapMoveTarget = groundHit;
      this.spawnBurst(groundHit.x, 0.3, groundHit.z, 0x38bdf8, 6);
    }
  };

  private scheduleNextTick(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = (now - this.lastTimeMs) / 1000;
    this.lastTimeMs = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    this.elapsed += dt;

    this.updateWorldAnimations(dt);
    if (this.phase === 'title') {
      const a = this.elapsed * 0.14;
      _v1.set(Math.cos(a) * 40, 21 + Math.sin(this.elapsed * 0.4) * 2.0, Math.sin(a) * 40);
      this.camera.position.lerp(_v1, 1 - Math.exp(-3 * dt));
      this.controls.target.set(2, 2.5, 4);
      this.controls.update();
    } else if (this.phase === 'story') {
      this.updateStoryAnimations(dt);
      this.controls.update();
    } else if (this.phase === 'playing') {
      this.updatePlaying(dt);
      if (this.cameraMode === 'orbit') {
        this.controls.update();
      }
    } else {
      if (this.cameraMode === 'orbit') {
        this.controls.update();
      }
    }
    this.updateParticles(dt);

    this.renderer.render(this.scene, this.camera);

    if (now - this.lastHudPushMs > 85) {
      this.pushHud(false);
    }
    this.scheduleNextTick();
  };

  private updateStoryAnimations(dt: number): void {
    this.storyTimer += dt;

    if (this.storyDialog?.kind === 'dungeon_intro' && this.dungeonRig) {
      const walkDuration = 1.7;
      const t = Math.min(1, this.storyTimer / walkDuration);
      this.heroPos.lerpVectors(this.cutsceneStartPos, this.cutsceneTargetPos, t);
      this.hero.root.position.copy(this.heroPos);

      if (t < 1) {
        this.walkCycle += dt * 11;
        const swing = Math.sin(this.walkCycle) * 0.58;
        this.hero.leftLeg.rotation.x = swing;
        this.hero.rightLeg.rotation.x = -swing;
        this.hero.leftArm.rotation.x = -swing * 0.7;
        this.hero.rightArm.rotation.x = swing * 0.5;
        this.hero.body.position.y = Math.abs(Math.sin(this.walkCycle)) * 0.1;
        this.heroYaw = Math.atan2(
          this.cutsceneTargetPos.x - this.cutsceneStartPos.x,
          this.cutsceneTargetPos.z - this.cutsceneStartPos.z,
        );
      } else {
        this.hero.leftLeg.rotation.x *= 0.8;
        this.hero.rightLeg.rotation.x *= 0.8;
        this.hero.leftArm.rotation.x *= 0.8;
        this.hero.rightArm.rotation.x *= 0.8;
        this.hero.body.position.y = 0;
        this.heroYaw = Math.atan2(
          this.dungeonRig.guardianPos.x - this.heroPos.x,
          this.dungeonRig.guardianPos.z - this.heroPos.z,
        );
      }
      this.hero.body.rotation.y = this.heroYaw;
      this.playerCaveLight.position.set(this.heroPos.x, 2.8, this.heroPos.z);

      _v1.set(0.2, 3.1, 16.2);
      this.camera.position.lerp(_v1, 1 - Math.exp(-3.2 * dt));
      _v2.set(3.4, 1.75, 12.1);
      this.controls.target.lerp(_v2, 1 - Math.exp(-3.6 * dt));
      return;
    }

    if (this.storyDialog?.kind === 'dungeon_rescue' && this.dungeonRig) {
      this.dungeonRig.captiveMesh.position.set(
        3.3,
        Math.abs(Math.sin(this.elapsed * 6.5)) * 0.34,
        11.8,
      );
      this.hero.leftLeg.rotation.x *= 0.8;
      this.hero.rightLeg.rotation.x *= 0.8;
      this.hero.body.position.y = 0;
      this.heroYaw = Math.atan2(3.8 - this.heroPos.x, 11.8 - this.heroPos.z);
      this.hero.body.rotation.y = this.heroYaw;

      _v1.set(0.5, 3.1, 16.4);
      this.camera.position.lerp(_v1, 1 - Math.exp(-4.0 * dt));
      _v2.set(3.5, 1.75, 12.0);
      this.controls.target.lerp(_v2, 1 - Math.exp(-4.0 * dt));
      return;
    }

    const flap = Math.sin(this.elapsed * 16) * 0.65;
    this.owlRig.leftWing.rotation.z = flap;
    this.owlRig.rightWing.rotation.z = -flap;

    if (this.owlState === 'fly') {
      const p = Math.min(1, this.storyTimer / 2.6);
      this.owlRig.root.position.set(
        THREE.MathUtils.lerp(-24, 2, p),
        10 - Math.sin(p * Math.PI) * 3.5,
        THREE.MathUtils.lerp(18, 12, p),
      );
      this.owlRig.root.rotation.y = Math.PI * 0.45;
    } else if (this.owlState === 'land') {
      this.owlRig.root.position.y = 2.0 + Math.sin(this.elapsed * 3) * 0.2;
      this.owlRig.leftWing.rotation.z = 0.15;
      this.owlRig.rightWing.rotation.z = -0.15;
    }
  }

  private updateWorldAnimations(dt: number): void {
    this.waterUniforms.uTime.value = this.elapsed;

    // Owl leaving flight after story completes
    if (this.owlState === 'leave' && this.owlRig.root.visible) {
      this.storyTimer += dt;
      const flap = Math.sin(this.elapsed * 18) * 0.7;
      this.owlRig.leftWing.rotation.z = flap;
      this.owlRig.rightWing.rotation.z = -flap;
      this.owlRig.root.position.y += dt * 12;
      this.owlRig.root.position.x += dt * 10;
      if (this.storyTimer > 1.4) {
        this.owlRig.root.visible = false;
        this.owlState = 'hidden';
      }
    }

    if (this.worldMode !== 'overworld') {
      for (const obj of this.dungeonAnimatables) {
        if (obj.userData.animKind === 'spinZ') {
          obj.rotation.z += dt * 1.4;
        } else if (obj.userData.animKind === 'bob') {
          const base = Number(obj.userData.baseY || 3.5);
          const ph = Number(obj.userData.phase || 0);
          obj.position.y = base + Math.sin(this.elapsed * 2.8 + ph) * 0.35;
          obj.rotation.y += dt * 1.6;
        }
      }

      // Gently restore mined block wobble, sync cracks, & flicker placed cave torch flames
      if (this.worldMode === 'dungeon' && this.dungeonRig) {
        if (!this.dungeonState?.liberated) {
          this.dungeonRig.guardianMesh.rotation.z = Math.sin(this.elapsed * 9) * 0.04;
          this.dungeonRig.guardianMesh.position.y = Math.abs(Math.sin(this.elapsed * 2.5)) * 0.04;
        } else {
          this.dungeonRig.guardianMesh.rotation.z = 0;
          this.dungeonRig.guardianMesh.position.y = Math.abs(Math.sin(this.elapsed * 4.2)) * 0.12;
          if (this.phase !== 'story') {
            this.dungeonRig.captiveMesh.position.y =
              Math.abs(Math.sin(this.elapsed * 5.0 + 0.7)) * 0.14;
          }
        }
        for (const blk of this.dungeonRig.caveBlocks) {
          if (blk.alive && blk.mesh.scale.x < 0.999) {
            const s = THREE.MathUtils.lerp(blk.mesh.scale.x, 1, 1 - Math.exp(-14 * dt));
            blk.mesh.scale.setScalar(s);
            if (blk.crackMesh) blk.crackMesh.scale.setScalar(s);
          }
        }
        this.caveTorches.forEach((t, idx) => {
          const flame = t.mesh.children.find((c) => c.userData.isFlame);
          if (flame) {
            flame.scale.y = 0.92 + Math.sin(this.elapsed * 13 + idx * 1.7) * 0.2;
          }
          if (t.light) {
            t.light.intensity = 4.2 + Math.sin(this.elapsed * 11 + idx * 2.1) * 0.45;
          }
        });
        this.updateDungeonHazards(dt);
      }
    }

    // Animate active monster pool (torches inside caves calm nearby monsters!)
    const baseSpeedMult = this.settings.difficulty === 'pendekar' ? 1.3 : 1.0;
    for (const m of this.getActiveMonsters()) {
      if (!m.alive) {
        if (this.phase === 'playing' && m.respawnTimer > 0) {
          m.respawnTimer -= dt;
          if (m.respawnTimer <= 0) {
            m.alive = true;
            m.mesh.visible = true;
            m.x = m.homeX;
            m.z = m.homeZ;
            if (m.isCaveMob) {
              m.mobHp = 2;
              m.fuseTimer = m.type === 'creeper_kata' ? -1 : undefined;
              m.y = m.type === 'kelelawar_gua' ? 3.4 : 0;
              m.mesh.scale.setScalar(m.type === 'kelelawar_gua' ? 1.05 : 1.0);
            }
          }
        }
        continue;
      }
      if (m.angryTimer > 0) {
        m.angryTimer -= dt;
        m.mesh.scale.setScalar((m.isBoss ? 1.65 : 1.0) * (1 + Math.sin(this.elapsed * 30) * 0.12));
        if (m.angryTimer <= 0) {
          m.mesh.scale.setScalar(m.isBoss ? 1.65 : 1.0);
          this.engageMonster(m);
        }
        continue;
      }

      let calmMult = 1.0;
      if (this.worldMode === 'dungeon' && this.caveTorches.length > 0) {
        for (const t of this.caveTorches) {
          if (Math.hypot(m.x - t.x, m.z - t.z) < 6.5) {
            calmMult = 0.45;
            break;
          }
        }
      }

      // Special AI 1: Creeper Kata (chases Hoot, hisses & swells, explodes unless blocked by Blok Pelindung!)
      if (m.type === 'creeper_kata' && this.worldMode === 'dungeon' && this.dungeonRig) {
        const dxH = this.heroPos.x - m.x;
        const dzH = this.heroPos.z - m.z;
        const distH = Math.hypot(dxH, dzH);

        if (m.fuseTimer !== undefined && m.fuseTimer >= 0) {
          if (this.phase === 'playing') {
            if (distH > 6.4) {
              m.fuseTimer = -1;
              m.mesh.scale.setScalar(1.0);
            } else {
              m.fuseTimer -= dt;
              const swell = 1 + (1.65 - Math.max(0, m.fuseTimer)) * 0.24 + Math.sin(this.elapsed * 34) * 0.08;
              m.mesh.scale.setScalar(swell);
              m.mesh.rotation.y = Math.atan2(dxH, dzH);
              if (m.fuseTimer <= 0) {
                m.alive = false;
                m.mesh.visible = false;
                m.respawnTimer = 26;
                m.fuseTimer = -1;
                m.mesh.scale.setScalar(1.0);
                soundEngine.playBoom();
                this.spawnBurst(m.x, 1.5, m.z, 0x22c55e, 34);

                let blockedByShield = false;
                for (const blk of this.dungeonRig.caveBlocks) {
                  if (!blk.alive || blk.kind !== 'player_shield') continue;
                  const distBlk = Math.hypot(blk.x - m.x, blk.z - m.z);
                  const nearHeroLine =
                    distBlk < 2.8 ||
                    (distH > 0.2 &&
                      Math.hypot(blk.x - (m.x + dxH * 0.5), blk.z - (m.z + dzH * 0.5)) < 2.1);
                  if (nearHeroLine) {
                    blockedByShield = true;
                    blk.hp -= 2;
                    blk.mesh.scale.setScalar(0.88);
                    if (blk.hp <= 0) {
                      this.shatterCaveBlock(blk, false);
                    } else {
                      this.updateBlockCrackVisual(blk);
                    }
                    this.showBanner('Blok Pelindung menahan ledakan Creeper Kata!', 2.4);
                    break;
                  }
                }
                if (!blockedByShield && distH < 4.4 && this.encounterGraceTimer <= 0) {
                  this.hp = Math.max(0, this.hp - 1);
                  this.encounterGraceTimer = 1.6;
                  soundEngine.playHurt();
                  const len = Math.max(0.2, distH);
                  this.heroVel.set((dxH / len) * 18, 0, (dzH / len) * 18);
                  this.heroVelY = 6.5;
                  this.showBanner(
                    'BOOM! Terkena ledakan Creeper Kata! Tahan dengan Blok Pelindung (-1 ❤️)',
                    2.6,
                  );
                  if (this.hp <= 0) {
                    this.triggerDefeatExit(this.dungeonState?.zoneId);
                    return;
                  }
                }
              }
            }
          }
          continue;
        }

        let nextMx = m.x;
        let nextMz = m.z;
        if (this.phase === 'playing' && distH < 10.5 && distH > 0.3) {
          const spd = 2.65 * baseSpeedMult * calmMult;
          nextMx += (dxH / distH) * spd * dt;
          nextMz += (dzH / distH) * spd * dt;
          m.mesh.rotation.y = Math.atan2(dxH, dzH);
          if (distH < 3.4) {
            m.fuseTimer = 1.65;
            soundEngine.playHit();
            this.showBanner('SSSS...! Creeper Kata hampir meledak! Pasang Blok Pelindung atau mundur!', 2.2);
          }
        } else {
          const p = this.elapsed * 0.85 * baseSpeedMult * calmMult + m.patrolPhase;
          nextMx = m.homeX + Math.cos(p) * 2.4;
          nextMz = m.homeZ + Math.sin(p * 0.8) * 2.0;
          m.mesh.rotation.y = Math.atan2(-Math.sin(p), Math.cos(p * 0.8));
        }

        const mRad = 0.9;
        const pushCreeperBox = (bx: number, bz: number, hw: number) => {
          const cx = THREE.MathUtils.clamp(nextMx, bx - hw, bx + hw);
          const cz = THREE.MathUtils.clamp(nextMz, bz - hw, bz + hw);
          const dx = nextMx - cx;
          const dz = nextMz - cz;
          const distSq = dx * dx + dz * dz;
          if (distSq < mRad * mRad && distSq > 0.0001) {
            const d = Math.sqrt(distSq);
            nextMx += (dx / d) * (mRad - d);
            nextMz += (dz / d) * (mRad - d);
          }
        };
        for (const col of this.dungeonRig.caveColliders) {
          pushCreeperBox(col.x, col.z, col.halfW);
        }
        for (const blk of this.dungeonRig.caveBlocks) {
          if (blk.alive) pushCreeperBox(blk.x, blk.z, blk.halfW);
        }
        m.x = THREE.MathUtils.clamp(nextMx, -18, 18);
        m.z = THREE.MathUtils.clamp(nextMz, -18, 18);
        m.mesh.position.set(m.x, Math.abs(Math.sin(this.elapsed * 5 + m.patrolPhase)) * 0.16, m.z);
        continue;
      }

      // Special AI 2: Kelelawar Gua (flies near ceiling, flaps wings, swoops down at Hoot!)
      if (m.type === 'kelelawar_gua' && this.worldMode === 'dungeon') {
        const lw = m.mesh.userData.leftWing as THREE.Object3D | undefined;
        const rw = m.mesh.userData.rightWing as THREE.Object3D | undefined;
        const flap = Math.sin(this.elapsed * 16 + m.patrolPhase) * 0.68;
        if (lw) lw.rotation.z = flap;
        if (rw) rw.rotation.z = -flap;

        const dxH = this.heroPos.x - m.x;
        const dzH = this.heroPos.z - m.z;
        const distH = Math.hypot(dxH, dzH);
        let targetY = 3.5 + Math.sin(this.elapsed * 2.6 + m.patrolPhase) * 0.55;

        if (this.phase === 'playing' && distH < 9.5 && calmMult > 0.6) {
          const spd = 3.4 * baseSpeedMult * dt;
          const len = Math.max(0.2, distH);
          m.x = THREE.MathUtils.clamp(m.x + (dxH / len) * spd, -18, 18);
          m.z = THREE.MathUtils.clamp(m.z + (dzH / len) * spd, -18, 18);
          targetY = Math.max(1.55, this.heroPos.y + 1.55);
          m.mesh.rotation.y = Math.atan2(dxH, dzH);
        } else {
          const p = this.elapsed * 1.15 * baseSpeedMult * calmMult + m.patrolPhase;
          m.x = m.homeX + Math.cos(p) * 3.8;
          m.z = m.homeZ + Math.sin(p * 1.3) * 2.8;
          m.mesh.rotation.y = Math.atan2(-Math.sin(p), Math.cos(p * 1.3));
        }

        m.y = THREE.MathUtils.lerp(m.y ?? 3.4, targetY, 1 - Math.exp(-5 * dt));
        m.mesh.position.set(m.x, m.y, m.z);

        if (
          this.phase === 'playing' &&
          this.encounterGraceTimer <= 0 &&
          distH < 1.65 &&
          Math.abs((m.y ?? 3.4) - (this.heroPos.y + 1.15)) < 1.35
        ) {
          this.hp = Math.max(0, this.hp - 1);
          this.encounterGraceTimer = 1.6;
          soundEngine.playHurt();
          this.spawnBurst(this.heroPos.x, this.heroPos.y + 1.3, this.heroPos.z, 0x6366f1, 14);
          m.y = 4.0;
          const len = Math.max(0.2, distH);
          m.x = THREE.MathUtils.clamp(m.x - (dxH / len) * 2.8, -17.5, 17.5);
          m.z = THREE.MathUtils.clamp(m.z - (dzH / len) * 2.8, -17.5, 17.5);
          this.showBanner('Diserang Kelelawar Gua! Tembak dengan senjatamu (-1 ❤️)', 2.2);
          if (this.hp <= 0) {
            this.triggerDefeatExit(this.dungeonState?.zoneId);
            return;
          }
        }
        continue;
      }

      // Special AI 3: 40% Cave Guardians & Ambush Brawlers (Real-Time 3D Combat — NO QUIZ!)
      if (m.combatOnly && this.worldMode === 'dungeon' && this.dungeonRig) {
        const dxH = this.heroPos.x - m.x;
        const dzH = this.heroPos.z - m.z;
        const distH = Math.hypot(dxH, dzH);

        if (m.hitFlashTimer && m.hitFlashTimer > 0) {
          m.hitFlashTimer = Math.max(0, m.hitFlashTimer - dt);
        }
        if (m.attackCooldown && m.attackCooldown > 0) {
          m.attackCooldown = Math.max(0, m.attackCooldown - dt);
        }

        const ring = m.mesh.userData.combatRing as THREE.Object3D | undefined;
        if (ring) {
          ring.rotation.z += dt * 2.5;
        }

        const aggroRange = calmMult < 0.7 ? 7.8 : 12.8;
        if (this.phase === 'playing' && distH < aggroRange) {
          m.aggroActive = true;
        }

        let nextMx = m.x;
        let nextMz = m.z;
        const baseScale = m.isAmbush ? 1.02 : 1.08;
        const flashMult = m.hitFlashTimer && m.hitFlashTimer > 0 ? 0.86 : 1.0;

        // Phase A: Active Lunging Melee Strike!
        if (m.lungeTimer && m.lungeTimer > 0) {
          m.lungeTimer = Math.max(0, m.lungeTimer - dt);
          if (this.phase === 'playing' && distH > 0.2) {
            const spd = 9.4 * dt;
            nextMx += (dxH / distH) * spd;
            nextMz += (dzH / distH) * spd;
          }
          m.mesh.rotation.y = Math.atan2(dxH, dzH);
          m.mesh.rotation.x = 0.36;
          m.mesh.scale.setScalar(baseScale * 1.15 * flashMult);

          const jumpedOver = this.heroPos.y > 1.25;
          let shieldBlocked = false;
          if (distH < 2.25) {
            for (const blk of this.dungeonRig.caveBlocks) {
              if (
                blk.alive &&
                blk.kind === 'player_shield' &&
                Math.hypot(blk.x - (m.x + dxH * 0.5), blk.z - (m.z + dzH * 0.5)) < 1.85
              ) {
                shieldBlocked = true;
                blk.hp -= 1;
                if (blk.hp <= 0) this.shatterCaveBlock(blk, false);
                else this.updateBlockCrackVisual(blk);
                m.lungeTimer = 0;
                this.showBanner('🧱 Blok Pelindung menahan serangan Petarung Gua!', 1.8);
                break;
              }
            }
          }

          if (
            !shieldBlocked &&
            !jumpedOver &&
            this.phase === 'playing' &&
            this.encounterGraceTimer <= 0 &&
            distH < 2.15
          ) {
            this.hp = Math.max(0, this.hp - 1);
            this.encounterGraceTimer = 1.45;
            soundEngine.playHurt();
            const len = Math.max(0.2, distH);
            this.heroVel.set((dxH / len) * 15, 0, (dzH / len) * 15);
            this.heroVelY = 4.8;
            this.spawnBurst(this.heroPos.x, this.heroPos.y + 1.2, this.heroPos.z, 0xef4444, 16);
            this.showBanner(`⚔️ Diserang ${m.name}! Lompat / Tembak untuk membalas (-1 ❤️)`, 2.2);
            if (this.hp <= 0) {
              this.triggerDefeatExit(this.dungeonState?.zoneId);
              return;
            }
          }
        } else if (m.windupTimer !== undefined && m.windupTimer > 0) {
          // Phase B: Telegraphing windup before lunge
          m.windupTimer -= dt;
          m.mesh.rotation.y = Math.atan2(dxH, dzH);
          m.mesh.rotation.x = -0.26;
          m.mesh.scale.setScalar(
            baseScale * (1.14 + Math.sin(this.elapsed * 32) * 0.08) * flashMult,
          );
          if (m.windupTimer <= 0) {
            m.windupTimer = -1;
            m.lungeTimer = 0.28;
            soundEngine.playHit();
          }
        } else if (this.phase === 'playing' && m.aggroActive && distH > 0.2) {
          // Phase C: Relentless Chase + Melee/Ranged Decisions
          m.mesh.rotation.x = 0;
          m.mesh.scale.setScalar(baseScale * flashMult);
          m.mesh.rotation.y = Math.atan2(dxH, dzH);

          if (distH < 2.65 && (m.attackCooldown ?? 0) <= 0) {
            m.windupTimer = 0.52;
            m.attackCooldown = this.settings.difficulty === 'pendekar' ? 1.8 : 2.3;
          } else {
            const spd = 3.25 * baseSpeedMult * calmMult;
            if (distH > 1.7) {
              nextMx += (dxH / distH) * spd * dt;
              nextMz += (dzH / distH) * spd * dt;
            }
            if (distH >= 4.0 && distH < 13.5 && (m.attackCooldown ?? 0) <= 0) {
              const pSpeed = this.settings.difficulty === 'pendekar' ? 10.5 : 8.6;
              this.spawnProjectile({
                fromPlayer: false,
                x: m.x + (dxH / distH) * 1.1,
                z: m.z + (dzH / distH) * 1.1,
                vx: (dxH / distH) * pSpeed,
                vz: (dzH / distH) * pSpeed,
                damage: 1,
                shieldDamage: 1,
                pierceLeft: 0,
                colorHex: 0xef4444,
              });
              m.attackCooldown = this.settings.difficulty === 'pendekar' ? 2.4 : 3.2;
              m.mesh.rotation.x = 0.22;
            }
          }
        } else {
          // Idle Patrol
          m.mesh.rotation.x = 0;
          m.mesh.scale.setScalar(baseScale * flashMult);
          const p = this.elapsed * 0.9 * baseSpeedMult * calmMult + m.patrolPhase;
          nextMx = m.homeX + Math.cos(p) * 2.5;
          nextMz = m.homeZ + Math.sin(p * 0.85) * 2.1;
          m.mesh.rotation.y = Math.atan2(-Math.sin(p), Math.cos(p * 0.85));
        }

        const mRad = 0.95;
        const pushBrawlerBox = (bx: number, bz: number, hw: number) => {
          const cx = THREE.MathUtils.clamp(nextMx, bx - hw, bx + hw);
          const cz = THREE.MathUtils.clamp(nextMz, bz - hw, bz + hw);
          const dx = nextMx - cx;
          const dz = nextMz - cz;
          const distSq = dx * dx + dz * dz;
          if (distSq < mRad * mRad && distSq > 0.0001) {
            const d = Math.sqrt(distSq);
            nextMx += (dx / d) * (mRad - d);
            nextMz += (dz / d) * (mRad - d);
          }
        };
        for (const col of this.dungeonRig.caveColliders) {
          pushBrawlerBox(col.x, col.z, col.halfW);
        }
        for (const blk of this.dungeonRig.caveBlocks) {
          if (blk.alive) pushBrawlerBox(blk.x, blk.z, blk.halfW);
        }
        m.x = THREE.MathUtils.clamp(nextMx, -18, 18);
        m.z = THREE.MathUtils.clamp(nextMz, -18, 18);
        m.mesh.position.set(
          m.x,
          Math.abs(Math.sin(this.elapsed * (m.aggroActive ? 7.5 : 4.2) + m.patrolPhase)) * 0.24,
          m.z,
        );
        continue;
      }

      const p = this.elapsed * 0.85 * baseSpeedMult * calmMult + m.patrolPhase;
      const radius = m.isBoss ? 1.8 : 2.6;
      let nextMx = m.homeX + Math.cos(p) * radius;
      let nextMz = m.homeZ + Math.sin(p * 0.8) * (radius * 0.8);
      if (this.worldMode === 'dungeon' && this.dungeonRig) {
        const mRad = m.isBoss ? 1.25 : 0.95;
        const pushMonsterBox = (bx: number, bz: number, hw: number) => {
          const cx = THREE.MathUtils.clamp(nextMx, bx - hw, bx + hw);
          const cz = THREE.MathUtils.clamp(nextMz, bz - hw, bz + hw);
          const dx = nextMx - cx;
          const dz = nextMz - cz;
          const distSq = dx * dx + dz * dz;
          if (distSq < mRad * mRad && distSq > 0.0001) {
            const d = Math.sqrt(distSq);
            nextMx += (dx / d) * (mRad - d);
            nextMz += (dz / d) * (mRad - d);
          }
        };
        for (const col of this.dungeonRig.caveColliders) {
          pushMonsterBox(col.x, col.z, col.halfW);
        }
        for (const blk of this.dungeonRig.caveBlocks) {
          if (blk.alive) pushMonsterBox(blk.x, blk.z, blk.halfW);
        }
      }
      m.x = nextMx;
      m.z = nextMz;
      m.mesh.position.set(m.x, Math.abs(Math.sin(this.elapsed * 4.2 + m.patrolPhase)) * 0.25, m.z);
      m.mesh.rotation.y = Math.atan2(-Math.sin(p), Math.cos(p * 0.8));
    }

    if (this.worldMode !== 'overworld') return;

    updateMinecraftVillage(this.villageRig, dt, this.elapsed);

    // Gentle blocky Minecraft-style voxel clouds drift across the sky
    const cloudMat = new THREE.Matrix4();
    const cloudPos = new THREE.Vector3();
    const cloudQuat = new THREE.Quaternion();
    const cloudScale = new THREE.Vector3();
    for (let i = 0; i < this.cloudsMesh.count; i++) {
      this.cloudsMesh.getMatrixAt(i, cloudMat);
      cloudMat.decompose(cloudPos, cloudQuat, cloudScale);
      cloudPos.x += dt * 0.9;
      if (cloudPos.x > 105) cloudPos.x = -105;
      cloudMat.compose(cloudPos, cloudQuat, cloudScale);
      this.cloudsMesh.setMatrixAt(i, cloudMat);
    }
    this.cloudsMesh.instanceMatrix.needsUpdate = true;

    this.portalRig.ringOuter.rotation.z += dt * 1.1;
    this.portalRig.ringInner.rotation.z -= dt * 1.8;

    if (this.starterPickupMesh.visible) {
      this.starterPickupMesh.rotation.y += dt * 1.8;
      this.starterPickupMesh.children.forEach((c) => {
        if (c.userData.animOrb) {
          c.position.y += Math.sin(this.elapsed * 3.4) * 0.004;
        } else if (c.userData.animBeacon) {
          const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
          mat.opacity = 0.16 + Math.sin(this.elapsed * 4.0) * 0.09;
        } else if (c.userData.animRing) {
          const s = 1 + Math.sin(this.elapsed * 4.5) * 0.12;
          c.scale.setScalar(s);
        }
      });
    }

    for (const [npcId, npc] of this.npcs.entries()) {
      const q = this.quests.find((item) => item.npcId === npcId);
      const showAlert = !q?.claimed;
      npc.alertMesh.visible = showAlert;
      if (showAlert) {
        npc.alertMesh.position.y = 4.2 + Math.sin(this.elapsed * 3.5 + npc.x) * 0.28;
        npc.alertMesh.rotation.y += dt * 2.2;
      }
    }

    for (let i = 0; i < this.collectibles.length; i++) {
      const c = this.collectibles[i];
      if (!c.active) {
        _dummy.position.set(0, -80, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.diamondInstanced.setMatrixAt(i, _dummy.matrix);
        this.heartInstanced.setMatrixAt(i, _dummy.matrix);
        if (this.phase === 'playing') {
          c.respawnTimer -= dt;
          if (c.respawnTimer <= 0) c.active = true;
        }
        continue;
      }

      _dummy.position.set(c.x, 1.3 + Math.sin(this.elapsed * 3.2 + c.phase) * 0.26, c.z);
      _dummy.rotation.set(0, this.elapsed * 2.2 + c.phase, 0);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();

      if (c.kind === 'diamond') {
        this.diamondInstanced.setMatrixAt(i, _dummy.matrix);
        _dummy.position.set(0, -80, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.heartInstanced.setMatrixAt(i, _dummy.matrix);
      } else {
        this.heartInstanced.setMatrixAt(i, _dummy.matrix);
        _dummy.position.set(0, -80, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.diamondInstanced.setMatrixAt(i, _dummy.matrix);
      }
    }
    this.diamondInstanced.instanceMatrix.needsUpdate = true;
    this.heartInstanced.instanceMatrix.needsUpdate = true;
  }

  private updatePlaying(dt: number): void {
    // Passive Regen timers (Bab 8)
    if (this.hp < this.maxHp) {
      this.hpRegenTimer += dt;
      if (this.hpRegenTimer >= TUNE.regenSec) {
        this.hpRegenTimer = 0;
        this.hp += 1;
        soundEngine.playPick();
        this.showBanner('Regenerasi Hati (+1 ❤️)!', 2.0);
      }
    } else {
      this.hpRegenTimer = 0;
    }

    if (this.ownedWeapons.has('ketapel') && this.weaponAmmo.ketapel < 5) {
      this.ketapelRegenTimer += dt;
      if (this.ketapelRegenTimer >= 20) {
        this.ketapelRegenTimer = 0;
        this.weaponAmmo.ketapel += 1;
      }
    } else {
      this.ketapelRegenTimer = 0;
    }

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    // 1. Movement (Keyboard + Virtual Analog Joystick + Tap-to-Move)
    let mx = this.virtualMove.x;
    let mz = -this.virtualMove.z; // screen up = +forward
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) mz += 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) mz -= 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) mx -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) mx += 1;

    if (Math.hypot(mx, mz) > 0.08) {
      this.tapMoveTarget = null;
      if (this.cameraMode === 'orbit') {
        this.camera.getWorldDirection(_forward);
        _forward.y = 0;
        if (_forward.lengthSq() < 0.001) _forward.set(0, 0, -1);
        _forward.normalize();
        _right.set(-_forward.z, 0, _forward.x).normalize();
      } else {
        _forward.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
        _right.set(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));
      }

      const sprint = this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight') ? 1.35 : 1.0;
      _v3.set(0, 0, 0).addScaledVector(_forward, mz).addScaledVector(_right, mx);
      if (_v3.lengthSq() > 1) _v3.normalize();
      this.heroVel.addScaledVector(_v3, 76 * sprint * dt);
      if (this.cameraMode !== 'first_person') {
        const targetYaw = Math.atan2(_v3.x, _v3.z);
        let diff = targetYaw - this.heroYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.heroYaw += diff * (1 - Math.exp(-15 * dt));
      }
    } else if (this.tapMoveTarget) {
      const dx = this.tapMoveTarget.x - this.heroPos.x;
      const dz = this.tapMoveTarget.z - this.heroPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.8) {
        this.tapMoveTarget = null;
      } else {
        _v3.set(dx / dist, 0, dz / dist);
        this.heroVel.addScaledVector(_v3, 72 * dt);
        if (this.cameraMode !== 'first_person') {
          this.heroYaw = Math.atan2(_v3.x, _v3.z);
        }
      }
    }

    if (this.cameraMode === 'first_person') {
      this.heroYaw = this.cameraYaw + Math.PI;
    }

    this.heroVel.multiplyScalar(Math.exp(-7.5 * dt));
    const prevHeroY = this.heroPos.y;
    this.heroVelY -= 28 * dt;
    this.heroPos.addScaledVector(this.heroVel, dt);
    this.heroPos.y += this.heroVelY * dt;

    if (this.worldMode !== 'overworld') {
      this.heroPos.x = THREE.MathUtils.clamp(this.heroPos.x, -18.5, 18.5);
      this.heroPos.z = THREE.MathUtils.clamp(this.heroPos.z, -18.5, 18.5);
      if (this.worldMode === 'dungeon' && this.dungeonRig) {
        this.resolveCaveBlockCollisions();
      }
      const supportY = this.getDungeonSupportHeight(this.heroPos.x, this.heroPos.z, prevHeroY);
      if (this.heroPos.y <= supportY) {
        this.heroPos.y = supportY;
        this.heroVelY = 0;
        this.heroOnGround = true;
      } else {
        this.heroOnGround = false;
      }
    } else {
      this.heroPos.x = THREE.MathUtils.clamp(this.heroPos.x, -41, 41);
      this.heroPos.z = THREE.MathUtils.clamp(this.heroPos.z, -38, 40);
      // Resolve smooth collisions against village well, market stalls, cottages, and farm fences
      const heroRad = 0.72;
      for (const obs of this.villageRig.obstacles) {
        const cx = THREE.MathUtils.clamp(this.heroPos.x, obs.x - obs.halfW, obs.x + obs.halfW);
        const cz = THREE.MathUtils.clamp(this.heroPos.z, obs.z - obs.halfD, obs.z + obs.halfD);
        const dx = this.heroPos.x - cx;
        const dz = this.heroPos.z - cz;
        const distSq = dx * dx + dz * dz;
        if (distSq < heroRad * heroRad) {
          if (distSq > 0.0001) {
            const d = Math.sqrt(distSq);
            this.heroPos.x += (dx / d) * (heroRad - d);
            this.heroPos.z += (dz / d) * (heroRad - d);
          } else {
            this.heroPos.z = obs.z + obs.halfD + heroRad;
          }
        }
      }
      if (this.heroPos.y <= 0) {
        this.heroPos.y = 0;
        this.heroVelY = 0;
        this.heroOnGround = true;
      } else {
        this.heroOnGround = false;
      }
    }

    const speed = Math.hypot(this.heroVel.x, this.heroVel.z);
    this.hero.root.position.copy(this.heroPos);
    this.hero.body.rotation.y = this.heroYaw;
    if (this.worldMode === 'dungeon') {
      this.playerCaveLight.position.set(this.heroPos.x, this.heroPos.y + 2.8, this.heroPos.z);
    }

    if (speed > 0.6) {
      this.walkCycle += dt * (8 + speed * 0.45);
      const swing = Math.sin(this.walkCycle) * 0.6;
      this.hero.leftLeg.rotation.x = swing;
      this.hero.rightLeg.rotation.x = -swing;
      this.hero.leftArm.rotation.x = -swing * 0.7;
      this.hero.rightArm.rotation.x = swing * 0.5;
      this.hero.body.position.y = Math.abs(Math.sin(this.walkCycle)) * 0.12;
    } else {
      this.hero.leftLeg.rotation.x *= 0.85;
      this.hero.rightLeg.rotation.x *= 0.85;
      this.hero.leftArm.rotation.x *= 0.85;
      this.hero.rightArm.rotation.x *= 0.85;
      this.hero.body.position.y = 0;
    }

    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.pulseRingTimer > 0) {
      this.pulseRingTimer = Math.max(0, this.pulseRingTimer - dt);
      const prog = 1 - this.pulseRingTimer / 0.4;
      this.hero.dashRing.scale.setScalar(1 + prog * 3.5);
      (this.hero.dashRing.material as THREE.MeshBasicMaterial).opacity = (1 - prog) * 0.8;
    } else {
      (this.hero.dashRing.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    if (this.fpSwingTimer > 0) {
      this.fpSwingTimer = Math.max(0, this.fpSwingTimer - dt);
    }

    // Update Camera Rig (GTA 360 Orbital Spring-Arm / FPS / Free Orbit)
    const sinY = Math.sin(this.cameraYaw);
    const cosY = Math.cos(this.cameraYaw);
    const cosP = Math.cos(this.cameraPitch);
    const sinP = Math.sin(this.cameraPitch);
    const targetY = this.heroPos.y + 1.92;

    if (this.cameraMode === 'third_back' || this.cameraMode === 'third_front') {
      const sign = this.cameraMode === 'third_front' ? -1 : 1;
      const desiredDist =
        this.worldMode === 'dungeon' ? Math.min(this.thirdPersonDist, 6.2) : this.thirdPersonDist;
      const dirX = sign * sinY * cosP;
      const dirY = sinP;
      const dirZ = sign * cosY * cosP;

      const blockedDist = this.computeSpringArmDist(
        this.heroPos.x,
        targetY,
        this.heroPos.z,
        dirX,
        dirY,
        dirZ,
        desiredDist,
      );

      // Snap inward ultra-fast when hitting a wall/pillar; ease outward smoothly when clear
      const distAlpha =
        blockedDist < this.currentCamDist
          ? 1 - Math.exp(-32 * dt)
          : 1 - Math.exp(-7.5 * dt);
      this.currentCamDist += (blockedDist - this.currentCamDist) * distAlpha;

      const camX = this.heroPos.x + dirX * this.currentCamDist;
      const camY = Math.max(0.75, targetY + dirY * this.currentCamDist);
      const camZ = this.heroPos.z + dirZ * this.currentCamDist;

      _v1.set(camX, camY, camZ);
      this.camera.position.lerp(_v1, 1 - Math.exp(-24 * dt));
      this.camera.lookAt(this.heroPos.x, targetY, this.heroPos.z);
    } else if (this.cameraMode === 'first_person') {
      const eyeY = this.heroPos.y + 2.55;
      this.camera.position.set(this.heroPos.x, eyeY, this.heroPos.z);
      this.camera.lookAt(
        this.heroPos.x - sinY * cosP * 10,
        eyeY - sinP * 10,
        this.heroPos.z - cosY * cosP * 10,
      );
      const walkBob = speed > 0.6 ? Math.sin(this.walkCycle) : 0;
      const swing = this.fpSwingTimer > 0 ? Math.sin((1 - this.fpSwingTimer / 0.24) * Math.PI) : 0;
      this.fpViewRig.handPivot.position.set(
        0.42 + walkBob * 0.024,
        -0.36 + Math.abs(walkBob) * 0.028 - swing * 0.06,
        -0.68 - swing * 0.14,
      );
      this.fpViewRig.handPivot.rotation.set(
        0.28 - swing * 0.62,
        -0.34 + swing * 0.2,
        0.14 + walkBob * 0.05,
      );
    } else {
      _v1.set(this.heroPos.x, 2.0, this.heroPos.z);
      _v2.subVectors(_v1, this.controls.target).multiplyScalar(1 - Math.exp(-7 * dt));
      this.controls.target.add(_v2);
      this.camera.position.add(_v2);
    }

    if (this.encounterGraceTimer > 0) {
      this.encounterGraceTimer = Math.max(0, this.encounterGraceTimer - dt);
    }

    if (this.worldMode === 'dungeon' && this.dungeonRig) {
      this.updateCaveTargeting();
    } else {
      this.targetedCaveBlock = null;
    }

    // Update Shooters & Projectiles
    this.updateShootersAndProjectiles(dt);

    if (this.worldMode === 'overworld') {
      // Starter Weapon Pickup
      if (!this.starterWeaponPicked && Math.hypot(this.heroPos.x - -7, this.heroPos.z - 12) < 2.6) {
        this.starterWeaponPicked = true;
        this.ownedWeapons.add('ketapel');
        this.activeWeapon = 'ketapel';
        this.activeHotbarSlot = 0;
        this.weaponAmmo.ketapel = Math.min(MAX_AMMO, this.weaponAmmo.ketapel + 6);
        this.refreshWeaponVisual();
        this.spawnBurst(-7, 1.5, 12, 0xfacc15, 26);
        soundEngine.playFanfare();
        this.showBanner(
          '✨ Senjata Pemula Didapat! (Damage Kecil: 1 · Jelajahi Gua & kalahkan Bos untuk senjata kuat!)',
          4.8,
        );
        this.saveProgress();
      }

      for (const c of this.collectibles) {
        if (!c.active) continue;
        if (Math.hypot(this.heroPos.x - c.x, this.heroPos.z - c.z) < 2.2) {
          c.active = false;
          c.respawnTimer = TUNE.itemBackSec;
          if (c.kind === 'diamond') {
            this.diamonds += 1;
            this.score += 80;
            this.gainXp(15);
            this.spawnBurst(c.x, 1.5, c.z, 0x38bdf8, 12);
            soundEngine.playPick();
          } else {
            this.hp = Math.min(this.maxHp, this.hp + 1);
            this.score += 40;
            this.spawnBurst(c.x, 1.5, c.z, 0xf43f5e, 12);
            soundEngine.playPick();
          }
        }
      }

      let bestNpc: string | null = null;
      let bestNpcDist = 5.4;
      for (const npc of NPC_CATALOG) {
        const d = Math.hypot(this.heroPos.x - npc.x, this.heroPos.z - npc.z);
        if (d < bestNpcDist) {
          bestNpcDist = d;
          bestNpc = npc.id;
        }
      }
      this.nearbyNpcId = bestNpc;
      this.nearbyDoorIndex = null;
      this.nearbyDungeonGuardian = false;
      this.nearPrisonKey = false;
      this.nearHiddenPrison = false;
      this.nearPortal = Math.hypot(this.heroPos.x - 2, this.heroPos.z - -31) < 6.2;
      this.nearDungeonExit = false;
    } else if (this.worldMode === 'dungeon' && this.dungeonState) {
      this.nearbyNpcId = null;
      this.nearPortal = false;
      this.nearDungeonExit =
        Math.hypot(this.heroPos.x - this.dungeonExitPos.x, this.heroPos.z - this.dungeonExitPos.z) < 4.4;
      this.nearCraftingTable =
        Boolean(this.dungeonRig) &&
        Math.hypot(
          this.heroPos.x - this.dungeonRig!.craftingTablePos.x,
          this.heroPos.z - this.dungeonRig!.craftingTablePos.z,
        ) < 4.3;
      this.nearbyDungeonGuardian =
        Boolean(this.dungeonRig) &&
        Math.hypot(
          this.heroPos.x - this.dungeonRig!.guardianPos.x,
          this.heroPos.z - this.dungeonRig!.guardianPos.z,
        ) < 4.2;

      const keyDist = Math.hypot(this.heroPos.x, this.heroPos.z + 9);
      this.nearPrisonKey =
        Boolean(this.dungeonRig && this.dungeonState.prisonKeySpawned && !this.dungeonState.prisonKeyCollected) &&
        keyDist < 4.4;
      if (this.nearPrisonKey && keyDist < 2.15) {
        this.collectPrisonKey();
      }

      const prisonDist = this.dungeonRig
        ? Math.hypot(
            this.heroPos.x - this.dungeonRig.prisonPos.x,
            this.heroPos.z - this.dungeonRig.prisonPos.z,
          )
        : 99;
      this.nearHiddenPrison = Boolean(this.dungeonRig && !this.dungeonState.prisonUnlocked) && prisonDist < 4.3;
      if (
        this.nearHiddenPrison &&
        this.dungeonState.prisonKeyCollected &&
        !this.dungeonState.prisonUnlocked &&
        prisonDist < 2.65
      ) {
        this.interactWithHiddenPrison();
        return;
      }

      if (
        this.dungeonRig &&
        !this.dungeonRig.weaponChest.collected &&
        !this.chestAmbushTriggered &&
        Math.hypot(
          this.heroPos.x - this.dungeonRig.weaponChest.x,
          this.heroPos.z - this.dungeonRig.weaponChest.z,
        ) < 6.4
      ) {
        this.chestAmbushTriggered = true;
        this.spawnCaveAmbushMonster(
          this.dungeonRig.weaponChest.x,
          this.dungeonRig.weaponChest.z,
          'Penjaga Peti Rahasia',
          0x38bdf8,
        );
        this.showBanner('AWAS! Penjaga Peti Rahasia muncul melindungi Ketapel Kerikil!', 3.2);
      }

      if (
        this.dungeonRig &&
        !this.dungeonRig.weaponChest.collected &&
        Math.hypot(
          this.heroPos.x - this.dungeonRig.weaponChest.x,
          this.heroPos.z - this.dungeonRig.weaponChest.z,
        ) < 2.25 &&
        Math.abs(this.heroPos.y - this.dungeonRig.weaponChest.y) < 1.5
      ) {
        this.collectCaveWeaponChest();
      }

      let bestDoor: number | null = null;
      let bestDoorDist = 4.2;
      for (const door of ZONE_DOORS[this.dungeonState.zoneId]) {
        const d = Math.hypot(this.heroPos.x - door.x, this.heroPos.z - door.z);
        if (d < bestDoorDist) {
          bestDoorDist = d;
          bestDoor = door.index;
        }
      }
      this.nearbyDoorIndex = bestDoor;
    } else if (this.worldMode === 'academy') {
      this.nearbyDoorIndex = null;
      this.nearbyDungeonGuardian = false;
      this.nearPrisonKey = false;
      this.nearHiddenPrison = false;
      this.nearPortal = false;
      this.nearCraftingTable = false;
      this.nearDungeonExit =
        Math.hypot(this.heroPos.x - this.dungeonExitPos.x, this.heroPos.z - this.dungeonExitPos.z) < 4.4;

      let bestNpc: string | null = null;
      let bestNpcDist = 5.0;
      for (const npc of ACADEMY_NPCS) {
        const d = Math.hypot(this.heroPos.x - npc.x, this.heroPos.z - npc.z);
        if (d < bestNpcDist) {
          bestNpcDist = d;
          bestNpc = npc.id;
        }
      }
      this.nearbyNpcId = bestNpc;
    } else {
      this.nearCraftingTable = false;
      this.nearbyDungeonGuardian = false;
      this.nearPrisonKey = false;
      this.nearHiddenPrison = false;
    }

    // Word Monster Contact -> Duel Rebutan (skip cave mobs & 40% combatOnly brawlers!)
    let bestMonster: RoamingMonster | null = null;
    let bestMonsterDist = 5.0;
    for (const m of this.getActiveMonsters()) {
      if (!m.alive || m.angryTimer > 0 || m.isCaveMob || m.combatOnly) continue;
      const d = Math.hypot(this.heroPos.x - m.x, this.heroPos.z - m.z);
      if (d < bestMonsterDist) {
        bestMonsterDist = d;
        bestMonster = m;
      }
      let triggerDist = TUNE.contactDist;
      if (this.worldMode === 'dungeon') {
        for (const t of this.caveTorches) {
          if (Math.hypot(m.x - t.x, m.z - t.z) < 6.0) {
            triggerDist = 1.65;
            break;
          }
        }
      }
      if (d < triggerDist && this.encounterGraceTimer <= 0) {
        this.engageMonster(m);
        break;
      }
    }
    this.nearbyMonsterId = bestMonster?.id ?? null;

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerMessage = null;
    }
  }

  private spawnCaveBoulder(tx: number, tz: number): void {
    if (!this.dungeonRig) return;
    const rockGeo = new THREE.DodecahedronGeometry(0.95, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.35,
      roughness: 0.85,
      metalness: 0.12,
    });
    const rockMesh = new THREE.Mesh(rockGeo, rockMat);
    rockMesh.position.set(tx, 9.2, tz);
    rockMesh.castShadow = true;

    const ringGeo = new THREE.RingGeometry(0.95, 1.55, 20);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(tx, 0.06, tz);

    this.dungeonRig.group.add(rockMesh, ringMesh);
    const maxTime = this.settings.difficulty === 'pendekar' ? 1.15 : 1.4;
    this.caveBoulders.push({
      x: tx,
      z: tz,
      timer: maxTime,
      maxTime,
      rockMesh,
      ringMesh,
    });
  }

  private updateDungeonHazards(dt: number): void {
    const rig = this.dungeonRig;
    if (!rig) return;

    // 1. Alternating Environmental Floor Traps (disarmed once Boss is defeated!)
    const bossCleared = Boolean(this.dungeonState?.bossDefeated);
    const period = 4.6;
    for (const trap of rig.traps) {
      const phaseT = (this.elapsed + (trap.phaseOffset > 0 ? 2.3 : 0)) % period;
      if (bossCleared || phaseT < 2.2) {
        trap.active = false;
        trap.coreMat.emissive.setHex(trap.kind === 'lava' ? 0x7c2d12 : 0x334155);
        trap.coreMat.emissiveIntensity = bossCleared ? 0.1 : 0.25;
        if (trap.spikesGroup) {
          trap.spikesGroup.position.y = THREE.MathUtils.lerp(
            trap.spikesGroup.position.y,
            -0.42,
            1 - Math.exp(-12 * dt),
          );
        }
      } else if (phaseT < 3.0) {
        trap.active = false;
        trap.coreMat.emissive.setHex(0xf59e0b);
        trap.coreMat.emissiveIntensity = 0.75 + Math.sin(this.elapsed * 26) * 0.35;
        if (trap.spikesGroup) {
          trap.spikesGroup.position.y = -0.2 + Math.sin(this.elapsed * 32) * 0.04;
        }
      } else {
        trap.active = true;
        trap.coreMat.emissive.setHex(trap.kind === 'lava' ? 0xf97316 : 0xe11d48);
        trap.coreMat.emissiveIntensity = 1.65;
        if (trap.spikesGroup) {
          trap.spikesGroup.position.y = THREE.MathUtils.lerp(
            trap.spikesGroup.position.y,
            0.36,
            1 - Math.exp(-18 * dt),
          );
        }
      }

      if (
        !bossCleared &&
        this.phase === 'playing' &&
        trap.active &&
        this.encounterGraceTimer <= 0 &&
        Math.abs(this.heroPos.x - trap.x) < trap.halfW &&
        Math.abs(this.heroPos.z - trap.z) < trap.halfW
      ) {
        this.hp = Math.max(0, this.hp - 1);
        this.encounterGraceTimer = 1.6;
        soundEngine.playHurt();
        this.spawnBurst(
          trap.x,
          1.0,
          trap.z,
          trap.kind === 'lava' ? 0xf97316 : 0xf43f5e,
          14,
        );
        const px = this.heroPos.x - trap.x;
        const pz = this.heroPos.z - trap.z;
        const pLen = Math.max(0.2, Math.hypot(px, pz));
        this.heroVel.set((px / pLen) * 14, 0, (pz / pLen) * 14);
        this.showBanner(
          trap.kind === 'lava'
            ? 'Awas Lantai Lava! Tunggu meredup sebelum melangkah (-1 ❤️)'
            : 'Kena Jebakan Duri! Tunggu duri turun sebelum lewat (-1 ❤️)',
          2.4,
        );
        if (this.hp <= 0) {
          this.triggerDefeatExit(this.dungeonState?.zoneId);
          return;
        }
      }
    }

    // 2. Boss-Phase Falling Stalactite Boulders
    if (
      this.phase === 'playing' &&
      this.dungeonState?.bossSpawned &&
      !this.dungeonState.bossDefeated
    ) {
      this.bossBoulderTimer -= dt;
      if (this.bossBoulderTimer <= 0 && this.caveBoulders.length < 3) {
        this.bossBoulderTimer = this.settings.difficulty === 'pendekar' ? 2.1 : 2.9;
        const tx = THREE.MathUtils.clamp(
          this.heroPos.x + (Math.random() - 0.5) * 4.8,
          -17,
          17,
        );
        const tz = THREE.MathUtils.clamp(
          this.heroPos.z + (Math.random() - 0.5) * 4.8,
          -17,
          17,
        );
        this.spawnCaveBoulder(tx, tz);
      }
    }

    for (let i = this.caveBoulders.length - 1; i >= 0; i--) {
      const b = this.caveBoulders[i];
      if (this.phase === 'playing') {
        b.timer -= dt;
      }
      const frac = Math.max(0, b.timer / b.maxTime);
      b.rockMesh.position.y = 0.85 + 8.4 * frac * frac;
      b.rockMesh.rotation.x += dt * 3.2;
      b.rockMesh.rotation.y += dt * 2.4;
      b.ringMesh.scale.setScalar(0.88 + Math.sin(this.elapsed * 24) * 0.14);

      if (b.timer <= 0) {
        if (b.rockMesh.parent) b.rockMesh.parent.remove(b.rockMesh);
        if (b.ringMesh.parent) b.ringMesh.parent.remove(b.ringMesh);
        b.rockMesh.geometry.dispose();
        (b.rockMesh.material as THREE.Material).dispose();
        b.ringMesh.geometry.dispose();
        (b.ringMesh.material as THREE.Material).dispose();
        this.caveBoulders.splice(i, 1);

        this.spawnBurst(b.x, 0.9, b.z, 0xf97316, 18);
        soundEngine.playBoom();

        // Placed Blok Pelindung absorbs falling boulders!
        let absorbedByShield = false;
        for (const blk of rig.caveBlocks) {
          if (
            blk.alive &&
            blk.kind === 'player_shield' &&
            Math.hypot(blk.x - b.x, blk.z - b.z) < 1.65
          ) {
            absorbedByShield = true;
            blk.hp -= 1;
            blk.mesh.scale.setScalar(0.9);
            if (blk.hp <= 0) {
              blk.alive = false;
              blk.mesh.visible = false;
              if (blk.crackMesh) blk.crackMesh.visible = false;
              this.spawnBurst(blk.x, blk.y + 0.1, blk.z, 0x38bdf8, 14);
              this.showBanner('Blok Pelindung pecah menahan batu runtuh gua!', 2.2);
            } else {
              this.updateBlockCrackVisual(blk);
              this.showBanner('Blok Pelindung menahan batu runtuh gua!', 1.8);
            }
            break;
          }
        }

        if (
          !absorbedByShield &&
          this.phase === 'playing' &&
          this.encounterGraceTimer <= 0 &&
          Math.hypot(this.heroPos.x - b.x, this.heroPos.z - b.z) < 1.75
        ) {
          this.hp = Math.max(0, this.hp - 1);
          this.encounterGraceTimer = 1.6;
          soundEngine.playHurt();
          this.showBanner(
            'Kena Batu Runtuh Bos! Hindari lingkaran merah di lantai (-1 ❤️)',
            2.4,
          );
          if (this.hp <= 0) {
            this.triggerDefeatExit(this.dungeonState?.zoneId);
            return;
          }
        }
      }
    }

    // 3. Lava Chasm Trenches (must Jump across or bridge with Blok Pelindung)
    for (const chasm of rig.chasms) {
      chasm.lavaMat.emissiveIntensity = 1.2 + Math.sin(this.elapsed * 4.5 + chasm.x) * 0.35;
      if (
        this.phase === 'playing' &&
        this.encounterGraceTimer <= 0 &&
        Math.abs(this.heroPos.x - chasm.x) < chasm.halfW &&
        Math.abs(this.heroPos.z - chasm.z) < chasm.halfD &&
        this.heroPos.y <= 0.35
      ) {
        this.hp = Math.max(0, this.hp - 1);
        this.encounterGraceTimer = 1.5;
        this.heroVelY = 9.5;
        this.heroOnGround = false;
        const pushDirZ = this.heroPos.z >= chasm.z ? 1 : -1;
        this.heroVel.z = pushDirZ * 12;
        soundEngine.playHurt();
        this.spawnBurst(this.heroPos.x, 0.7, this.heroPos.z, 0xf97316, 16);
        this.showBanner(
          'Awas Jurang Lava! Lompat (⬆️ / J) atau pasang Blok Pelindung sebagai jembatan (-1 ❤️)',
          2.6,
        );
        if (this.hp <= 0) {
          this.triggerDefeatExit(this.dungeonState?.zoneId);
          return;
        }
      }
    }

    // 4. Placed Mining TNT Fuse & Detonation
    for (let i = this.activeTnts.length - 1; i >= 0; i--) {
      const tnt = this.activeTnts[i];
      if (this.phase === 'playing') {
        tnt.timer -= dt;
      }
      const pulse = 1 + Math.abs(Math.sin(this.elapsed * 22)) * 0.16;
      tnt.mesh.scale.setScalar(pulse);
      if (tnt.timer <= 0) {
        if (tnt.mesh.parent) tnt.mesh.parent.remove(tnt.mesh);
        this.activeTnts.splice(i, 1);
        soundEngine.playBoom();
        this.spawnBurst(tnt.x, tnt.y + 1.0, tnt.z, 0xf97316, 40);
        this.spawnBurst(tnt.x, tnt.y + 1.2, tnt.z, 0xfacc15, 22);

        let blocksBroken = 0;
        let shieldsCracked = 0;
        let mobsSlain = 0;
        let shieldSavedHero = false;

        for (const blk of rig.caveBlocks) {
          if (!blk.alive) continue;
          const dist = Math.hypot(blk.x - tnt.x, blk.z - tnt.z);
          if (blk.kind === 'player_shield') {
            if (dist < 4.5) shieldSavedHero = true;
            continue;
          }
          if (dist < 4.35) {
            if (blk.kind === 'word_seal' && blk.hp > 3) {
              blk.hp -= 3;
              this.updateBlockCrackVisual(blk);
            } else {
              this.shatterCaveBlock(blk, false);
              blocksBroken += 1;
            }
          }
        }

        for (const m of this.dungeonMonsters) {
          if (!m.alive) continue;
          if (Math.hypot(m.x - tnt.x, m.z - tnt.z) < 5.2) {
            if (m.isCaveMob) {
              m.alive = false;
              m.mesh.visible = false;
              m.respawnTimer = 28;
              mobsSlain += 1;
              this.gainXp(15);
              this.score += m.rewardScore;
              this.spawnBurst(m.x, (m.y ?? 0) + 1.2, m.z, 0xfbbf24, 18);
            } else if (m.combatOnly) {
              m.mobHp = (m.mobHp ?? m.maxMobHp ?? 4) - 3;
              m.aggroActive = true;
              m.hitFlashTimer = 0.25;
              if (m.mobHp <= 0) {
                mobsSlain += 1;
                this.handleRealTimeMonsterDefeated(m);
              } else {
                this.spawnBurst(m.x, 1.8, m.z, 0xef4444, 16);
              }
            } else {
              m.stanceHp = 0;
              m.angryTimer = 0.55;
              shieldsCracked += 1;
              this.spawnBurst(m.x, 1.8, m.z, 0xf59e0b, 14);
            }
          }
        }

        for (const s of this.shooters) {
          if (!s.alive) continue;
          if (Math.hypot(s.x - tnt.x, s.z - tnt.z) < 5.0) {
            s.alive = false;
            s.mesh.visible = false;
            s.respawnTimer = TUNE.respawnSec;
            mobsSlain += 1;
            this.gainXp(5);
            this.score += 120;
            this.spawnBurst(s.x, 1.5, s.z, 0xfbbf24, 16);
          }
        }

        const heroDist = Math.hypot(this.heroPos.x - tnt.x, this.heroPos.z - tnt.z);
        if (
          !shieldSavedHero &&
          this.phase === 'playing' &&
          this.encounterGraceTimer <= 0 &&
          heroDist < 3.1
        ) {
          this.hp = Math.max(0, this.hp - 1);
          this.encounterGraceTimer = 1.4;
          soundEngine.playHurt();
          if (this.hp <= 0) {
            this.triggerDefeatExit(this.dungeonState?.zoneId);
            return;
          }
        }

        this.showBanner(
          `💥 BOOM TNT! ${blocksBroken} balok hancur · ${shieldsCracked} perisai retak · ${mobsSlain} monster tumbang!`,
          3.2,
        );
        this.saveProgress();
        this.pushHud(true);
      }
    }
  }

  private resolveCaveBlockCollisions(): void {
    if (!this.dungeonRig) return;
    const heroR = 0.65;
    const pushBox = (bx: number, bz: number, hw: number, hd = hw) => {
      const cx = THREE.MathUtils.clamp(this.heroPos.x, bx - hw, bx + hw);
      const cz = THREE.MathUtils.clamp(this.heroPos.z, bz - hd, bz + hd);
      const dx = this.heroPos.x - cx;
      const dz = this.heroPos.z - cz;
      const distSq = dx * dx + dz * dz;
      if (distSq < heroR * heroR) {
        if (distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = heroR - dist;
          this.heroPos.x += (dx / dist) * overlap;
          this.heroPos.z += (dz / dist) * overlap;
        } else {
          const penX = hw + heroR - Math.abs(this.heroPos.x - bx);
          const penZ = hd + heroR - Math.abs(this.heroPos.z - bz);
          if (penX < penZ) {
            this.heroPos.x += this.heroPos.x >= bx ? penX : -penX;
          } else {
            this.heroPos.z += this.heroPos.z >= bz ? penZ : -penZ;
          }
        }
      }
    };

    for (const col of this.dungeonRig.caveColliders) {
      pushBox(col.x, col.z, col.halfW);
    }
    pushBox(this.dungeonRig.guardianPos.x, this.dungeonRig.guardianPos.z, 0.7);
    if (!this.dungeonState?.prisonUnlocked) {
      pushBox(this.dungeonRig.prisonPos.x, this.dungeonRig.prisonPos.z, 1.8);
    }
    for (const p of this.dungeonRig.platforms) {
      if (this.heroPos.y < p.topY - 0.55) {
        pushBox(p.x, p.z, p.halfW, p.halfD);
      }
    }
    for (const blk of this.dungeonRig.caveBlocks) {
      if (!blk.alive) continue;
      const topY = blk.y + 1.1;
      const botY = blk.y - 1.1;
      if (this.heroPos.y < topY - 0.55 && this.heroPos.y + 1.8 > botY) {
        pushBox(blk.x, blk.z, blk.halfW);
      }
    }
  }

  private updateCaveTargeting(): void {
    const rig = this.dungeonRig;
    if (!rig) return;

    let bestBlock: CaveBlockDef | null = null;
    if (this.cameraMode === 'first_person') {
      this.pointerNdc.set(0, 0);
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const aliveMeshes = rig.caveBlocks.filter((b) => b.alive).map((b) => b.mesh);
      const hits = this.raycaster.intersectObjects(aliveMeshes, false);
      if (hits.length > 0 && hits[0].distance <= 7.2) {
        const id = hits[0].object.userData.caveBlockId as string | undefined;
        if (id) {
          bestBlock = rig.caveBlocks.find((b) => b.id === id && b.alive) || null;
        }
      }
    }

    if (!bestBlock) {
      const fX =
        this.cameraMode === 'first_person'
          ? -Math.sin(this.cameraYaw)
          : Math.sin(this.heroYaw);
      const fZ =
        this.cameraMode === 'first_person'
          ? -Math.cos(this.cameraYaw)
          : Math.cos(this.heroYaw);

      let bestScore = Infinity;
      for (const blk of rig.caveBlocks) {
        if (!blk.alive) continue;
        const dx = blk.x - this.heroPos.x;
        const dz = blk.z - this.heroPos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 4.2) continue;
        const dot = (dx * fX + dz * fZ) / Math.max(0.01, dist);
        if (dot > 0.25) {
          const score = dist - dot * 1.4;
          if (score < bestScore) {
            bestScore = score;
            bestBlock = blk;
          }
        }
      }
    }

    this.targetedCaveBlock = bestBlock;
    if (bestBlock) {
      rig.blockHighlight.position.set(bestBlock.x, bestBlock.y, bestBlock.z);
      rig.blockHighlight.visible = true;
    } else {
      rig.blockHighlight.visible = false;
    }

    if (this.activeHotbarSlot === 9 && this.caveTorchesLeft > 0) {
      const dirX =
        this.cameraMode === 'first_person'
          ? -Math.sin(this.cameraYaw)
          : Math.sin(this.heroYaw);
      const dirZ =
        this.cameraMode === 'first_person'
          ? -Math.cos(this.cameraYaw)
          : Math.cos(this.heroYaw);
      const px = THREE.MathUtils.clamp(this.heroPos.x + dirX * 2.1, -19.2, 19.2);
      const pz = THREE.MathUtils.clamp(this.heroPos.z + dirZ * 2.1, -19.2, 19.2);
      rig.torchPreview.position.set(px, 0.04, pz);
      rig.torchPreview.visible = true;
    } else {
      rig.torchPreview.visible = false;
    }

    if (this.activeHotbarSlot === 10 && this.caveShieldBlocksLeft > 0) {
      const { x: bx, y: by, z: bz } = this.getShieldPlacementCoords();
      rig.blockPlacePreview.position.set(bx, by, bz);
      rig.blockPlacePreview.visible = true;
    } else {
      rig.blockPlacePreview.visible = false;
    }
  }

  private updateShootersAndProjectiles(dt: number): void {
    const diff = DIFF_CONFIG[this.settings.difficulty];

    for (const s of this.shooters) {
      if (!s.alive) {
        if (s.id.startsWith('boss_guard_') && this.dungeonState?.bossDefeated) {
          continue;
        }
        s.respawnTimer -= dt;
        if (s.respawnTimer <= 0) {
          s.alive = true;
          s.hp = 3;
          s.x = s.homeX;
          s.z = s.homeZ;
          s.mesh.visible = true;
        }
        continue;
      }
      const p = this.elapsed * 0.9 + s.phase;
      s.x = s.homeX + Math.cos(p) * 3.5;
      s.z = s.homeZ + Math.sin(p) * 2.5;
      s.mesh.position.set(s.x, 0, s.z);
      const lookYaw = Math.atan2(this.heroPos.x - s.x, this.heroPos.z - s.z);
      s.mesh.rotation.y = lookYaw;

      s.cooldown -= dt;
      const distToHero = Math.hypot(this.heroPos.x - s.x, this.heroPos.z - s.z);
      if (s.cooldown <= 0 && distToHero < 26) {
        s.cooldown = diff.shooterCooldown;
        this.spawnProjectile({
          fromPlayer: false,
          x: s.x + Math.sin(lookYaw) * 1.1,
          z: s.z + Math.cos(lookYaw) * 1.1,
          vx: Math.sin(lookYaw) * diff.shooterBulletSpeed,
          vz: Math.cos(lookYaw) * diff.shooterBulletSpeed,
          damage: 1,
          shieldDamage: 1,
          pierceLeft: 0,
          colorHex: 0xf43f5e,
        });
      }
    }

    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, 1.35, p.z);
      p.mesh.rotation.y += dt * 8;

      if (this.worldMode === 'dungeon' && this.dungeonRig) {
        let hitWall = false;
        let hitColor = 0x94a3b8;
        for (const col of this.dungeonRig.caveColliders) {
          if (Math.abs(p.x - col.x) < col.halfW + 0.25 && Math.abs(p.z - col.z) < col.halfW + 0.25) {
            hitWall = true;
            break;
          }
        }
        if (!hitWall) {
          for (const blk of this.dungeonRig.caveBlocks) {
            if (!blk.alive) continue;
            // Player shots pass over/through their own placed shield blocks!
            if (p.fromPlayer && blk.kind === 'player_shield') continue;
            if (Math.abs(p.x - blk.x) < blk.halfW + 0.25 && Math.abs(p.z - blk.z) < blk.halfW + 0.25) {
              hitWall = true;
              if (!p.fromPlayer && blk.kind === 'player_shield') {
                hitColor = 0x38bdf8;
                blk.hp -= 1;
                blk.mesh.scale.setScalar(0.9);
                soundEngine.playHit();
                if (blk.hp <= 0) {
                  blk.alive = false;
                  blk.mesh.visible = false;
                  if (blk.crackMesh) blk.crackMesh.visible = false;
                  this.spawnBurst(blk.x, blk.y + 0.1, blk.z, 0x38bdf8, 16);
                  this.showBanner('Blok Pelindung hancur menahan tembakan musuh!', 2.2);
                } else {
                  this.updateBlockCrackVisual(blk);
                }
              }
              break;
            }
          }
        }
        if (hitWall) {
          p.active = false;
          p.mesh.visible = false;
          this.spawnBurst(p.x, 1.3, p.z, hitColor, 6);
          continue;
        }
      }

      if (p.fromPlayer) {
        // Check Hit on Shooters (3 HP -> kills for XP + Ammo + Gem)
        let consumed = false;
        for (const s of this.shooters) {
          if (!s.alive || p.hitIds.has(s.id)) continue;
          if (Math.hypot(p.x - s.x, p.z - s.z) < 1.6) {
            p.hitIds.add(s.id);
            s.hp -= p.damage;
            s.x += (p.vx / Math.max(1, Math.hypot(p.vx, p.vz))) * 1.8;
            s.z += (p.vz / Math.max(1, Math.hypot(p.vx, p.vz))) * 1.8;
            soundEngine.playHit();
            this.spawnBurst(s.x, 1.4, s.z, 0xf43f5e, 10);

            if (s.hp <= 0) {
              s.alive = false;
              s.mesh.visible = false;
              s.respawnTimer = TUNE.respawnSec;
              this.gainXp(5);
              this.score += 120;
              soundEngine.playBoom();
              this.spawnBurst(s.x, 1.6, s.z, 0xfbbf24, 20);
              let dropText = '+5 XP';
              if (Math.random() < 0.5 && this.ownedWeapons.size > 0) {
                this.weaponAmmo[this.activeWeapon] = Math.min(
                  MAX_AMMO,
                  this.weaponAmmo[this.activeWeapon] + 4,
                );
                dropText += ' · +4 Peluru!';
              }
              if (this.shooterGemsThisArea < 3 && Math.random() < 0.35) {
                this.shooterGemsThisArea += 1;
                this.diamonds += 1;
                dropText += ' · +1 💎!';
              }
              this.showBanner(`Penembak Kalah! ${dropText}`, 2.4);
            }

            if (p.pierceLeft > 0) p.pierceLeft -= 1;
            else {
              consumed = true;
              break;
            }
          }
        }
        if (consumed) {
          p.active = false;
          p.mesh.visible = false;
          continue;
        }

        // Check Hit on Cave Mobs, 40% Combat Brawlers, & 60% Word Monsters
        for (const m of this.getActiveMonsters()) {
          if (!m.alive || m.angryTimer > 0) continue;
          const hitRadius = m.isCaveMob || m.combatOnly ? 2.15 : 1.9;
          if (Math.hypot(p.x - m.x, p.z - m.z) < hitRadius) {
            p.active = false;
            p.mesh.visible = false;

            if (m.isCaveMob || m.combatOnly) {
              this.damageRealTimeMonster(m, p.damage, p.vx, p.vz);
              break;
            }

            const curStance = m.stanceHp ?? 3;
            const nextStance = Math.max(0, curStance - p.shieldDamage);
            m.stanceHp = nextStance;
            soundEngine.playHit();

            if (nextStance > 0) {
              const spd = Math.max(1, Math.hypot(p.vx, p.vz));
              m.x += (p.vx / spd) * 0.7;
              m.z += (p.vz / spd) * 0.7;
              this.spawnBurst(m.x, 1.8, m.z, 0x38bdf8, 8);
              this.showBanner(
                `Kena ${m.name}! Perisai Kata ${nextStance}/3 — bidik lagi!`,
                1.6,
              );
            } else {
              m.stanceHp = 3;
              m.angryTimer = 0.65;
              this.spawnBurst(m.x, 1.8, m.z, 0xf59e0b, 14);
              this.showBanner(
                `Perisai ${m.name} pecah! Bersiap Duel Rebutan!`,
                1.6,
              );
            }
            break;
          }
        }
      } else {
        // Enemy projectile hitting Hoot
        if (
          this.encounterGraceTimer <= 0 &&
          Math.hypot(p.x - this.heroPos.x, p.z - this.heroPos.z) < 1.35
        ) {
          p.active = false;
          p.mesh.visible = false;
          this.hp = Math.max(0, this.hp - 1);
          this.encounterGraceTimer = 1.6;
          soundEngine.playHurt();
          this.spawnBurst(this.heroPos.x, 1.5, this.heroPos.z, 0xf43f5e, 14);
          if (this.hp <= 0) {
            if (this.worldMode !== 'overworld') {
              this.triggerDefeatExit(this.dungeonState?.zoneId);
            } else {
              this.phase = 'gameover';
              soundEngine.playLose();
            }
          }
        }
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) {
        _dummy.position.set(0, -80, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.vy -= 16 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.2, p.y + p.vy * dt);
      p.z += p.vz * dt;
      const s = 1 - p.life / p.maxLife;
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(p.life * 5, p.life * 4, 0);
      _dummy.scale.setScalar(Math.max(0.05, s));
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
  }

  private computeLabels(): ProjectedLabel[] {
    if (this.phase !== 'playing' && this.phase !== 'title') return [];
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const labels: ProjectedLabel[] = [];

    const projectPoint = (wx: number, wy: number, wz: number): { x: number; y: number } | null => {
      _proj.set(wx, wy, wz).project(this.camera);
      if (_proj.z > 1 || _proj.z < -1) return null;
      const sx = ((_proj.x + 1) / 2) * w;
      const sy = ((-_proj.y + 1) / 2) * h;
      if (sx < 40 || sx > w - 40 || sy < 50 || sy > h - 60) return null;
      return { x: Math.round(sx), y: Math.round(sy) };
    };

    if (this.worldMode === 'dungeon') {
      // Cave spots, doors, chests, crafting tables, and monsters are tracked cleanly on the 3D Radar Minimap
      return labels;
    }

    if (this.worldMode === 'academy') {
      for (const npc of ACADEMY_NPCS) {
        const pos = projectPoint(npc.x, 4.2, npc.z);
        if (pos) {
          labels.push({
            id: `ac_npc_${npc.id}`,
            x: pos.x,
            y: pos.y,
            title: npc.name,
            subtext: npc.speechBubble,
            kind: 'zone',
          });
        }
      }
      for (const m of this.academyMonsters) {
        if (!m.alive) continue;
        const pos = projectPoint(m.x, 2.8, m.z);
        if (pos) {
          labels.push({
            id: `am_${m.id}`,
            x: pos.x,
            y: pos.y,
            title: m.name,
            kind: 'monster',
          });
        }
      }
      return labels;
    }

    if (this.starterPickupMesh.visible && this.phase === 'playing') {
      const sp = projectPoint(-7, 3.2, 12);
      if (sp) {
        labels.push({
          id: 'starter_gun',
          x: sp.x,
          y: sp.y,
          title: '✨ Senjata Pertama (Ambil)',
          subtext: 'Damage Kecil · Senjata Awal',
          kind: 'pickup',
        });
      }
    }

    for (const npc of NPC_CATALOG) {
      const pos = projectPoint(npc.x, -0.2, npc.z + 2.4);
      if (pos) {
        const isLiberated = this.liberatedZones.has(npc.zoneId as ZoneId);
        labels.push({
          id: `zone_${npc.id}`,
          x: pos.x,
          y: pos.y,
          title: isLiberated ? `✓ ${npc.zoneName}` : npc.zoneName,
          kind: 'zone',
        });
      }
      if (this.phase === 'playing') {
        const bubblePos = projectPoint(npc.x, 4.9, npc.z);
        if (bubblePos && npc.id === this.nearbyNpcId) {
          labels.push({
            id: `speech_${npc.id}`,
            x: bubblePos.x,
            y: bubblePos.y,
            title: npc.speechBubble,
            kind: 'speech',
          });
        }
      }
    }

    const portalPos = projectPoint(2, 8.8, -33);
    if (portalPos) {
      const locked = this.settings.storyLocked && this.ribbons.size < 6;
      labels.push({
        id: 'portal_ielts',
        x: portalPos.x,
        y: portalPos.y,
        title: locked
          ? `🔒 Istana IELTS (${this.ribbons.size}/6 Mahkota)`
          : '🏰 Istana IELTS / Akademi Ujian',
        kind: 'portal',
      });
    }

    return labels;
  }

  private buildRadarState(): RadarState | null {
    if (this.phase !== 'playing') return null;

    this.camera.getWorldDirection(_v1);
    _v1.y = 0;
    if (_v1.lengthSq() < 0.001) _v1.set(0, 0, -1);
    _v1.normalize();

    const blips: RadarBlip[] = [];

    if (this.worldMode === 'overworld') {
      if (!this.starterWeaponPicked) {
        blips.push({
          id: 'starter',
          x: -7,
          z: 12,
          kind: 'starter',
          color: '#38bdf8',
          needsHelp: true,
          label: 'Senjata Pertama',
        });
      }
      const spotKindByZone: Record<ZoneId, RadarBlipKind> = {
        desa_sapaan: 'spot_desa',
        pasar_rasa: 'spot_pasar',
        hutan_satwa: 'spot_satwa',
        gerbang_kota: 'spot_gerbang',
        menara_waktu: 'spot_menara',
        gua_portal: 'spot_gua',
      };
      for (const npc of NPC_CATALOG) {
        const zId = npc.zoneId as ZoneId;
        const liberated = this.liberatedZones.has(zId);
        blips.push({
          id: `npc_${npc.id}`,
          x: npc.x,
          z: npc.z,
          kind: spotKindByZone[zId] ?? 'npc',
          color: npc.accentColor,
          liberated,
          needsHelp: !liberated,
          label: ZONE_INFO[zId].name,
        });
      }
      blips.push({
        id: 'portal',
        x: 2,
        z: -33,
        kind: 'portal',
        color: '#a855f7',
        needsHelp: !this.ieltsCleared,
        label: 'Portal Istana IELTS',
      });
      for (const m of this.monsters) {
        if (!m.alive) continue;
        blips.push({
          id: `om_${m.id}`,
          x: m.x,
          z: m.z,
          kind: 'monster_quiz',
          color: '#a855f7',
          label: m.name,
        });
      }
    } else if (this.worldMode === 'dungeon' && this.dungeonState) {
      blips.push({
        id: 'exit',
        x: this.dungeonExitPos.x,
        z: this.dungeonExitPos.z,
        kind: 'exit',
        color: '#22d3ee',
      });
      if (this.dungeonRig) {
        blips.push({
          id: 'guardian',
          x: this.dungeonRig.guardianPos.x,
          z: this.dungeonRig.guardianPos.z,
          kind: 'guardian',
          color: this.dungeonState.liberated ? '#22c55e' : '#fde047',
          liberated: this.dungeonState.liberated,
          needsHelp: !this.dungeonState.liberated,
        });
        if (this.dungeonState.prisonKeySpawned && !this.dungeonState.prisonKeyCollected) {
          blips.push({
            id: 'prison_key',
            x: 0,
            z: -9,
            kind: 'key',
            color: '#facc15',
            needsHelp: true,
          });
        }
        blips.push({
          id: 'hidden_prison',
          x: this.dungeonRig.prisonPos.x,
          z: this.dungeonRig.prisonPos.z,
          kind: 'prison',
          color: this.dungeonState.prisonUnlocked
            ? '#22c55e'
            : this.dungeonState.prisonKeyCollected
            ? '#facc15'
            : '#fb7185',
          liberated: this.dungeonState.prisonUnlocked,
          needsHelp: this.dungeonState.prisonKeyCollected && !this.dungeonState.prisonUnlocked,
        });
        blips.push({
          id: 'craft',
          x: this.dungeonRig.craftingTablePos.x,
          z: this.dungeonRig.craftingTablePos.z,
          kind: 'craft',
          color: '#d97706',
        });
        if (!this.dungeonRig.weaponChest.collected) {
          blips.push({
            id: 'chest',
            x: this.dungeonRig.weaponChest.x,
            z: this.dungeonRig.weaponChest.z,
            kind: 'chest',
            color: '#facc15',
          });
        }
        const cleared = new Set(this.dungeonState.doorsCleared);
        for (const d of this.dungeonRig.doors) {
          blips.push({
            id: `door_${d.index}`,
            x: d.def.x,
            z: d.def.z,
            kind: 'door',
            color: cleared.has(d.index) ? '#22c55e' : '#fde047',
            liberated: cleared.has(d.index),
          });
        }
      }
      for (const m of this.dungeonMonsters) {
        if (!m.alive) continue;
        blips.push({
          id: `dm_${m.id}`,
          x: m.x,
          z: m.z,
          kind: m.isBoss
            ? 'boss'
            : m.combatOnly || m.isCaveMob
            ? 'monster_brawl'
            : 'monster_quiz',
          color: m.isBoss ? '#dc2626' : m.combatOnly || m.isCaveMob ? '#ef4444' : '#a855f7',
        });
      }
    } else if (this.worldMode === 'academy') {
      blips.push({
        id: 'exit',
        x: this.dungeonExitPos.x,
        z: this.dungeonExitPos.z,
        kind: 'exit',
        color: '#22d3ee',
      });
      for (const npc of ACADEMY_NPCS) {
        blips.push({
          id: `ac_${npc.id}`,
          x: npc.x,
          z: npc.z,
          kind: 'npc',
          color: '#a855f7',
        });
      }
      for (const m of this.academyMonsters) {
        if (!m.alive) continue;
        blips.push({
          id: `am_${m.id}`,
          x: m.x,
          z: m.z,
          kind: 'monster_quiz',
          color: '#a855f7',
        });
      }
    }

    return {
      heroX: this.heroPos.x,
      heroZ: this.heroPos.z,
      heroYaw: this.heroYaw,
      camForwardX: _v1.x,
      camForwardZ: _v1.z,
      worldMode: this.worldMode,
      blips,
    };
  }

  private pushHud(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastHudPushMs < 85) return;
    this.lastHudPushMs = now;

    const lv = getLevelInfo(this.xp);
    const zoneId =
      this.worldMode === 'dungeon' && this.dungeonState
        ? this.dungeonState.zoneId
        : getZoneForPosition(this.heroPos.x, this.heroPos.z);

    let seen = 0;
    let mastered = 0;
    const legacyMastery: Record<string, number> = {};
    const learnedIds: string[] = [];
    for (const [id, p] of Object.entries(this.wordProgress)) {
      if (p.r + p.w > 0) {
        seen++;
        learnedIds.push(id);
      }
      if (p.b >= 3) mastered++;
      legacyMastery[id] = p.b;
    }

    this.callbacks.onHudUpdate({
      phase: this.phase,
      worldMode: this.worldMode,
      cameraMode: this.cameraMode,
      activeHotbarSlot: this.activeHotbarSlot,
      level: lv.level,
      xp: lv.xpInLevel,
      xpToNext: lv.xpNeeded,
      hp: this.hp,
      maxHp: this.maxHp,
      diamonds: this.diamonds,
      score: this.score,
      streak: this.streak,
      maxStreak: this.maxStreak,
      dailyCount: this.dailyCount,
      dailyGoal: DAILY_GOAL,
      activeWeapon: this.activeWeapon,
      ownedWeapons: Array.from(this.ownedWeapons),
      weaponAmmo: { ...this.weaponAmmo },
      starterWeaponPicked: this.starterWeaponPicked,
      starterWeaponGuide: (() => {
        if (this.starterWeaponPicked || this.worldMode !== 'overworld' || this.phase !== 'playing') {
          return null;
        }
        const tx = -7 - this.heroPos.x;
        const tz = 12 - this.heroPos.z;
        const distance = Math.max(1, Math.round(Math.hypot(tx, tz)));
        this.camera.getWorldDirection(_v1);
        _v1.y = 0;
        if (_v1.lengthSq() < 0.001) _v1.set(0, 0, -1);
        _v1.normalize();
        const fx = _v1.x;
        const fz = _v1.z;
        const rx = -fz;
        const rz = fx;
        const forwardDot = tx * fx + tz * fz;
        const rightDot = tx * rx + tz * rz;
        const angleDeg = Math.round((Math.atan2(rightDot, forwardDot) * 180) / Math.PI);
        const absA = Math.abs(angleDeg);
        const directionLabel =
          absA < 30
            ? 'Lurus Depan'
            : absA > 150
            ? 'Belakang'
            : angleDeg > 0
            ? absA < 115
              ? 'Kanan'
              : 'Kanan Belakang'
            : absA < 115
            ? 'Kiri'
            : 'Kiri Belakang';
        return { distance, angleDeg, directionLabel };
      })(),
      radarState: this.buildRadarState(),
      ownedRelics: Array.from(this.ownedRelics),
      crowns: this.ribbons.size,
      ribbons: Array.from(this.ribbons),
      monstersDefeated: this.monstersDefeated,
      wordsMastered: mastered,
      wordsSeen: seen,
      learnedVocabIds: learnedIds,
      wordProgress: { ...this.wordProgress },
      wordMastery: legacyMastery,
      activeZoneId: zoneId,
      activeZoneName: this.worldMode === 'academy' ? 'Istana IELTS' : ZONE_INFO[zoneId].name,
      rankTitle: getRankTitle(this.xp, this.ribbons.size, this.ieltsCleared),
      nearbyNpcId: this.nearbyNpcId,
      nearbyMonsterId: this.nearbyMonsterId,
      nearbyDoorIndex: this.nearbyDoorIndex,
      nearbyDungeonGuardian: this.nearbyDungeonGuardian,
      nearPrisonKey: this.nearPrisonKey,
      nearHiddenPrison: this.nearHiddenPrison,
      nearPortal: this.nearPortal,
      nearDungeonExit: this.nearDungeonExit,
      portalUnlocked: !this.settings.storyLocked || this.ribbons.size >= 6,
      dungeonState: this.dungeonState ? { ...this.dungeonState } : null,
      liberatedZones: Array.from(this.liberatedZones),
      areaDoorsCleared: {
        desa_sapaan: [...(this.areaDoorsCleared.desa_sapaan || [])],
        pasar_rasa: [...(this.areaDoorsCleared.pasar_rasa || [])],
        hutan_satwa: [...(this.areaDoorsCleared.hutan_satwa || [])],
        gerbang_kota: [...(this.areaDoorsCleared.gerbang_kota || [])],
        menara_waktu: [...(this.areaDoorsCleared.menara_waktu || [])],
        gua_portal: [...(this.areaDoorsCleared.gua_portal || [])],
      },
      ieltsScores: { ...this.ieltsScores },
      quests: this.quests.map((q) => ({ ...q })),
      projectedLabels: this.computeLabels(),
      bannerMessage: this.bannerMessage,
      storyDialog: this.storyDialog ? { ...this.storyDialog } : null,
      settings: { ...this.settings },
      hasSavedGame: this.hasSave,
      caveTorchesLeft: this.caveTorchesLeft,
      caveShieldBlocksLeft: this.caveShieldBlocksLeft,
      caveTntLeft: this.caveTntLeft,
      pickaxeTier: this.pickaxeTier,
      nearCraftingTable: this.nearCraftingTable,
      caveBlocksMined: this.caveBlocksMined,
      targetedBlock:
        this.worldMode === 'dungeon' && this.targetedCaveBlock && this.targetedCaveBlock.alive
          ? {
              id: this.targetedCaveBlock.id,
              kind: this.targetedCaveBlock.kind,
              label: this.targetedCaveBlock.label,
              hp: this.targetedCaveBlock.hp,
              maxHp: this.targetedCaveBlock.maxHp,
            }
          : null,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('pointermove', this.onPointerMove);
    dom.removeEventListener('pointerup', this.onPointerUp);
    dom.removeEventListener('pointercancel', this.onPointerCancel);
    dom.removeEventListener('wheel', this.onWheel);

    this.controls.dispose();
    this.villageRig?.disposables.forEach((d) => d.dispose());
    this.palette.dispose();
    this.diamondInstanced.geometry.dispose();
    (this.diamondInstanced.material as THREE.Material).dispose();
    this.heartInstanced.geometry.dispose();
    (this.heartInstanced.material as THREE.Material).dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
