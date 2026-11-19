import React, { useEffect, useRef } from 'react';
import { RadarBlip, RadarBlipKind, RadarState, ZoneId } from '../types/game';

interface RadarMinimapProps {
  radar: RadarState;
  size?: number;
  onOpenMap: () => void;
}

interface Kingdom3DMapProps {
  radar: RadarState | null;
  liberatedZones: ZoneId[];
  starterPicked: boolean;
  onSelectZone?: (zoneId: ZoneId) => void;
}

/** Custom pixel-vector Blaster / Starter Weapon SVG icon (zero emojis) */
export const StarterWeaponPixelIcon: React.FC<{ className?: string }> = ({
  className = 'h-5 w-5',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M4 14h4v3l-2 4H3l2-5H4v-2z"
      fill="#b45309"
      stroke="#0f172a"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M5 10h11l3 2v3H8l-3-2v-3z"
      fill="#38bdf8"
      stroke="#0f172a"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <rect x="9" y="11" width="5" height="2" fill="#e0f2fe" />
    <path
      d="M19 6l1.3 2.5L23 9.8l-2.7 1.3L19 14l-1.3-2.9L15 9.8l2.7-1.3L19 6z"
      fill="#facc15"
      stroke="#0f172a"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </svg>
);

/** Reusable custom SVG legend icon per spot kind (zero emojis) */
export const SpotLegendIcon: React.FC<{ kind: RadarBlipKind; className?: string }> = ({
  kind,
  className = 'h-4 w-4',
}) => {
  if (kind === 'starter') return <StarterWeaponPixelIcon className={className} />;
  if (kind === 'spot_gua') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M3 20L6 7l6-3 6 3 3 13H3z" fill="#475569" stroke="#0f172a" strokeWidth="1.6" />
        <path d="M7.5 20v-6.5a4.5 4.5 0 0 1 9 0V20h-9z" fill="#0f172a" />
        <path d="M12 10l2.2 3.2L12 17l-2.2-3.8L12 10z" fill="#22d3ee" />
      </svg>
    );
  }
  if (kind === 'spot_satwa') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path
          d="M5 5l4 4h6l4-4 1 8-8 7-8-7 1-8z"
          fill="#f97316"
          stroke="#0f172a"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M8 14l4 4 4-4-1.8 1.5h-4.4L8 14z" fill="#f8fafc" />
        <circle cx="9.5" cy="12" r="1.1" fill="#0f172a" />
        <circle cx="14.5" cy="12" r="1.1" fill="#0f172a" />
      </svg>
    );
  }
  if (kind === 'spot_desa') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M3 11l9-7 9 7H3z" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.6" />
        <rect x="6" y="11" width="12" height="9" fill="#fef3c7" stroke="#0f172a" strokeWidth="1.6" />
        <rect x="10.5" y="14" width="3" height="6" fill="#78350f" />
      </svg>
    );
  }
  if (kind === 'spot_pasar') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path d="M3 7h18l-1.5 4h-15L3 7z" fill="#ef4444" stroke="#0f172a" strokeWidth="1.5" />
        <rect x="7" y="7" width="3.5" height="4" fill="#ffffff" />
        <rect x="13.5" y="7" width="3.5" height="4" fill="#ffffff" />
        <path d="M6 12h12v5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-5z" fill="#334155" stroke="#0f172a" strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === 'spot_gerbang') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <rect x="4" y="6" width="5" height="14" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.5" />
        <rect x="15" y="6" width="5" height="14" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.5" />
        <rect x="3" y="4" width="18" height="4" fill="#3b82f6" stroke="#0f172a" strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === 'spot_menara') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="#8b5cf6" stroke="#0f172a" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="6" fill="#fef08a" />
        <path d="M12 8v4l-2.5 2.5" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 18V8l4 4 4-6 4 6 4-4v10H4z"
        fill="#a855f7"
        stroke="#0f172a"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect x="7" y="14" width="10" height="2" fill="#facc15" />
    </svg>
  );
};

// =========================================================
// 3D PERSPECTIVE PROJECTION ENGINE FOR CANVAS RADAR & MAP
// =========================================================
interface Cam3D {
  cx: number;
  cy: number;
  originX: number;
  originZ: number;
  fx: number;
  fz: number;
  rx: number;
  rz: number;
  camH: number;
  camBack: number;
  cosP: number;
  sinP: number;
  focal: number;
}

interface ProjectedPt {
  sx: number;
  sy: number;
  zView: number;
}

function makeCamera3D(
  cx: number,
  cy: number,
  originX: number,
  originZ: number,
  fx: number,
  fz: number,
  camH: number,
  camBack: number,
  lookAhead: number,
  focal: number,
): Cam3D {
  const fLen = Math.hypot(fx, fz) || 1;
  const nfx = fx / fLen;
  const nfz = fz / fLen;
  const rx = -nfz;
  const rz = nfx;
  const tilt = Math.atan2(camH, lookAhead + camBack);
  return {
    cx,
    cy,
    originX,
    originZ,
    fx: nfx,
    fz: nfz,
    rx,
    rz,
    camH,
    camBack,
    cosP: Math.cos(tilt),
    sinP: Math.sin(tilt),
    focal,
  };
}

function project3D(cam: Cam3D, wx: number, wy: number, wz: number): ProjectedPt | null {
  const dx = wx - cam.originX;
  const dz = wz - cam.originZ;
  const lx = dx * cam.rx + dz * cam.rz;
  const lz = dx * cam.fx + dz * cam.fz;

  const vx = lx;
  const vy = wy - cam.camH;
  const vz = lz + cam.camBack;

  const zView = -vy * cam.sinP + vz * cam.cosP;
  if (zView < 2.2) return null;
  const yView = vy * cam.cosP + vz * cam.sinP;

  return {
    sx: cam.cx + (vx / zView) * cam.focal,
    sy: cam.cy - (yView / zView) * cam.focal,
    zView,
  };
}

