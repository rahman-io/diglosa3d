import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createMaterialPalette } from '../three/materials';
import {
  createHeroAvatar,
  createMonsterMesh,
  setHeroWeaponVisual,
} from '../three/rpgModels';
import { MonsterType } from '../types/game';

export type BattleAnimEvent =
  | 'idle'
  | 'grab_ready'
  | 'hero_attack'
  | 'monster_attack'
  | 'hero_ko'
  | 'monster_ko';

interface BattleArenaCanvasProps {
  monsterType: MonsterType;
  isBoss: boolean;
  eventKind: BattleAnimEvent;
  eventTick: number;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  life: number;
  maxLife: number;
}

export const BattleArenaCanvas: React.FC<BattleArenaCanvasProps> = ({
  monsterType,
  isBoss,
  eventKind,
  eventTick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animStateRef = useRef<{
    kind: BattleAnimEvent;
    tick: number;
    elapsed: number;
  }>({ kind: eventKind, tick: eventTick, elapsed: 0 });

  useEffect(() => {
    animStateRef.current = {
      kind: eventKind,
      tick: eventTick,
      elapsed: 0,
    };
  }, [eventKind, eventTick]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 2.5, 0.1, 60);
    camera.position.set(0, 2.15, 8.6);
    camera.lookAt(0, 1.35, 0);

    const hemiLight = new THREE.HemisphereLight(0xfef3c7, 0x1e293b, 1.35);
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(2, 6, 6);
    const heroRim = new THREE.PointLight(0x34d399, 1.4, 10);
    heroRim.position.set(-4.2, 2.5, 2.2);
    const monsterRim = new THREE.PointLight(0xc084fc, 1.6, 10);
    monsterRim.position.set(4.2, 2.5, 2.2);
    scene.add(hemiLight, dirLight, heroRim, monsterRim);

    const palette = createMaterialPalette(renderer, false);

    // 3D Hero Explorer
    const heroRig = createHeroAvatar(palette);
    setHeroWeaponVisual(heroRig, 0x38bdf8, true);
    const HERO_HOME_X = -2.25;
    heroRig.root.position.set(HERO_HOME_X, 0, 0);
    heroRig.root.rotation.y = Math.PI * 0.42;
    heroRig.root.scale.setScalar(0.86);
    scene.add(heroRig.root);

    // 3D Monster / Boss
    const monsterGroup = createMonsterMesh(monsterType, palette, isBoss ? 1.15 : 0.96);
    const MON_HOME_X = 2.25;
    const MON_BASE_Y = monsterType === 'kelelawar_gua' ? 1.45 : 0;
    monsterGroup.position.set(MON_HOME_X, MON_BASE_Y, 0);
    monsterGroup.rotation.y = -Math.PI * 0.42;
    scene.add(monsterGroup);

    // Duel Projectile Orb
    const projGeo = new THREE.OctahedronGeometry(0.32, 0);
    const heroProjMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const monProjMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const projMesh = new THREE.Mesh(projGeo, heroProjMat);
    projMesh.visible = false;
    scene.add(projMesh);

    // 3D Impact Sparks & K.O. Confetti Pool
    const confettiGeo = new THREE.BoxGeometry(0.18, 0.11, 0.04);
    const confettiColors = [0xfacc15, 0x34d399, 0x38bdf8, 0xf43f5e, 0xa855f7, 0xfb923c];
    const confettiMats = confettiColors.map(
      (hex) => new THREE.MeshBasicMaterial({ color: hex }),
    );
    const sparks: SparkParticle[] = [];

    const spawnBurst = (cx: number, cy: number, count: number, victoryTheme: boolean) => {
      for (let i = 0; i < count; i++) {
        const mat = victoryTheme
          ? confettiMats[i % confettiMats.length]
          : confettiMats[(i % 2 === 0 ? 3 : 4)];
        const m = new THREE.Mesh(confettiGeo, mat);
        m.position.set(
          cx + (Math.random() - 0.5) * 0.9,
          cy + (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.9,
        );
        scene.add(m);
        sparks.push({
          mesh: m,
          vx: (Math.random() - 0.5) * (victoryTheme ? 6.5 : 4.2),
          vy: 1.8 + Math.random() * (victoryTheme ? 5.2 : 3.2),
          vz: (Math.random() - 0.5) * 3.0,
          rx: (Math.random() - 0.5) * 10,
          ry: (Math.random() - 0.5) * 10,
          life: 0,
          maxLife: victoryTheme ? 2.1 : 1.0,
        });
      }
    };

    const syncSize = () => {
      const w = Math.max(120, host.clientWidth);
      const h = Math.max(80, host.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(host);

    let lastTickHandled = -1;
    let lastTime = performance.now();
    let totalTime = 0;
    let rafId = 0;

    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      totalTime += dt;

      const st = animStateRef.current;
      st.elapsed += dt;

      // Trigger one-shot burst particles when eventTick advances
      if (st.tick !== lastTickHandled) {
        lastTickHandled = st.tick;
        if (st.kind === 'hero_attack') {
          spawnBurst(MON_HOME_X - 0.2, 1.3, 14, true);
        } else if (st.kind === 'monster_attack') {
          spawnBurst(HERO_HOME_X + 0.2, 1.3, 14, false);
        } else if (st.kind === 'monster_ko') {
          spawnBurst(MON_HOME_X, 1.6, 34, true);
          spawnBurst(0, 2.2, 24, true);
        } else if (st.kind === 'hero_ko') {
          spawnBurst(HERO_HOME_X, 1.4, 28, false);
          spawnBurst(0, 2.2, 20, false);
        }
      }

      // Reset poses smoothly before layering animation state
      let hx = HERO_HOME_X;
      let hy = Math.sin(totalTime * 3.1) * 0.05;
      let hRotZ = 0;
      let hRightArmX = -0.35 + Math.sin(totalTime * 3.1) * 0.08;
      let hLeftArmX = Math.sin(totalTime * 3.1 + Math.PI) * 0.08;
      let hLegSwing = 0;

      let mx = MON_HOME_X;
      let my = MON_BASE_Y + Math.sin(totalTime * 2.8 + 1.1) * 0.08;
      let mRotZ = 0;
      let mScale = isBoss ? 1.15 : 0.96;

      projMesh.visible = false;
      (heroRig.dashRing.material as THREE.MeshBasicMaterial).opacity = 0;

      // Wing flap if monster has wings
      const lw = monsterGroup.userData.leftWing as THREE.Object3D | undefined;
      const rw = monsterGroup.userData.rightWing as THREE.Object3D | undefined;
      if (lw && rw) {
        lw.rotation.z = Math.sin(totalTime * 11) * 0.45;
        rw.rotation.z = -lw.rotation.z;
      }

      const t = st.elapsed;

      if (st.kind === 'grab_ready') {
        hx = HERO_HOME_X + 0.45;
        hRightArmX = -1.25;
        (heroRig.dashRing.material as THREE.MeshBasicMaterial).opacity =
          0.45 + Math.sin(totalTime * 10) * 0.2;
      } else if (st.kind === 'hero_attack') {
        if (t < 0.35) {
          const p = t / 0.35;
          hx = HERO_HOME_X + Math.sin(p * Math.PI) * 1.45;
          hRightArmX = -1.45;
          hLegSwing = Math.sin(p * Math.PI * 3) * 0.55;
          projMesh.visible = true;
          projMesh.material = heroProjMat;
          projMesh.position.set(
            THREE.MathUtils.lerp(HERO_HOME_X + 0.7, MON_HOME_X - 0.3, p),
            1.45,
            0,
          );
          projMesh.rotation.y += dt * 14;
        } else if (t < 0.85) {
          const k = (t - 0.35) / 0.5;
          mx = MON_HOME_X + Math.sin(k * Math.PI) * 0.75;
          mRotZ = -Math.sin(k * Math.PI) * 0.38;
        }
      } else if (st.kind === 'monster_attack') {
        if (t < 0.35) {
          const p = t / 0.35;
          mx = MON_HOME_X - Math.sin(p * Math.PI) * 1.45;
          projMesh.visible = true;
          projMesh.material = monProjMat;
          projMesh.position.set(
            THREE.MathUtils.lerp(MON_HOME_X - 0.7, HERO_HOME_X + 0.3, p),
            1.45,
            0,
          );
          projMesh.rotation.y -= dt * 14;
        } else if (t < 0.85) {
          const k = (t - 0.35) / 0.5;
          hx = HERO_HOME_X - Math.sin(k * Math.PI) * 0.75;
          hRotZ = Math.sin(k * Math.PI) * 0.38;
        }
      } else if (st.kind === 'monster_ko') {
        const p = Math.min(1, t / 0.45);
        // Victorious hopping Hero raising weapon & arm!
        hy = Math.abs(Math.sin(totalTime * 9)) * 0.55;
        hRightArmX = -2.55;
        hLeftArmX = -2.35;
        // Knocked-out Monster toppled onto the arena floor
        mx = MON_HOME_X + p * 0.7;
        my = THREE.MathUtils.lerp(MON_BASE_Y, 0.45, p);
        mRotZ = THREE.MathUtils.lerp(0, -Math.PI / 2, p);
        mScale *= 1 - p * 0.18;
      } else if (st.kind === 'hero_ko') {
        const p = Math.min(1, t / 0.45);
        // Knocked-out Hero fallen sideways!
        hx = HERO_HOME_X - p * 0.65;
        hy = THREE.MathUtils.lerp(0, 0.42, p);
        hRotZ = THREE.MathUtils.lerp(0, Math.PI / 2, p);
        // Monster hopping gleefully!
        my = MON_BASE_Y + Math.abs(Math.sin(totalTime * 8.5)) * 0.45;
      }

      heroRig.root.position.set(hx, hy, 0);
      heroRig.root.rotation.z = hRotZ;
      heroRig.rightArm.rotation.x = hRightArmX;
      heroRig.leftArm.rotation.x = hLeftArmX;
      heroRig.leftLeg.rotation.x = hLegSwing;
      heroRig.rightLeg.rotation.x = -hLegSwing;

      monsterGroup.position.set(mx, my, 0);
      monsterGroup.rotation.z = mRotZ;
      monsterGroup.scale.setScalar(mScale);

      // Update sparks & confetti physics
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life >= s.maxLife) {
          scene.remove(s.mesh);
          sparks.splice(i, 1);
          continue;
        }
        s.vy -= 9.5 * dt;
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        s.mesh.rotation.x += s.rx * dt;
        s.mesh.rotation.y += s.ry * dt;
      }

      renderer.render(scene, camera);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
      sparks.forEach((s) => scene.remove(s.mesh));
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.geometry.dispose();
      });
      projGeo.dispose();
      confettiGeo.dispose();
      heroProjMat.dispose();
      monProjMat.dispose();
      confettiMats.forEach((m) => m.dispose());
      palette.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [monsterType, isBoss]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
};
