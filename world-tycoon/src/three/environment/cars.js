/**
 * three/environment/cars.js
 * Procedural low-poly vehicles (sports car, taxi, delivery truck, motorcycle, SUV)
 * that patrol the outer racetrack/roadway circuit around the board with physics-based suspension.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';

export let roadCars = [];
let lastCarAnimTime = performance.now();

/**
 * Creates a detailed stylized 3D vehicle.
 * @param {number} variantIdx - 0: Sports Car, 1: Cargo Truck, 2: Taxi, 3: Motorcycle, 4: SUV
 * @returns {THREE.Group}
 */
export function createDetailed3DVehicleMesh(variantIdx) {
  const carGroup = new THREE.Group();
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });
  const rimMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.85, flatShading: true });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 0.85, roughness: 0.2 });

  const wheels = [];
  const suspensionGroup = new THREE.Group();
  carGroup.add(suspensionGroup);

  // Variant 1: Heavy Cargo Delivery Box Truck
  if (variantIdx === 1) {
    const underShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.48, 0.65),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.35 })
    );
    underShadow.rotation.x = -Math.PI / 2;
    underShadow.position.y = 0.02;
    carGroup.add(underShadow);

    const cabMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.2, flatShading: true });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5, metalness: 0.1, flatShading: true });
    const chassisMat = new THREE.MeshLambertMaterial({ color: 0x334155 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 0.44), chassisMat);
    chassis.position.set(0, 0.18, 0);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    suspensionGroup.add(chassis);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.50), cabMat);
    cab.position.set(0.44, 0.40, 0);
    cab.castShadow = true;
    cab.receiveShadow = true;
    suspensionGroup.add(cab);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.46), glassMat);
    windshield.position.set(0.64, 0.45, 0);
    suspensionGroup.add(windshield);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.16, 0.52), chromeMat);
    bumper.position.set(0.70, 0.18, 0);
    bumper.castShadow = true;
    suspensionGroup.add(bumper);

    const deflector = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.46), cabMat);
    deflector.position.set(0.40, 0.68, 0);
    deflector.castShadow = true;
    suspensionGroup.add(deflector);

    const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.58, 0.52), boxMat);
    cargoBox.position.set(-0.25, 0.48, 0);
    cargoBox.castShadow = true;
    cargoBox.receiveShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.925, 0.08, 0.525), new THREE.MeshLambertMaterial({ color: 0xef4444 }));
    stripe.position.set(-0.25, 0.48, 0);
    suspensionGroup.add(cargoBox, stripe);

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.52, 8), chromeMat);
    exhaust.position.set(0.18, 0.52, 0.23);
    exhaust.castShadow = true;
    suspensionGroup.add(exhaust);

    [-0.18, 0.18].forEach(zOff => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.10), headlightMat);
      hl.position.set(0.71, 0.25, zOff);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.08), taillightMat);
      tl.position.set(-0.72, 0.26, zOff);
      suspensionGroup.add(hl, tl);
    });

    [
      { x: 0.48, z: 0.27 }, { x: 0.48, z: -0.27 },
      { x: -0.15, z: 0.27 }, { x: -0.15, z: -0.27 },
      { x: -0.48, z: 0.27 }, { x: -0.48, z: -0.27 }
    ].forEach(wc => {
      const wPivot = new THREE.Group();
      wPivot.position.set(wc.x, 0.14, wc.z);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.10, 12), wheelMat);
      tire.rotation.x = Math.PI / 2;
      tire.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.11, 6), rimMat);
      hub.rotation.x = Math.PI / 2;
      wPivot.add(tire, hub);
      carGroup.add(wPivot);
      wheels.push(wPivot);
    });

    carGroup.userData = { wheels, suspensionGroup };
    return carGroup;
  }

  // Variant 3: Cruiser / Commuter Motorcycle with Rider
  if (variantIdx === 3) {
    const underShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.88, 0.34),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.35 })
    );
    underShadow.rotation.x = -Math.PI / 2;
    underShadow.position.y = 0.02;
    carGroup.add(underShadow);

    const bikeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.3, flatShading: true });
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const riderSuitMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.3 });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.12), frameMat);
    frame.position.set(0, 0.18, 0);
    frame.castShadow = true;
    suspensionGroup.add(frame);

    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8), chromeMat);
    engine.rotation.z = Math.PI / 2;
    engine.position.set(0, 0.18, 0);
    suspensionGroup.add(engine);

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 6), chromeMat);
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.set(-0.16, 0.12, 0.10);
    suspensionGroup.add(exhaust);

    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.16), bikeMat);
    tank.position.set(0.10, 0.28, 0);
    tank.castShadow = true;
    suspensionGroup.add(tank);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.14), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
    seat.position.set(-0.10, 0.26, 0);
    suspensionGroup.add(seat);

    const forkL = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 6), chromeMat);
    forkL.rotation.z = -0.32;
    forkL.position.set(0.24, 0.22, -0.06);
    const forkR = forkL.clone();
    forkR.position.z = 0.06;
    suspensionGroup.add(forkL, forkR);

    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.30), chromeMat);
    hBar.position.set(0.18, 0.36, 0);
    suspensionGroup.add(hBar);

    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), headlightMat);
    hl.position.set(0.35, 0.28, 0);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08), taillightMat);
    tl.position.set(-0.32, 0.25, 0);
    suspensionGroup.add(hl, tl);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.20), riderSuitMat);
    torso.rotation.z = -0.22;
    torso.position.set(-0.06, 0.42, 0);
    torso.castShadow = true;
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), helmetMat);
    helmet.position.set(0.04, 0.58, 0);
    helmet.castShadow = true;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.12), glassMat);
    visor.position.set(0.11, 0.58, 0);
    suspensionGroup.add(torso, helmet, visor);

    [{ x: 0.32, z: 0, w: 0.07 }, { x: -0.28, z: 0, w: 0.09 }].forEach(wc => {
      const wPivot = new THREE.Group();
      wPivot.position.set(wc.x, 0.14, wc.z);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, wc.w, 12), wheelMat);
      tire.rotation.x = Math.PI / 2;
      tire.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, wc.w + 0.01, 6), rimMat);
      hub.rotation.x = Math.PI / 2;
      wPivot.add(tire, hub);
      carGroup.add(wPivot);
      wheels.push(wPivot);
    });

    carGroup.userData = { wheels, suspensionGroup };
    return carGroup;
  }

  // Variants 0, 2, 4: Sports Car, Taxi, Compact SUV
  const bodyColors = [0xef4444, 0x0284c7, 0xfacc15, 0xf97316, 0x10b981];
  const paintMat = new THREE.MeshStandardMaterial({
    color: bodyColors[variantIdx % bodyColors.length],
    roughness: 0.3,
    metalness: 0.2,
    flatShading: true
  });

  const underShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.58),
    new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.32 })
  );
  underShadow.rotation.x = -Math.PI / 2;
  underShadow.position.y = 0.02;
  carGroup.add(underShadow);

  const isSUV = (variantIdx === 4);
  const isSports = (variantIdx === 0);
  const isTaxi = (variantIdx === 2);

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.22, 0.50), paintMat);
  chassis.position.y = 0.20;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  suspensionGroup.add(chassis);

  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.48), new THREE.MeshLambertMaterial({ color: 0x334155 }));
  bumperF.position.set(0.46, 0.15, 0);
  bumperF.castShadow = true;
  suspensionGroup.add(bumperF);

  const cabinLength = isSUV ? 0.62 : 0.48;
  const cabinHeight = isSUV ? 0.24 : 0.20;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinLength, cabinHeight, 0.42), glassMat);
  cabin.position.set(isSUV ? -0.04 : -0.02, 0.38, 0);
  cabin.castShadow = true;
  suspensionGroup.add(cabin);

  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(cabinLength - 0.08, 0.05, 0.38), paintMat);
  roofCap.position.set(isSUV ? -0.04 : -0.02, 0.38 + cabinHeight * 0.5, 0);
  roofCap.castShadow = true;
  suspensionGroup.add(roofCap);

  if (isSports) {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.48), paintMat);
    spoiler.position.set(-0.42, 0.38, 0);
    spoiler.castShadow = true;
    suspensionGroup.add(spoiler);
  } else if (isTaxi) {
    const taxiSign = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.22), headlightMat);
    taxiSign.position.set(0, 0.54, 0);
    taxiSign.castShadow = true;
    suspensionGroup.add(taxiSign);
  } else if (isSUV) {
    [-0.14, 0.14].forEach(rz => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.03), chromeMat);
      rail.position.set(-0.04, 0.52, rz);
      suspensionGroup.add(rail);
    });
  }

  [-0.16, 0.16].forEach(zOff => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.10), headlightMat);
    hl.position.set(0.47, 0.22, zOff);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.10), taillightMat);
    tl.position.set(-0.47, 0.22, zOff);
    suspensionGroup.add(hl, tl);
  });

  [{ x: 0.28, z: 0.26 }, { x: 0.28, z: -0.26 }, { x: -0.28, z: 0.26 }, { x: -0.28, z: -0.26 }].forEach(wc => {
    const wPivot = new THREE.Group();
    wPivot.position.set(wc.x, 0.13, wc.z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.10, 12), wheelMat);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.11, 6), rimMat);
    hub.rotation.x = Math.PI / 2;
    wPivot.add(tire, hub);
    carGroup.add(wPivot);
    wheels.push(wPivot);
  });

  carGroup.userData = { wheels, suspensionGroup };
  return carGroup;
}