function drawQuad3D(
  ctx: CanvasRenderingContext2D,
  cam: Cam3D,
  pts: Array<[number, number, number]>,
  fill: string,
  stroke?: string,
  lineWidth = 0.8,
): void {
  const proj: ProjectedPt[] = [];
  for (const [x, y, z] of pts) {
    const p = project3D(cam, x, y, z);
    if (!p) return;
    proj.push(p);
  }
  ctx.beginPath();
  ctx.moveTo(proj[0].sx, proj[0].sy);
  for (let i = 1; i < proj.length; i++) {
    ctx.lineTo(proj[i].sx, proj[i].sy);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawPolyline3D(
  ctx: CanvasRenderingContext2D,
  cam: Cam3D,
  pts: Array<[number, number, number]>,
  stroke: string,
  baseWorldWidth: number,
): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1, z1] = pts[i];
    const [x2, y2, z2] = pts[i + 1];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * (baseWorldWidth * 0.5);
    const nz = (dx / len) * (baseWorldWidth * 0.5);
    drawQuad3D(
      ctx,
      cam,
      [
        [x1 + nx, y1, z1 + nz],
        [x1 - nx, y1, z1 - nz],
        [x2 - nx, y2, z2 - nz],
        [x2 + nx, y2, z2 + nz],
      ],
      stroke,
    );
  }
}

interface DrawableVolume {
  depth: number;
  draw: (ctx: CanvasRenderingContext2D, cam: Cam3D) => void;
}

