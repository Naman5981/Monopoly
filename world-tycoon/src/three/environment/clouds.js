/**
 * three/environment/clouds.js
 * Atmospheric low-poly floating clouds with gentle drifting and festival hot-air balloons.
 */

import * as THREE from 'three';

export const lowPolyClouds = [];
export const festivalBalloons = [];

/**
 * Builds low-poly stylized clouds drifting around the perimeter skybox.
 * @param {THREE.Group} boardGroup
 */
export function buildLowPolyFloatingClouds3D(boardGroup) {
  lowPolyClouds.length = 0;
  const cloudMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    flatShading: true,
    transparent: true,
    opacity: 0.92
  });

  const configs = [
    { x: -16, y: 7.5, z: -12, scale: 1.15, speed: 0.18, phase: 0 },
    { x: 15, y: 8.2, z: -14, scale: 0.95, speed: 0.14, phase: 2.1 },
    { x: -17, y: 6.8, z: 13, scale: 1.05, speed: 0.16, phase: 4.2 },
    { x: 16, y: 7.8, z: 11, scale: 0.88, speed: 0.15, phase: 1.3 }
  ];

  configs.forEach(cfg => {
    const cg = new THREE.Group();
    const puffs = [
      { x: 0, y: 0, z: 0, r: 1.1 },
      { x: 0.95, y: -0.1, z: 0.2, r: 0.82 },
      { x: -0.9, y: -0.15, z: -0.1, r: 0.78 },
      { x: 0.3, y: 0.45, z: -0.2, r: 0.72 }
    ];

    puffs.forEach(pf => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(pf.r, 0), cloudMat);
      m.position.set(pf.x, pf.y, pf.z);
      m.scale.set(1.1, 0.78, 0.95);
      cg.add(m);
    });

    cg.scale.setScalar(cfg.scale);
    cg.position.set(cfg.x, cfg.y, cfg.z);
    boardGroup.add(cg);

    lowPolyClouds.push({
      mesh: cg,
      baseX: cfg.x,
      baseY: cfg.y,
      baseZ: cfg.z,
      speed: cfg.speed,
      phase: cfg.phase
    });
  });
}

/**
 * Builds a festive hot-air balloon floating over the diorama park.
 * @param {THREE.Group} boardGroup
 */
export function buildFestivalBalloon3D(boardGroup) {
  festivalBalloons.length = 0;
  const balloonGroup = new THREE.Group();
  const envelope = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.95, 1),
    new THREE.MeshLambertMaterial({ color: 0xf43f5e, flatShading: true })
  );
  envelope.scale.set(1, 1.22, 1);
  envelope.position.y = 4.2;
  envelope.castShadow = true;

  const basket = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.35, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xb45309, flatShading: true })
  );
  basket.position.y = 2.65;
  balloonGroup.add(envelope, basket);
  balloonGroup.position.set(-15.5, 4.5, -15.5);
  boardGroup.add(balloonGroup);

  festivalBalloons.push({ mesh: balloonGroup, baseH: 4.5, phase: 0.7 });
}

/**
 * Updates cloud drift and balloon bobbing per frame.
 * @param {number} t - Time in seconds
 */
export function updateCloudsAndBalloons(t) {
  lowPolyClouds.forEach(c => {
    c.mesh.position.x = c.baseX + Math.sin(t * c.speed + c.phase) * 1.8;
    c.mesh.position.y = c.baseY + Math.cos(t * 0.6 + c.phase) * 0.25;
  });

  festivalBalloons.forEach(b => {
    b.mesh.position.y = b.baseH + Math.sin(t * 1.6 + b.phase) * 0.16;
  });
}