export function getRoadTrackPoint(p, R) {
  const cr = 1.35;
  const hs = R - cr;
  const sLen = 2 * hs;
  const cLen = 0.5 * Math.PI * cr;
  const qLen = sLen + cLen;
  const totalLen = 4 * qLen;

  let d = (((p % 1) + 1) % 1) * totalLen;
  const qIdx = Math.floor(d / qLen);
  const qDist = d - qIdx * qLen;

  let x = 0, z = 0;
  if (qIdx === 0) {
    if (qDist < sLen) {
      x = hs - (qDist / sLen) * (2 * hs);
      z = R;
    } else {
      const t = (qDist - sLen) / cLen;
      const angle = Math.PI / 2 + t * (Math.PI / 2);
      x = -hs + cr * Math.cos(angle);
      z = hs + cr * Math.sin(angle);
    }
  } else if (qIdx === 1) {
    if (qDist < sLen) {
      x = -R;
      z = hs - (qDist / sLen) * (2 * hs);
    } else {
      const t = (qDist - sLen) / cLen;
      const angle = Math.PI + t * (Math.PI / 2);
      x = -hs + cr * Math.cos(angle);
      z = -hs + cr * Math.sin(angle);
    }
  } else if (qIdx === 2) {
    if (qDist < sLen) {
      x = -hs + (qDist / sLen) * (2 * hs);
      z = -R;
    } else {
      const t = (qDist - sLen) / cLen;
      const angle = 1.5 * Math.PI + t * (Math.PI / 2);
      x = hs + cr * Math.cos(angle);
      z = -hs + cr * Math.sin(angle);
    }
  } else {
    if (qDist < sLen) {
      x = R;
      z = -hs + (qDist / sLen) * (2 * hs);
    } else {
      const t = (qDist - sLen) / cLen;
      const angle = 2 * Math.PI + t * (Math.PI / 2);
      x = hs + cr * Math.cos(angle);
      z = hs + cr * Math.sin(angle);
    }
  }
  return { x, z };
}