function make3DBox(
  cam: Cam3D,
  x: number,
  yBase: number,
  z: number,
  w: number,
  h: number,
  d: number,
  rotY: number,
  topColor: string,
  sideA: string,
  sideB: string,
  stroke = 'rgba(9,9,11,0.55)',
  roofPeak?: { height: number; color: string; sideColor: string },
): DrawableVolume | null {
  const centerP = project3D(cam, x, yBase + h * 0.5, z);
  if (!centerP) return null;

  const hw = w * 0.5;
  const hd = d * 0.5;
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  const rotPt = (lx: number, ly: number, lz: number): [number, number, number] => [
    x + lx * c + lz * s,
    yBase + ly,
    z - lx * s + lz * c,
  ];

  const corners: Array<[number, number, number]> = [
    rotPt(-hw, 0, -hd), // 0: b00
    rotPt(hw, 0, -hd),  // 1: b10
    rotPt(hw, 0, hd),   // 2: b11
    rotPt(-hw, 0, hd),  // 3: b01
    rotPt(-hw, h, -hd), // 4: t00
    rotPt(hw, h, -hd),  // 5: t10
    rotPt(hw, h, hd),   // 6: t11
    rotPt(-hw, h, hd),  // 7: t01
  ];

  const proj = corners.map((pt) => project3D(cam, pt[0], pt[1], pt[2]));
  if (proj.some((p) => p === null)) return null;
  const p = proj as ProjectedPt[];

  const faces: Array<{ idx: [number, number, number, number]; color: string; depth: number }> = [
    // Front (+Z local)
    {
      idx: [3, 2, 6, 7],
      color: sideA,
      depth: (p[3].zView + p[2].zView + p[6].zView + p[7].zView) * 0.25,
    },
    // Back (-Z local)
    {
      idx: [1, 0, 4, 5],
      color: sideA,
      depth: (p[1].zView + p[0].zView + p[4].zView + p[5].zView) * 0.25,
    },
    // Right (+X local)
    {
      idx: [2, 1, 5, 6],
      color: sideB,
      depth: (p[2].zView + p[1].zView + p[5].zView + p[6].zView) * 0.25,
    },
    // Left (-X local)
    {
      idx: [0, 3, 7, 4],
      color: sideB,
      depth: (p[0].zView + p[3].zView + p[7].zView + p[4].zView) * 0.25,
    },
    // Top (+Y)
    {
      idx: [4, 5, 6, 7],
      color: topColor,
      depth: (p[4].zView + p[5].zView + p[6].zView + p[7].zView) * 0.25 - 0.15,
    },
  ];

  // Backface-cull vertical faces using 2D winding order
  const visibleFaces = faces.filter((f) => {
    const a = p[f.idx[0]];
    const b = p[f.idx[1]];
    const dPt = p[f.idx[3]];
    // In screen coords, top faces & front-facing quads have negative or consistent cross
    if (f.idx[0] === 4) return true;
    const cross = (b.sx - a.sx) * (dPt.sy - a.sy) - (b.sy - a.sy) * (dPt.sx - a.sx);
    return cross < 0;
  });
  visibleFaces.sort((a, b) => b.depth - a.depth);

  // Optional 3D pyramid roof cap
  let peakProj: ProjectedPt | null = null;
  if (roofPeak) {
    const pk = rotPt(0, h + roofPeak.height, 0);
    peakProj = project3D(cam, pk[0], pk[1], pk[2]);
  }

  return {
    depth: centerP.zView,
    draw: (ctx) => {
      for (const f of visibleFaces) {
        ctx.beginPath();
        ctx.moveTo(p[f.idx[0]].sx, p[f.idx[0]].sy);
        ctx.lineTo(p[f.idx[1]].sx, p[f.idx[1]].sy);
        ctx.lineTo(p[f.idx[2]].sx, p[f.idx[2]].sy);
        ctx.lineTo(p[f.idx[3]].sx, p[f.idx[3]].sy);
        ctx.closePath();
        ctx.fillStyle = f.color;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }
      if (peakProj && roofPeak) {
        const tris: Array<[number, number, string]> = [
          [7, 6, roofPeak.color],
          [6, 5, roofPeak.sideColor],
          [5, 4, roofPeak.sideColor],
          [4, 7, roofPeak.color],
        ];
        const sortedTris = tris
          .map(([i1, i2, col]) => ({
            i1,
            i2,
            col,
            depth: (p[i1].zView + p[i2].zView + peakProj!.zView) / 3,
          }))
          .sort((a, b) => b.depth - a.depth);
        for (const t of sortedTris) {
          ctx.beginPath();
          ctx.moveTo(p[t.i1].sx, p[t.i1].sy);
          ctx.lineTo(p[t.i2].sx, p[t.i2].sy);
          ctx.lineTo(peakProj.sx, peakProj.sy);
          ctx.closePath();
          ctx.fillStyle = t.col;
          ctx.fill();
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    },
  };
}

// =========================================================
// WORLD GEOMETRY DEFINITIONS (MATCHING REAL 3D LANDMARKS)
// =========================================================
const OVERWORLD_TRAILS: Array<Array<[number, number]>> = [
  [
    [0, 38],
    [0, 10],
    [2, -28],
  ],
  [
    [0, 10],
    [-19, 6],
    [-21, -19],
  ],
  [
    [-19, 6],
    [-22, 26],
  ],
  [
    [0, 10],
    [17, 4],
    [23, -12],
  ],
];

const VILLAGE_TREES: Array<[number, number, boolean]> = [
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
  [21.0, -23.0, false],
  [38.0, -14.0, true],
  [-41.0, 4.0, false],
  [-38.0, 31.0, true],
  [39.0, 14.0, false],
];

function draw3DOverworldScene(
  ctx: CanvasRenderingContext2D,
  cam: Cam3D,
  pulse: number,
): void {
  // 1. 3D Grass Checkerboard Terrain Tiles on y=0
  for (let gx = -56; gx <= 44; gx += 14) {
    for (let gz = -56; gz <= 44; gz += 14) {
      const even = (Math.round(gx / 14) + Math.round(gz / 14)) % 2 === 0;
      drawQuad3D(
        ctx,
        cam,
        [
          [gx, 0, gz],
          [gx + 14, 0, gz],
          [gx + 14, 0, gz + 14],
          [gx, 0, gz + 14],
        ],
        even ? '#2f6834' : '#3a7a3e',
      );
    }
  }

  // 2. Pond & Waterfall Pool (-41, -10) + Canal
  drawQuad3D(
    ctx,
    cam,
    [
      [-48, 0.04, -17],
      [-34, 0.04, -17],
      [-34, 0.04, -3],
      [-48, 0.04, -3],
    ],
    '#2563eb',
    '#1e3a8a',
  );
  // Farm irrigated farmland & central blue canal
  drawQuad3D(
    ctx,
    cam,
    [
      [22.0, 0.03, 9.4],
      [32.4, 0.03, 9.4],
      [32.4, 0.03, 18.6],
      [22.0, 0.03, 18.6],
    ],
    '#92400e',
    '#451a03',
  );
  drawQuad3D(
    ctx,
    cam,
    [
      [26.5, 0.05, 9.6],
      [27.9, 0.05, 9.6],
      [27.9, 0.05, 18.4],
      [26.5, 0.05, 18.4],
    ],
    '#38bdf8',
  );

  // Hutan Satwa Animal Clearing Ground Pad (Tempat Hewan)
  drawQuad3D(
    ctx,
    cam,
    [
      [23, 0.03, -18],
      [34, 0.03, -18],
      [34, 0.03, -9],
      [23, 0.03, -9],
    ],
    '#15803d',
    '#064e3b',
  );

  // 3. 3D Cobblestone Village Trails + Central Plaza
  for (const pts of OVERWORLD_TRAILS) {
    drawPolyline3D(ctx, cam, pts.map(([x, z]) => [x, 0.05, z]), '#18181b', 4.4);
  }
  for (const pts of OVERWORLD_TRAILS) {
    drawPolyline3D(ctx, cam, pts.map(([x, z]) => [x, 0.07, z]), '#9ca3af', 3.1);
  }
  drawQuad3D(
    ctx,
    cam,
    [
      [-3.8, 0.08, 6.8],
      [9.8, 0.08, 6.8],
      [9.8, 0.08, 15.6],
      [-3.8, 0.08, 15.6],
    ],
    '#cbd5e1',
    '#334155',
  );

  // 4. Collect all 3D Extruded Buildings, Towers, Cliffs, Caves, Trees & Animals
  const volumes: DrawableVolume[] = [];
  const pushVol = (v: DrawableVolume | null) => {
    if (v) volumes.push(v);
  };

  // Desa Sapaan cottages
  pushVol(
    make3DBox(cam, -33, 0, -2, 6.4, 3.6, 5.2, 0.5, '#c084fc', '#e2d4b8', '#c7b89c', '#0f172a', {
      height: 2.2,
      color: '#a855f7',
      sideColor: '#7e22ce',
    }),
  );
  pushVol(
    make3DBox(cam, -34, 0, 14, 6.0, 3.4, 5.0, 0.8, '#d8b4fe', '#e2d4b8', '#c7b89c', '#0f172a', {
      height: 2.0,
      color: '#c084fc',
      sideColor: '#9333ea',
    }),
  );
  // Extra cottages
  pushVol(
    make3DBox(cam, 29, 0, -1, 6.2, 3.4, 5.0, -1.57, '#eab308', '#e2d4b8', '#c7b89c', '#0f172a', {
      height: 2.0,
      color: '#facc15',
      sideColor: '#ca8a04',
    }),
  );
  pushVol(
    make3DBox(cam, -35, 0, -14, 5.6, 3.2, 4.8, 1.45, '#d97706', '#e2d4b8', '#c7b89c', '#0f172a', {
      height: 1.9,
      color: '#f59e0b',
      sideColor: '#b45309',
    }),
  );
  pushVol(
    make3DBox(cam, 29, 0, 28, 5.6, 3.2, 4.6, -2.2, '#84cc16', '#e2d4b8', '#c7b89c', '#0f172a', {
      height: 1.9,
      color: '#a3e635',
      sideColor: '#65a30d',
    }),
  );

  // Hutan Satwa Ranger Cabin + 3D Fox & Sheep models (Tempat Hewan!)
  pushVol(
    make3DBox(cam, 33, 0, -18, 6.2, 3.4, 5.0, -0.7, '#4ade80', '#d6c3a5', '#b9a384', '#0f172a', {
      height: 2.1,
      color: '#22c55e',
      sideColor: '#15803d',
    }),
  );
  pushVol(make3DBox(cam, 27.2, 0, -13.4, 1.1, 1.1, 1.4, -0.9, '#fb923c', '#ea580c', '#c2410c'));
  pushVol(make3DBox(cam, 29.8, 0, -12.1, 1.2, 1.2, 1.4, -2.1, '#ffffff', '#e2e8f0', '#cbd5e1'));
  pushVol(make3DBox(cam, 28.5, 0, -16.2, 1.2, 1.2, 1.4, -0.4, '#ffffff', '#e2e8f0', '#cbd5e1'));

  // Pasar Rasa & Village Market Stalls + Llamas
  pushVol(make3DBox(cam, -31, 0, 29, 6.4, 3.4, 5.0, 0.7, '#ef4444', '#f8fafc', '#cbd5e1'));
  pushVol(make3DBox(cam, 13.5, 0, 23.8, 4.0, 2.7, 2.8, -0.35, '#facc15', '#f8fafc', '#e2e8f0'));
  pushVol(make3DBox(cam, 19.6, 0, 20.6, 3.8, 2.7, 2.8, -1.15, '#facc15', '#f8fafc', '#e2e8f0'));

  // Central Cobblestone Well (7.5, 11.2)
  pushVol(
    make3DBox(cam, 7.5, 0, 11.2, 3.0, 1.2, 3.0, 0, '#38bdf8', '#94a3b8', '#64748b', '#0f172a', {
      height: 2.2,
      color: '#78350f',
      sideColor: '#451a03',
    }),
  );

  // Wheat plots (3D golden stalks blocks)
  pushVol(make3DBox(cam, 24.6, 0.05, 14.0, 3.5, 0.9, 7.8, 0, '#facc15', '#eab308', '#ca8a04'));
  pushVol(make3DBox(cam, 29.8, 0.05, 14.0, 3.5, 0.9, 7.8, 0, '#a3e635', '#eab308', '#ca8a04'));

  // Menara Waktu (-29, -27): Tall 3D Clocktower + Gold Spire
  pushVol(
    make3DBox(cam, -29, 0, -27, 5.8, 9.2, 5.8, 0, '#a855f7', '#cbd5e1', '#94a3b8', '#0f172a', {
      height: 4.5,
      color: '#facc15',
      sideColor: '#7c3aed',
    }),
  );

  // Gerbang Kota (0, 35): Twin 3D Stone Piers + Gate Beam
  pushVol(make3DBox(cam, -4.0, 0, 32.5, 1.4, 4.8, 1.4, 0, '#cbd5e1', '#94a3b8', '#64748b'));
  pushVol(make3DBox(cam, 4.0, 0, 32.5, 1.4, 4.8, 1.4, 0, '#cbd5e1', '#94a3b8', '#64748b'));
  pushVol(make3DBox(cam, 0, 4.4, 32.5, 9.6, 1.2, 1.8, 0, '#78350f', '#92400e', '#5c3a1e'));

  // Gua Portal (2, -33): Twin Stone Pillars + Lintel + Glowing Purple Cave Core
  pushVol(make3DBox(cam, -1.9, 0, -33, 2.2, 7.2, 2.4, 0, '#94a3b8', '#64748b', '#475569'));
  pushVol(make3DBox(cam, 5.9, 0, -33, 2.2, 7.2, 2.4, 0, '#94a3b8', '#64748b', '#475569'));
  pushVol(make3DBox(cam, 2.0, 6.8, -33, 10.6, 2.0, 2.8, 0, '#64748b', '#475569', '#334155'));
  const portalGlow = 0.75 + Math.sin(pulse * 4) * 0.2;
  pushVol(
    make3DBox(
      cam,
      2.0,
      1.0,
      -33,
      5.2,
      5.6,
      0.9,
      0,
      `rgba(192,132,252,${portalGlow})`,
      '#9333ea',
      '#6b21a8',
    ),
  );

  // Waterfall Cliff (-47, -14)
  pushVol(make3DBox(cam, -47, 0, -14, 8.2, 8.0, 6.2, 0, '#4ade80', '#94a3b8', '#64748b'));
  pushVol(make3DBox(cam, -45, 0, -11, 2.6, 7.0, 1.2, 0, '#7dd3fc', '#38bdf8', '#0284c7'));

  // Pillager Outpost (45, -35)
  pushVol(
    make3DBox(cam, 45, 0, -35, 5.6, 9.0, 5.6, 0, '#991b1b', '#78350f', '#57534e', '#0f172a', {
      height: 3.4,
      color: '#dc2626',
      sideColor: '#7f1d1d',
    }),
  );

  // 3D Oak & Birch Voxel Trees
  for (const [tx, tz, isBirch] of VILLAGE_TREES) {
    pushVol(
      make3DBox(
        cam,
        tx,
        0,
        tz,
        0.9,
        2.5,
        0.9,
        0,
        isBirch ? '#e2e8f0' : '#78350f',
        isBirch ? '#cbd5e1' : '#5c3a1e',
        isBirch ? '#94a3b8' : '#451a03',
      ),
    );
    pushVol(
      make3DBox(
        cam,
        tx,
        2.4,
        tz,
        3.2,
        2.2,
        3.2,
        0,
        isBirch ? '#84cc16' : '#22c55e',
        isBirch ? '#65a30d' : '#16a34a',
        isBirch ? '#4d7c0f' : '#15803d',
      ),
    );
  }

  // Painter's Sort Far-to-Near and Draw!
  volumes.sort((a, b) => b.depth - a.depth);
  for (const v of volumes) v.draw(ctx, cam);
}

function draw3DDungeonScene(ctx: CanvasRenderingContext2D, cam: Cam3D): void {
  drawQuad3D(
    ctx,
    cam,
    [
      [-21, 0, -21],
      [21, 0, -21],
      [21, 0, 21],
      [-21, 0, 21],
    ],
    '#292524',
    '#0c0a09',
  );
  // Central stone cross path + Lava chasms
  drawQuad3D(
    ctx,
    cam,
    [
      [-2.6, 0.04, -19],
      [2.6, 0.04, -19],
      [2.6, 0.04, 19],
      [-2.6, 0.04, 19],
    ],
    '#44403c',
  );
  drawQuad3D(
    ctx,
    cam,
    [
      [-19, 0.04, -2.6],
      [19, 0.04, -2.6],
      [19, 0.04, 2.6],
      [-19, 0.04, 2.6],
    ],
    '#44403c',
  );
  drawQuad3D(
    ctx,
    cam,
    [
      [-15, 0.06, 2.2],
      [-8.8, 0.06, 2.2],
      [-8.8, 0.06, 4.8],
      [-15, 0.06, 4.8],
    ],
    '#f97316',
    '#ea580c',
  );
  drawQuad3D(
    ctx,
    cam,
    [
      [8.8, 0.06, -6.8],
      [15, 0.06, -6.8],
      [15, 0.06, -4.2],
      [8.8, 0.06, -4.2],
    ],
    '#f97316',
    '#ea580c',
  );

  const volumes: DrawableVolume[] = [];
  const pushVol = (v: DrawableVolume | null) => {
    if (v) volumes.push(v);
  };
  // 3D Cave Perimeter Rock Walls
  pushVol(make3DBox(cam, 0, 0, -20.5, 42, 4.8, 2.0, 0, '#57534e', '#44403c', '#292524'));
  pushVol(make3DBox(cam, -20.5, 0, 0, 2.0, 4.8, 42, 0, '#57534e', '#44403c', '#292524'));
  pushVol(make3DBox(cam, 20.5, 0, 0, 2.0, 4.8, 42, 0, '#57534e', '#44403c', '#292524'));
  // Interior rocky pillars
  [
    [-6, -5],
    [6, -5],
    [-6, 6],
    [6, 6],
  ].forEach(([px, pz]) => {
    pushVol(make3DBox(cam, px, 0, pz, 1.8, 4.5, 1.8, 0, '#78716c', '#57534e', '#44403c'));
  });
  volumes.sort((a, b) => b.depth - a.depth);
  for (const v of volumes) v.draw(ctx, cam);
}

function draw3DAcademyScene(ctx: CanvasRenderingContext2D, cam: Cam3D): void {
  drawQuad3D(
    ctx,
    cam,
    [
      [-20, 0, -20],
      [20, 0, -20],
      [20, 0, 20],
      [-20, 0, 20],
    ],
    '#312e81',
    '#1e1b4b',
  );
  drawQuad3D(
    ctx,
    cam,
    [
      [-3, 0.05, -18],
      [3, 0.05, -18],
      [3, 0.05, 18],
      [-3, 0.05, 18],
    ],
    '#7c3aed',
    '#facc15',
  );
  drawQuad3D(
    ctx,
    cam,
    [
      [-18, 0.05, -3],
      [18, 0.05, -3],
      [18, 0.05, 3],
      [-18, 0.05, 3],
    ],
    '#7c3aed',
    '#facc15',
  );
  const volumes: DrawableVolume[] = [];
  const pushVol = (v: DrawableVolume | null) => {
    if (v) volumes.push(v);
  };
  // Marble columns & Raja Penguji throne dais
  pushVol(make3DBox(cam, 0, 0, -15, 7.0, 2.2, 5.0, 0, '#facc15', '#c084fc', '#7c3aed'));
  [
    [-8, -10],
    [8, -10],
    [-8, 0],
    [8, 0],
    [-8, 10],
    [8, 10],
  ].forEach(([px, pz]) => {
    pushVol(make3DBox(cam, px, 0, pz, 1.5, 5.8, 1.5, 0, '#f8fafc', '#cbd5e1', '#94a3b8'));
  });
  volumes.sort((a, b) => b.depth - a.depth);
  for (const v of volumes) v.draw(ctx, cam);
}

// =========================================================
// ZERO-EMOJI CUSTOM VECTOR & PIXEL MARKER SPRITES
// =========================================================
function drawIcon(
  ctx: CanvasRenderingContext2D,
  kind: RadarBlipKind,
  x: number,
  y: number,
  color: string,
  liberated: boolean,
  needsHelp: boolean,
  pulse: number,
): void {
  ctx.save();
  ctx.translate(x, y);

  if (kind === 'starter') {
    const r = 9.0 + Math.sin(pulse * 5) * 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -6.8);
    ctx.lineTo(6.8, 0);
    ctx.lineTo(0, 6.8);
    ctx.lineTo(-6.8, 0);
    ctx.closePath();
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-3.5, -1.6, 7, 2.4);
    ctx.fillRect(-3.5, 0.4, 2.2, 2.8);
    ctx.restore();
    return;
  }

  if (kind === 'spot_gua') {
    // 3D Cave Mountain Arch + Glowing Crystal inside (NO emoji)
    ctx.fillStyle = liberated ? '#166534' : '#475569';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-7.2, 6);
    ctx.lineTo(-5.2, -3.2);
    ctx.lineTo(0, -6.8);
    ctx.lineTo(5.2, -3.2);
    ctx.lineTo(7.2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dark cave opening arch
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(0, 2.8, 3.6, Math.PI, 0);
    ctx.lineTo(3.6, 6);
    ctx.lineTo(-3.6, 6);
    ctx.closePath();
    ctx.fill();

    // Glowing crystal shard inside cave mouth
    ctx.fillStyle = liberated ? '#4ade80' : '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(0, -0.8);
    ctx.lineTo(1.7, 2.2);
    ctx.lineTo(0, 4.8);
    ctx.lineTo(-1.7, 2.2);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'spot_satwa') {
    // Cute Voxel Fox / Animal Head Silhouette (Tempat Hewan!)
    ctx.fillStyle = liberated ? '#22c55e' : '#f97316';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, -6.5);
    ctx.lineTo(-2.2, -2.5);
    ctx.lineTo(2.2, -2.5);
    ctx.lineTo(6, -6.5);
    ctx.lineTo(6.5, 1.5);
    ctx.lineTo(0, 6.2);
    ctx.lineTo(-6.5, 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // White cheek fluff + crisp pixel eyes
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(-3.6, 2.0);
    ctx.lineTo(0, 5.2);
    ctx.lineTo(3.6, 2.0);
    ctx.lineTo(0, 3.0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-3.0, -0.4, 1.6, 1.6);
    ctx.fillRect(1.4, -0.4, 1.6, 1.6);
  } else if (kind === 'spot_desa' || kind === 'npc') {
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = liberated ? '#22c55e' : color;
    ctx.beginPath();
    ctx.moveTo(0, -6.6);
    ctx.lineTo(6.8, -0.6);
    ctx.lineTo(-6.8, -0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = liberated ? '#bbf7d0' : '#fef3c7';
    ctx.fillRect(-4.6, -0.6, 9.2, 6.2);
    ctx.strokeRect(-4.6, -0.6, 9.2, 6.2);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-1.4, 1.6, 2.8, 4.0);
  } else if (kind === 'spot_pasar') {
    // Striped Market Awning + Soup Bowl
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = liberated ? '#22c55e' : '#ef4444';
    ctx.fillRect(-6.5, -5.5, 13, 4.2);
    ctx.strokeRect(-6.5, -5.5, 13, 4.2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2.5, -5.5, 2.5, 4.2);
    ctx.fillRect(2.5, -5.5, 2.5, 4.2);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-4.8, -1.0, 9.6, 6.2);
    ctx.strokeRect(-4.8, -1.0, 9.6, 6.2);
  } else if (kind === 'spot_gerbang') {
    // Stone City Gatehouse Arch
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = liberated ? '#22c55e' : '#3b82f6';
    ctx.fillRect(-7, -6, 14, 3.2);
    ctx.strokeRect(-7, -6, 14, 3.2);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-6, -2.8, 3.5, 8.2);
    ctx.strokeRect(-6, -2.8, 3.5, 8.2);
    ctx.fillRect(2.5, -2.8, 3.5, 8.2);
    ctx.strokeRect(2.5, -2.8, 3.5, 8.2);
  } else if (kind === 'spot_menara') {
    // Purple-Gold Clock Dial (stuck at 7)
    ctx.fillStyle = liberated ? '#22c55e' : '#8b5cf6';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(0, 0, 6.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -3.0);
    ctx.lineTo(0, 0);
    ctx.lineTo(-2.2, 2.2);
    ctx.stroke();
  } else if (kind === 'portal') {
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(-6.5, 5);
    ctx.lineTo(-6.5, -3);
    ctx.lineTo(-3, 0.5);
    ctx.lineTo(0, -6);
    ctx.lineTo(3, 0.5);
    ctx.lineTo(6.5, -3);
    ctx.lineTo(6.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-3.5, 1.5, 7, 2);
  } else if (kind === 'monster_brawl') {
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 5.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-2.4, -2.4);
    ctx.lineTo(2.4, 2.4);
    ctx.moveTo(2.4, -2.4);
    ctx.lineTo(-2.4, 2.4);
    ctx.stroke();
  } else if (kind === 'monster_quiz') {
    ctx.fillStyle = '#a855f7';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-4.0, -4.0, 8.0, 8.0);
    ctx.strokeRect(-4.0, -4.0, 8.0, 8.0);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-1.4, -1.4, 2.8, 2.8);
  } else if (kind === 'boss') {
    const s = 6.4 + Math.sin(pulse * 6) * 0.9;
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'craft') {
    ctx.fillStyle = '#d97706';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-4.5, -4.5, 9, 9);
    ctx.strokeRect(-4.5, -4.5, 9, 9);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(-2.5, -2.5, 5, 2);
  } else if (kind === 'chest') {
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-5, -3.5, 10, 7);
    ctx.strokeRect(-5, -3.5, 10, 7);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-5, -0.5, 10, 1.4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
  } else if (kind === 'guardian') {
    // Friendly Cave Guardian badge
    ctx.fillStyle = liberated ? '#22c55e' : color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(0, -0.6, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'key') {
    // Glowing Golden Prison Key
    const glow = 7.8 + Math.sin(pulse * 6) * 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, glow, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.32)';
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-2.6, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(0, -1.0, 5.4, 2.0);
    ctx.strokeRect(0, -1.0, 5.4, 2.0);
    ctx.fillRect(3.2, 1.0, 1.6, 2.2);
  } else if (kind === 'prison') {
    // Hidden Prison Cage icon
    ctx.fillStyle = liberated ? '#16a34a' : needsHelp ? '#f59e0b' : '#475569';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeRect(-5, -5, 10, 10);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-3.2, -3.5, 1.2, 7);
    ctx.fillRect(-0.6, -3.5, 1.2, 7);
    ctx.fillRect(2.0, -3.5, 1.2, 7);
    if (needsHelp && !liberated) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-1.5, -1.5, 3, 3);
    }
  } else if (kind === 'door') {
    ctx.fillStyle = liberated ? '#22c55e' : '#fde047';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.fillRect(-3.6, -4.2, 7.2, 8.4);
    ctx.strokeRect(-3.6, -4.2, 7.2, 8.4);
  } else {
    // exit
    ctx.fillStyle = '#22d3ee';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(5, 3.5);
    ctx.lineTo(-5, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Help-Needed ('!') or Saved Checkmark Badge on top-right of key spots
  if (needsHelp && !liberated && kind !== 'portal') {
    const bounce = Math.sin(pulse * 6) * 0.9;
    ctx.translate(6.2, -6.2 + bounce);
    ctx.beginPath();
    ctx.arc(0, 0, 4.1, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#fef08a';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-0.8, -2.5, 1.6, 3.0);
    ctx.fillRect(-0.8, 1.2, 1.6, 1.3);
  } else if (liberated && kind.startsWith('spot_')) {
    ctx.translate(6.0, -6.0);
    ctx.beginPath();
    ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
    ctx.fillStyle = '#16a34a';
    ctx.fill();
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-1.8, 0);
    ctx.lineTo(-0.4, 1.5);
    ctx.lineTo(2.0, -1.4);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }

  ctx.restore();
}

export const RadarMinimap: React.FC<RadarMinimapProps> = ({
  radar,
  size = 132,
  onOpenMap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const total = size + 16;
    if (canvas.width !== Math.round(total * dpr)) {
      canvas.width = Math.round(total * dpr);
      canvas.height = Math.round(total * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, total, total);

    const cx = total * 0.5;
    const cy = total * 0.5;
    const outerR = size * 0.5;
    const innerR = outerR - 5;
    const pulse = performance.now() / 1000;

    // Normalize camera XZ forward direction
    let fx = radar.camForwardX;
    let fz = radar.camForwardZ;
    const fLen = Math.hypot(fx, fz);
    if (fLen > 0.001) {
      fx /= fLen;
      fz /= fLen;
    } else {
      fx = 0;
      fz = -1;
    }
    const rx = -fz;
    const rz = fx;

    const cam = makeCamera3D(
      cx,
      cy,
      radar.heroX,
      radar.heroZ,
      fx,
      fz,
      radar.worldMode === 'overworld' ? 26 : 19,
      radar.worldMode === 'overworld' ? 20 : 14,
      radar.worldMode === 'overworld' ? 7 : 5,
      size * (radar.worldMode === 'overworld' ? 0.68 : 0.72),
    );

    // 1. Clip Inner Circular Radar + Atmospheric Sky/Biome Horizon Backdrop
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.clip();

    const skyGrad = ctx.createLinearGradient(0, cy - innerR, 0, cy + innerR);
    if (radar.worldMode === 'overworld') {
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(0.24, '#7dd3fc');
      skyGrad.addColorStop(0.28, '#285c2d');
      skyGrad.addColorStop(1, '#1e4622');
    } else if (radar.worldMode === 'dungeon') {
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.26, '#1c1917');
      skyGrad.addColorStop(1, '#14110f');
    } else {
      skyGrad.addColorStop(0, '#1e1b4b');
      skyGrad.addColorStop(0.26, '#312e81');
      skyGrad.addColorStop(1, '#1e1b4b');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, total, total);

    // 2. Render True 3D World Terrain, Roads & 3D Extruded Buildings
    if (radar.worldMode === 'overworld') {
      draw3DOverworldScene(ctx, cam, pulse);
    } else if (radar.worldMode === 'dungeon') {
      draw3DDungeonScene(ctx, cam);
    } else {
      draw3DAcademyScene(ctx, cam);
    }

    // 3. Draw 3D-Anchored Spot Markers & Pins
    const clampEdgeR = innerR - 10;
    const rank = (k: RadarBlipKind) =>
      k === 'starter'
        ? 5
        : k === 'portal' || k === 'boss'
        ? 4
        : k.startsWith('spot_') || k === 'npc'
        ? 3
        : 1;
    const orderedBlips = [...radar.blips].sort((a, b) => rank(a.kind) - rank(b.kind));

    for (const b of orderedBlips) {
      const keepClamped =
        b.kind === 'starter' ||
        b.kind.startsWith('spot_') ||
        b.kind === 'npc' ||
        b.kind === 'portal' ||
        b.kind === 'boss' ||
        b.kind === 'exit';

      const baseP = project3D(cam, b.x, 0.1, b.z);
      const pinP = project3D(cam, b.x, 4.4, b.z);

      let drawX: number;
      let drawY: number;
      let clamped = false;

      if (!pinP) {
        if (!keepClamped) continue;
        // Behind camera: project bearing cleanly onto the lower rim
        const dx = b.x - radar.heroX;
        const dz = b.z - radar.heroZ;
        const rightDot = dx * rx + dz * rz;
        const fwdDot = dx * fx + dz * fz;
        const ang = Math.atan2(rightDot, fwdDot);
        drawX = cx + Math.sin(ang) * clampEdgeR;
        drawY = cy - Math.cos(ang) * clampEdgeR;
        clamped = true;
      } else {
        const vx = pinP.sx - cx;
        const vy = pinP.sy - cy;
        const distPx = Math.hypot(vx, vy);
        if (distPx > clampEdgeR) {
          if (!keepClamped) continue;
          drawX = cx + (vx / distPx) * clampEdgeR;
          drawY = cy + (vy / distPx) * clampEdgeR;
          clamped = true;
        } else {
          drawX = pinP.sx;
          drawY = pinP.sy;
        }
      }

      if (!clamped && baseP) {
        // Draw 3D ground target ring + vertical beam stem!
        const ringColor = b.liberated
          ? 'rgba(74, 222, 128, 0.85)'
          : b.needsHelp
          ? 'rgba(250, 204, 21, 0.92)'
          : 'rgba(255, 255, 255, 0.6)';
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(baseP.sx, baseP.sy, 5.5, 2.8, 0, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1.3;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(baseP.sx, baseP.sy);
        ctx.lineTo(drawX, drawY);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      drawIcon(
        ctx,
        b.kind,
        drawX,
        drawY,
        b.color,
        Boolean(b.liberated),
        Boolean(b.needsHelp),
        pulse,
      );
    }

    // 4. Center-Bottom 3D Hero Chevron Arrow
    const heroBase = project3D(cam, radar.heroX, 0.2, radar.heroZ);
    const hx = heroBase ? heroBase.sx : cx;
    const hy = heroBase ? heroBase.sy : cy + size * 0.14;

    const hfx = Math.sin(radar.heroYaw);
    const hfz = Math.cos(radar.heroYaw);
    const hForward = hfx * fx + hfz * fz;
    const hRight = hfx * rx + hfz * rz;
    const heroRelAngle = Math.atan2(hRight, hForward);

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(heroRelAngle);
    ctx.beginPath();
    ctx.moveTo(0, -7.8);
    ctx.lineTo(5.8, 5.8);
    ctx.lineTo(0, 3.0);
    ctx.lineTo(-5.8, 5.8);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // end inner clip

    // 5. Iconic Thick Black GTA Outer Ring Bezel
    ctx.beginPath();
    ctx.arc(cx, cy, outerR - 2.5, 0, Math.PI * 2);
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.stroke();

    // 6. Rotating North ('N') Badge on Rim
    const nForward = -fz;
    const nRight = -fx;
    const rimR = outerR - 2;
    const nx = cx + nRight * rimR;
    const ny = cy - nForward * rimR;

    ctx.beginPath();
    ctx.arc(nx, ny, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = '#09090b';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny + 0.5);

    ctx.restore();
  }, [radar, size]);

  return (
    <button
      type="button"
      onClick={onOpenMap}
      title="Radar Peta 3D (Klik untuk buka Peta Dunia 3D)"
      className="pointer-events-auto group relative flex items-center justify-center rounded-full drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)] transition-transform active:scale-95"
      style={{ width: size + 16, height: size + 16 }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size + 16, height: size + 16 }}
        className="block"
      />
    </button>
  );
};

// =========================================================
// INTERACTIVE FULL-KINGDOM 3D MAP (FOR MAP MODAL TAB)
// =========================================================
interface MapSpotDef {
  id: string;
  zoneId?: ZoneId;
  x: number;
  z: number;
  kind: RadarBlipKind;
  color: string;
  shortLabel: string;
}

const KINGDOM_SPOTS: MapSpotDef[] = [
  { id: 'starter', x: -7, z: 12, kind: 'starter', color: '#38bdf8', shortLabel: 'Senjata Awal' },
  { id: 'desa', zoneId: 'desa_sapaan', x: -24, z: 4, kind: 'spot_desa', color: '#f59e0b', shortLabel: 'Desa Sapaan' },
  { id: 'pasar', zoneId: 'pasar_rasa', x: -24, z: 27, kind: 'spot_pasar', color: '#ef4444', shortLabel: 'Pasar Rasa' },
  { id: 'satwa', zoneId: 'hutan_satwa', x: 24, z: -12, kind: 'spot_satwa', color: '#10b981', shortLabel: 'Tempat Hewan' },
  { id: 'gerbang', zoneId: 'gerbang_kota', x: 0, z: 27, kind: 'spot_gerbang', color: '#3b82f6', shortLabel: 'Gerbang Kota' },
  { id: 'menara', zoneId: 'menara_waktu', x: -20, z: -21, kind: 'spot_menara', color: '#8b5cf6', shortLabel: 'Menara Jam' },
  { id: 'gua', zoneId: 'gua_portal', x: 6, z: -27, kind: 'spot_gua', color: '#a855f7', shortLabel: 'Gua Portal' },
];

export const Kingdom3DMap: React.FC<Kingdom3DMapProps> = ({
  radar,
  liberatedZones,
  starterPicked,
  onSelectZone,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitZonesRef = useRef<Array<{ x: number; y: number; r: number; zoneId: ZoneId }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = 640;
    const height = 270;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== width * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Horizon Sky + Distant Meadow Gradient
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#38bdf8');
    bg.addColorStop(0.28, '#bae6fd');
    bg.addColorStop(0.32, '#2d5a32');
    bg.addColorStop(1, '#1a3a1e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Fixed tilted 3D overview camera looking North across the entire village
    const cam = makeCamera3D(width * 0.5, height * 0.52, 0, 3, 0, -1, 44, 52, 6, 360);
    const pulse = performance.now() / 1000;
    draw3DOverworldScene(ctx, cam, pulse);

    const hits: Array<{ x: number; y: number; r: number; zoneId: ZoneId }> = [];

    for (const sp of KINGDOM_SPOTS) {
      if (sp.id === 'starter' && starterPicked) continue;
      const lib = sp.zoneId ? liberatedZones.includes(sp.zoneId) : false;
      const baseP = project3D(cam, sp.x, 0.2, sp.z);
      const pinP = project3D(cam, sp.x, 6.2, sp.z);
      if (!baseP || !pinP) continue;

      ctx.beginPath();
      ctx.ellipse(baseP.sx, baseP.sy, 7, 3.2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = lib ? '#4ade80' : '#facc15';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(baseP.sx, baseP.sy);
      ctx.lineTo(pinP.sx, pinP.sy);
      ctx.strokeStyle = lib ? '#4ade80' : '#fde047';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      drawIcon(ctx, sp.kind, pinP.sx, pinP.sy, sp.color, lib, !lib, pulse);

      // Crisp pill-free caption label below/above pin
      ctx.font = '800 10px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#09090b';
      ctx.strokeText(sp.shortLabel, pinP.sx, pinP.sy + 10);
      ctx.fillStyle = lib ? '#86efac' : '#fef08a';
      ctx.fillText(sp.shortLabel, pinP.sx, pinP.sy + 10);

      if (sp.zoneId) {
        hits.push({ x: pinP.sx, y: pinP.sy, r: 22, zoneId: sp.zoneId });
      }
    }

    // Show Player current 3D position marker
    if (radar && radar.worldMode === 'overworld') {
      const hp = project3D(cam, radar.heroX, 1.5, radar.heroZ);
      if (hp) {
        ctx.beginPath();
        ctx.arc(hp.sx, hp.sy, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#09090b';
        ctx.stroke();
        ctx.font = '900 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2.5;
        ctx.strokeText('KAMU', hp.sx, hp.sy - 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('KAMU', hp.sx, hp.sy - 7);
      }
    }

    hitZonesRef.current = hits;
    ctx.restore();
  }, [radar, liberatedZones, starterPicked]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelectZone || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 640;
    const y = ((e.clientY - rect.top) / rect.height) * 270;
    for (const h of hitZonesRef.current) {
      if (Math.hypot(x - h.x, y - h.y) <= h.r) {
        onSelectZone(h.zoneId);
        return;
      }
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[#78350f] bg-[#0f172a] shadow-inner">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="block h-48 w-full cursor-pointer sm:h-60"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#78350f]/50 bg-[#1e293b] px-3 py-2 text-[11px] font-bold text-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <SpotLegendIcon kind="spot_gua" className="h-4 w-4" />
            <span>Gua Portal</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <SpotLegendIcon kind="spot_satwa" className="h-4 w-4" />
            <span>Tempat Hewan</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <SpotLegendIcon kind="spot_desa" className="h-4 w-4" />
            <span>Desa</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <SpotLegendIcon kind="spot_pasar" className="h-4 w-4" />
            <span>Pasar</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <SpotLegendIcon kind="spot_gerbang" className="h-4 w-4" />
            <span>Gerbang</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <SpotLegendIcon kind="spot_menara" className="h-4 w-4" />
            <span>Menara</span>
          </span>
        </div>
        <span className="text-[10px] font-semibold text-amber-300">
          Klik spot pada peta 3D untuk langsung menuju lokasi
        </span>
      </div>
    </div>
  );
};