export function buildAnimatedRoadCars3D(boardGroup) {
  roadCars.forEach(c => {
    if (c.mesh) boardGroup.remove(c.mesh);
  });
  roadCars = [];
  lastCarAnimTime = performance.now();

  for (let i = 0; i < 5; i++) {
    const carMesh = createDetailed3DVehicleMesh(i);
    const laneRadius = (i % 2 === 0) ? 9.48 : 8.92;
    const direction = (i % 2 === 0) ? 1 : -1;
    const baseSpeed = 0.00016 + Math.random() * 0.00008;
    boardGroup.add(carMesh);
    roadCars.push({
      mesh: carMesh,
      progress: (i / 5) + Math.random() * 0.08,
      currentSpeed: baseSpeed,
      targetSpeed: baseSpeed,
      minSpeed: 0.00010,
      maxSpeed: 0.00028,
      laneRadius,
      direction,
      nextSpeedChangeTime: performance.now() + 1000 + Math.random() * 2500,
      bobPhase: Math.random() * Math.PI * 2
    });
  }
}

export function resetLocalCarAnimationClock() {
  lastCarAnimTime = performance.now();
}

export function updateRoadCarsAnimation() {
  const now = performance.now();
  const dtScale = Math.min(2.0, Math.max(0.4, (now - lastCarAnimTime) / 16.67));
  lastCarAnimTime = now;

  roadCars.forEach((c, idx) => {
    if (now >= c.nextSpeedChangeTime) {
      const r = Math.random();
      c.targetSpeed = r < 0.3
        ? c.maxSpeed * (0.85 + Math.random() * 0.15)
        : r < 0.65
          ? c.minSpeed + (c.maxSpeed - c.minSpeed) * (0.4 + Math.random() * 0.3)
          : c.minSpeed * (0.95 + Math.random() * 0.15);
      c.nextSpeedChangeTime = now + 1600 + Math.random() * 3000;
    }

    roadCars.forEach((other, oIdx) => {
      if (idx === oIdx || c.direction !== other.direction || c.laneRadius !== other.laneRadius) return;
      let d = (other.progress - c.progress) * c.direction;
      if (d < 0) d += 1;
      if (d > 0 && d < 0.08) {
        c.targetSpeed = Math.min(c.targetSpeed, other.currentSpeed * 0.8);
      }
    });

    const accel = c.targetSpeed - c.currentSpeed;
    c.currentSpeed += accel * 0.04;
    c.progress = (c.progress + c.currentSpeed * c.direction * dtScale + 1) % 1;

    const pos = getRoadTrackPoint(c.progress, c.laneRadius);
    const stepAhead = 0.0015 * c.direction;
    const posAhead = getRoadTrackPoint((c.progress + stepAhead + 1) % 1, c.laneRadius);

    const dx = posAhead.x - pos.x;
    const dz = posAhead.z - pos.z;
    const targetRotY = Math.atan2(-dz, dx);

    c.mesh.position.set(pos.x, 0.36, pos.z);

    const curY = c.mesh.rotation.y;
    let diffY = ((targetRotY - curY + Math.PI) % (Math.PI * 2));
    if (diffY < 0) diffY += Math.PI * 2;
    diffY -= Math.PI;
    c.mesh.rotation.y = curY + diffY * 0.28;

    const ud = c.mesh.userData;
    if (ud?.wheels) {
      ud.wheels.forEach(w => {
        w.rotation.z -= Math.abs(c.currentSpeed) * dtScale * 140;
      });
    }
    if (ud?.suspensionGroup) {
      ud.suspensionGroup.position.y = Math.sin(now * 0.015 + c.bobPhase) * 0.010;
      ud.suspensionGroup.rotation.z = Math.max(-0.06, Math.min(0.06, -accel * 40));
      ud.suspensionGroup.rotation.x = Math.max(-0.08, Math.min(0.08, -diffY * 0.25));
    }
  });
}
