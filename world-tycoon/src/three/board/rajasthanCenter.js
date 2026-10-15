/**
 * three/board/rajasthanCenter.js
 * Builds the authentic Rajasthan diorama center for Rajasthan Edition:
 * - The Great Thar Desert with undulating golden sand dunes, wind ripples & caravan trails.
 * - Sacred Royal Oasis Lake (Lake Pichola / Jal Mahal) with sandstone ghat steps & water pavilion.
 * - Majestic Hill Fort (inspired by Mehrangarh, Jaisalmer & Amer) with sandstone ramparts,
 *   corner bastions, crenellations, Rajput chhatris (domed cupolas), carved jharokhas,
 *   grand Suraj Pol gateway, and the royal saffron flag (Bhagwa Dhwaj).
 * - Desert flora: Royal date palms with fruit bunches, flowering bougainvillea shrubs,
 *   and a low-poly Thar desert camel with traditional Rajasthani saddle tapestry.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';

/**
 * Creates the authentic Thar desert & sandstone courtyard canvas texture for the inner ground plane.
 * @returns {THREE.CanvasTexture}
 */
export function createRajasthanDesertTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 1. Outer roadway: rustic desert asphalt with sandstone borders
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(0, 0, 1024, 1024);

  // Sandstone outer curb
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 1012, 1012);

  // Dashed lane divider in warm sandstone white
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 6;
  ctx.setLineDash([26, 22]);
  ctx.strokeRect(52, 52, 920, 920);
  ctx.setLineDash([]);

  // Crosswalks
  const crossWalks = [
    { x: 30, y: 30, w: 70, h: 70 },
    { x: 924, y: 30, w: 70, h: 70 },
    { x: 30, y: 924, w: 70, h: 70 },
    { x: 924, y: 924, w: 70, h: 70 }
  ];
  ctx.fillStyle = '#fef3c7';
  crossWalks.forEach(cwk => {
    for (let s = 6; s < cwk.w - 6; s += 14) {
      ctx.fillRect(cwk.x + s, cwk.y + 4, 8, cwk.h - 8);
    }
  });

  // Inner boundary
  const pm = 104;
  const ps = 1024 - pm * 2;

  // 2. Sandstone plinth coping rim
  ctx.fillStyle = '#b45309';
  ctx.fillRect(pm - 8, pm - 8, ps + 16, ps + 16);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 4;
  ctx.strokeRect(pm - 8, pm - 8, ps + 16, ps + 16);

  // 3. Thar Desert Sand Ground with Golden Dune Gradients
  const sandGrad = ctx.createLinearGradient(pm, pm, pm + ps, pm + ps);
  sandGrad.addColorStop(0.0, '#fef08a'); // Warm morning sun highlights
  sandGrad.addColorStop(0.25, '#fde047'); // Golden sand
  sandGrad.addColorStop(0.55, '#f59e0b'); // Rich Thar amber
  sandGrad.addColorStop(0.85, '#d97706'); // Deep desert ochre
  sandGrad.addColorStop(1.0, '#b45309'); // Sandstone shadows
  ctx.fillStyle = sandGrad;
  ctx.fillRect(pm, pm, ps, ps);

  // 4. Undulating wind dune ripples
  ctx.save();
  ctx.lineWidth = 1.8;
  for (let r = 0; r < 90; r++) {
    const yBase = pm + (r / 90) * ps;
    const waveAmp = 4 + (r % 7) * 2.5;
    const waveFreq = 0.015 + (r % 5) * 0.004;

    ctx.beginPath();
    ctx.moveTo(pm, yBase);
    for (let x = pm; x <= pm + ps; x += 12) {
      const yOffset = Math.sin(x * waveFreq + r * 0.2) * waveAmp;
      ctx.lineTo(x, yBase + yOffset);
    }
    ctx.strokeStyle = r % 2 === 0 ? 'rgba(217, 119, 6, 0.28)' : 'rgba(254, 240, 138, 0.45)';
    ctx.stroke();
  }
  ctx.restore();

  // 5. Desert sand grain texture & stippling
  for (let n = 0; n < 4000; n++) {
    const px = pm + Math.random() * ps;
    const py = pm + Math.random() * ps;
    const isLight = Math.random() > 0.5;
    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.25)' : 'rgba(120, 53, 15, 0.20)';
    ctx.fillRect(px, py, 1.5, 1.5);
  }

  // 6. Lake Pichola Oasis Water Body Footprint on texture
  const lakeCenterX = pm + ps * 0.72;
  const lakeCenterY = pm + ps * 0.35;
  const lakeGrad = ctx.createRadialGradient(lakeCenterX, lakeCenterY, 30, lakeCenterX, lakeCenterY, 210);
  lakeGrad.addColorStop(0.0, 'rgba(2, 132, 199, 0.75)');
  lakeGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.65)');
  lakeGrad.addColorStop(0.88, 'rgba(56, 189, 248, 0.40)');
  lakeGrad.addColorStop(1.0, 'rgba(245, 158, 11, 0.0)');
  ctx.fillStyle = lakeGrad;
  ctx.beginPath();
  ctx.ellipse(lakeCenterX, lakeCenterY, 200, 150, Math.PI / 12, 0, Math.PI * 2);
  ctx.fill();

  // 7. Cobblestone Fort Courtyard Plaza on Left
  const fortPlazaX = pm + ps * 0.15;
  const fortPlazaY = pm + ps * 0.35;
  const plazaW = ps * 0.36;
  const plazaH = ps * 0.50;
  ctx.fillStyle = 'rgba(180, 83, 9, 0.35)';
  ctx.fillRect(fortPlazaX, fortPlazaY, plazaW, plazaH);
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(fortPlazaX, fortPlazaY, plazaW, plazaH);

  // Winding camel caravan path from fort gateway toward oasis lake
  ctx.beginPath();
  ctx.moveTo(fortPlazaX + plazaW * 0.8, fortPlazaY + plazaH * 0.5);
  ctx.bezierCurveTo(
    fortPlazaX + plazaW + 80, fortPlazaY + plazaH * 0.6,
    lakeCenterX - 60, lakeCenterY + 120,
    lakeCenterX, lakeCenterY + 40
  );
  ctx.lineWidth = 32;
  ctx.strokeStyle = 'rgba(254, 243, 199, 0.45)';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Inner decorative border
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.strokeRect(pm, pm, ps, ps);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = context.maxAnisotropy || 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates an authentic Rajasthani domed Chhatri (cenotaph cupola).
 * @param {number} scale
 * @param {number} colorHex - Sandstone tone
 * @returns {THREE.Group}
 */
export function createRajasthanChhatri3D(scale = 1.0, colorHex = 0xf59e0b) {
  const chhatri = new THREE.Group();
  const sandMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.50,
    metalness: 0.08
  });
  const darkSandMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.60
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.20,
    metalness: 0.85
  });

  // 1. Plinth / Platform Base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.72 * scale, 0.12 * scale, 0.72 * scale),
    darkSandMat
  );
  base.position.y = 0.06 * scale;
  base.castShadow = true;
  base.receiveShadow = true;
  chhatri.add(base);

  // 2. Four Carved Sandstone Pillars
  const pillarRadius = 0.045 * scale;
  const pillarHeight = 0.65 * scale;
  const pOffset = 0.26 * scale;
  const pillarGeo = new THREE.CylinderGeometry(pillarRadius, pillarRadius * 1.15, pillarHeight, 8);

  const pillarPositions = [
    { x: -pOffset, z: -pOffset },
    { x: pOffset, z: -pOffset },
    { x: pOffset, z: pOffset },
    { x: -pOffset, z: pOffset }
  ];

  pillarPositions.forEach(pos => {
    const pillar = new THREE.Mesh(pillarGeo, sandMat);
    pillar.position.set(pos.x, (0.12 + pillarHeight / 2) * scale, pos.z);
    pillar.castShadow = true;
    chhatri.add(pillar);

    // Pillar capital bracket
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.12 * scale, 0.06 * scale, 0.12 * scale),
      darkSandMat
    );
    cap.position.set(pos.x, (0.12 + pillarHeight) * scale, pos.z);
    chhatri.add(cap);
  });

  // 3. Eaves / Chhajja (Sloping Stone Sunshade)
  const eave = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55 * scale, 0.44 * scale, 0.08 * scale, 8),
    sandMat
  );
  eave.position.y = (0.12 + pillarHeight + 0.04) * scale;
  eave.castShadow = true;
  chhatri.add(eave);

  // 4. Fluted Cupola Dome
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.42 * scale, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    sandMat
  );
  dome.position.y = (0.12 + pillarHeight + 0.08) * scale;
  dome.castShadow = true;
  chhatri.add(dome);

  // 5. Golden Kalash Finial with Spire
  const kalash = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02 * scale, 0.08 * scale, 0.22 * scale, 8),
    goldMat
  );
  kalash.position.y = (0.12 + pillarHeight + 0.08 + 0.42 + 0.10) * scale;
  kalash.castShadow = true;
  chhatri.add(kalash);

  const finialTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.04 * scale, 8, 8),
    goldMat
  );
  finialTip.position.y = (0.12 + pillarHeight + 0.08 + 0.42 + 0.22) * scale;
  chhatri.add(finialTip);

  return chhatri;
}

/**
 * Creates a Rajput Jharokha (ornate carved lattice balcony).
 * @param {number} scale
 * @returns {THREE.Group}
 */
export function createRajasthanJharokha3D(scale = 1.0) {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.50
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.55
  });

  // Balcony floor projection
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(0.60 * scale, 0.08 * scale, 0.32 * scale),
    stoneMat
  );
  floor.castShadow = true;
  g.add(floor);

  // Supporting corbel brackets
  const bracketL = new THREE.Mesh(
    new THREE.ConeGeometry(0.09 * scale, 0.24 * scale, 4),
    darkStoneMat
  );
  bracketL.rotation.x = Math.PI;
  bracketL.position.set(-0.20 * scale, -0.12 * scale, 0.05 * scale);
  const bracketR = bracketL.clone();
  bracketR.position.x = 0.20 * scale;
  g.add(bracketL, bracketR);

  // Perforated jali front panel
  const jali = new THREE.Mesh(
    new THREE.BoxGeometry(0.56 * scale, 0.36 * scale, 0.06 * scale),
    darkStoneMat
  );
  jali.position.set(0, 0.20 * scale, 0.13 * scale);
  jali.castShadow = true;
  g.add(jali);

  // Mini hood / arch canopy
  const hood = new THREE.Mesh(
    new THREE.ConeGeometry(0.38 * scale, 0.18 * scale, 6),
    stoneMat
  );
  hood.position.set(0, 0.45 * scale, 0.08 * scale);
  hood.castShadow = true;
  g.add(hood);

  return g;
}

/**
 * Builds the Majestic Royal Rajasthani Hill Fort (Mehrangarh & Amer inspired).
 * @returns {THREE.Group}
 */
export function createRajasthanFort3D() {
  const fort = new THREE.Group();

  const sandStoneColor = 0xf59e0b;
  const darkSandStoneColor = 0xb45309;
  const deepRockColor = 0x78350f;

  const sandMat = new THREE.MeshStandardMaterial({
    color: sandStoneColor,
    roughness: 0.52,
    metalness: 0.08
  });
  const darkSandMat = new THREE.MeshStandardMaterial({
    color: darkSandStoneColor,
    roughness: 0.58,
    metalness: 0.06
  });
  const rockMat = new THREE.MeshLambertMaterial({
    color: deepRockColor,
    flatShading: true
  });
  const gateTeakMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.70
  });

  // 1. ELEVATED ROCKY CRAG FOUNDATION (Hill ridge of Jodhpur/Amer)
  const hillBase = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 4.4, 0.75, 14),
    rockMat
  );
  hillBase.scale.set(1.4, 1.0, 1.15);
  hillBase.position.set(0, 0.36, 0);
  hillBase.receiveShadow = true;
  fort.add(hillBase);

  // Secondary natural rocky outcrops around foundation
  const rockOutcrops = [
    { x: -3.8, z: 1.8, s: 0.72 },
    { x: 3.2, z: -2.2, s: 0.65 },
    { x: -2.5, z: -2.8, s: 0.80 },
    { x: 2.8, z: 2.5, s: 0.68 }
  ];
  rockOutcrops.forEach(ro => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(ro.s, 0), rockMat);
    rock.scale.set(1.3, 0.65, 1.1);
    rock.position.set(ro.x, 0.32, ro.z);
    rock.castShadow = true;
    rock.receiveShadow = true;
    fort.add(rock);
  });

  // 2. MAIN FORTRESS CITADEL (Upper Palace Keep)
  const keepBase = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 1.25, 3.4),
    sandMat
  );
  keepBase.position.set(0, 1.15, 0);
  keepBase.castShadow = true;
  keepBase.receiveShadow = true;
  fort.add(keepBase);

  // Upper tiered palace storey
  const keepTop = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.0, 2.4),
    darkSandMat
  );
  keepTop.position.set(-0.2, 2.15, 0);
  keepTop.castShadow = true;
  keepTop.receiveShadow = true;
  fort.add(keepTop);

  // Highest palace tower keep
  const keepCrown = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.85, 1.5),
    sandMat
  );
  keepCrown.position.set(-0.5, 2.95, -0.2);
  keepCrown.castShadow = true;
  fort.add(keepCrown);

  // 3. FORTIFIED CORNER BASTIONS (4 Rounded / Octagonal Watchtowers)
  const bastionGeo = new THREE.CylinderGeometry(0.72, 0.88, 1.85, 12);
  const bastionPositions = [
    { x: -2.1, z: -1.7 },
    { x: 2.1, z: -1.7 },
    { x: 2.1, z: 1.7 },
    { x: -2.1, z: 1.7 }
  ];

  bastionPositions.forEach((bp, idx) => {
    const bastion = new THREE.Mesh(bastionGeo, sandMat);
    bastion.position.set(bp.x, 1.35, bp.z);
    bastion.castShadow = true;
    bastion.receiveShadow = true;
    fort.add(bastion);

    // Crenellated Parapet (Kanguras) on bastion top
    const crenelRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.72, 0.28, 12),
      darkSandMat
    );
    crenelRing.position.set(bp.x, 2.35, bp.z);
    crenelRing.castShadow = true;
    fort.add(crenelRing);

    // Authentic Rajasthani Chhatri atop all corner bastions!
    const cornerChhatri = createRajasthanChhatri3D(0.78, idx % 2 === 0 ? sandStoneColor : darkSandStoneColor);
    cornerChhatri.position.set(bp.x, 2.48, bp.z);
    fort.add(cornerChhatri);
  });

  // 4. GRAND CENTRAL CHHATRI (Atop Citadel Palace High Keep)
  const royalChhatri = createRajasthanChhatri3D(1.15, 0xfde047);
  royalChhatri.position.set(-0.5, 3.35, -0.2);
  fort.add(royalChhatri);

  // Secondary companion chhatri on palace terrace
  const terraceChhatri = createRajasthanChhatri3D(0.85, sandStoneColor);
  terraceChhatri.position.set(0.8, 2.65, 0.4);
  fort.add(terraceChhatri);

  // 5. CARVED RAJPUT JHAROKHAS (Overhanging lattice balconies)
  const jharokhaFront1 = createRajasthanJharokha3D(0.95);
  jharokhaFront1.position.set(0.6, 1.55, 1.72);
  fort.add(jharokhaFront1);

  const jharokhaFront2 = createRajasthanJharokha3D(0.80);
  jharokhaFront2.position.set(-0.8, 2.25, 1.22);
  fort.add(jharokhaFront2);

  const jharokhaSide = createRajasthanJharokha3D(0.85);
  jharokhaSide.position.set(1.42, 2.20, -0.3);
  jharokhaSide.rotation.y = Math.PI / 2;
  fort.add(jharokhaSide);

  // 6. SURAJ POL (Grand Arched Fortress Gateway)
  const gateArch = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.15, 0.55),
    darkSandMat
  );
  gateArch.position.set(0, 0.85, 1.82);
  gateArch.castShadow = true;
  fort.add(gateArch);

  // Heavy studded teakwood gate doors
  const gateDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.85, 0.12),
    gateTeakMat
  );
  gateDoor.position.set(0, 0.72, 1.95);
  fort.add(gateDoor);

  // Gateway entry ramp
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.18, 1.4),
    sandMat
  );
  ramp.position.set(0, 0.42, 2.6);
  ramp.rotation.x = 0.12;
  ramp.receiveShadow = true;
  fort.add(ramp);

  // 7. ROYAL SAFFRON FLAG OF RAJASTHAN (Bhagwa Dhwaj)
  const flagpole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 1.85, 8),
    new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 })
  );
  flagpole.position.set(-0.5, 4.65, -0.2);
  flagpole.castShadow = true;
  fort.add(flagpole);

  // Golden finial spear tip
  const flagTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.16, 8),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 })
  );
  flagTip.position.set(-0.5, 5.62, -0.2);
  fort.add(flagTip);

  // Saffron pennant cloth geometry
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(0.95, -0.26);
  flagShape.lineTo(0, -0.52);
  flagShape.closePath();

  const flagGeo = new THREE.ShapeGeometry(flagShape);
  const flagMat = new THREE.MeshLambertMaterial({
    color: 0xea580c, // Rich royal saffron
    side: THREE.DoubleSide
  });
  const pennant = new THREE.Mesh(flagGeo, flagMat);
  pennant.position.set(-0.49, 5.45, -0.2);
  pennant.rotation.y = 0.22;
  pennant.castShadow = true;
  fort.add(pennant);

  // 8. WARM NIGHT LANTERNS / DIYAS ON BASTIONS
  bastionPositions.forEach(bp => {
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.85
      })
    );
    lantern.position.set(bp.x, 2.52, bp.z);
    fort.add(lantern);
  });

  return fort;
}

/**
 * Builds the Sacred Royal Oasis Lake (Lake Pichola / Jal Mahal) with sandstone ghats & water palace.
 * @returns {THREE.Group}
 */
export function createRajasthanLake3D() {
  const lakeGroup = new THREE.Group();

  const sandStoneColor = 0xd97706;
  const darkSandStoneColor = 0xb45309;

  const ghatMat = new THREE.MeshStandardMaterial({
    color: sandStoneColor,
    roughness: 0.55
  });
  const darkGhatMat = new THREE.MeshStandardMaterial({
    color: darkSandStoneColor,
    roughness: 0.60
  });

  // 1. Shimmering Turquoise Oasis Lake Water
  const waterGeo = new THREE.CylinderGeometry(2.8, 3.1, 0.22, 24);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.10,
    metalness: 0.42,
    transparent: true,
    opacity: 0.88
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.scale.set(1.42, 1.0, 1.05);
  water.position.y = 0.36;
  water.receiveShadow = true;
  lakeGroup.add(water);

  // Lake embankment / perimeter rim
  const rimGeo = new THREE.CylinderGeometry(3.1, 3.35, 0.26, 24);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.65
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.scale.set(1.42, 1.0, 1.05);
  rim.position.y = 0.32;
  rim.receiveShadow = true;
  lakeGroup.add(rim);

  // 2. Sandstone Ghat Steps (stepping down into the sacred water)
  for (let step = 0; step < 4; step++) {
    const sWidth = 2.4 - step * 0.32;
    const sDepth = 0.32;
    const sHeight = 0.08;
    const stepMesh = new THREE.Mesh(
      new THREE.BoxGeometry(sWidth, sHeight, sDepth),
      step % 2 === 0 ? ghatMat : darkGhatMat
    );
    stepMesh.position.set(0, 0.38 - step * 0.04, -2.4 + step * 0.24);
    stepMesh.receiveShadow = true;
    stepMesh.castShadow = true;
    lakeGroup.add(stepMesh);
  }

  // 3. JAL MAHAL (Royal Water Palace Pavilion in the Lake Center)
  const jalMahalPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.26, 1.3),
    darkGhatMat
  );
  jalMahalPlinth.position.set(0, 0.44, 0);
  jalMahalPlinth.castShadow = true;
  jalMahalPlinth.receiveShadow = true;
  lakeGroup.add(jalMahalPlinth);

  // Water palace open arched pavilion with chhatri dome
  const jalMahalChhatri = createRajasthanChhatri3D(1.22, 0xfde047);
  jalMahalChhatri.position.set(0, 0.54, 0);
  lakeGroup.add(jalMahalChhatri);

  // 4. Floating Lotus Blossoms (Kamal) on water
  const lotusPositions = [
    { x: -1.8, z: -0.6 },
    { x: 1.6, z: 0.9 },
    { x: -1.2, z: 1.2 },
    { x: 2.1, z: -0.8 }
  ];

  const padGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 8);
  const padMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
  const flowerGeo = new THREE.ConeGeometry(0.10, 0.12, 6);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.3 });

  lotusPositions.forEach(lp => {
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(lp.x, 0.46, lp.z);
    const flw = new THREE.Mesh(flowerGeo, flowerMat);
    flw.rotation.x = Math.PI;
    flw.position.set(lp.x, 0.52, lp.z);
    lakeGroup.add(pad, flw);
  });

  return lakeGroup;
}

/**
 * Builds authentic Desert Sand Dunes (warm Thar golden dunes).
 * @returns {THREE.Group}
 */
export function createRajasthanDunes3D() {
  const dunes = new THREE.Group();
  const duneMat = new THREE.MeshLambertMaterial({
    color: 0xf59e0b,
    flatShading: true
  });
  const duneMatLight = new THREE.MeshLambertMaterial({
    color: 0xfde047,
    flatShading: true
  });

  const duneClusters = [
    { x: 4.6, z: 3.6, rx: 2.4, rz: 1.6, h: 0.65, light: false },
    { x: 2.2, z: 5.2, rx: 2.1, rz: 1.4, h: 0.55, light: true },
    { x: -4.8, z: 5.0, rx: 2.0, rz: 1.5, h: 0.50, light: false },
    { x: 5.2, z: -4.2, rx: 2.2, rz: 1.7, h: 0.60, light: true }
  ];

  duneClusters.forEach(d => {
    const dune = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, d.rx, d.h, 12),
      d.light ? duneMatLight : duneMat
    );
    dune.scale.set(1.0, 1.0, d.rz / d.rx);
    dune.position.set(d.x, 0.28 + d.h / 2, d.z);
    dune.castShadow = true;
    dune.receiveShadow = true;
    dunes.add(dune);
  });

  return dunes;
}

/**
 * Builds an authentic curved Royal Date Palm tree.
 * @param {number} x
 * @param {number} z
 * @param {number} scale
 * @param {number} rotY
 * @returns {THREE.Group}
 */
export function createRajasthanDatePalm3D(x = 0, z = 0, scale = 1.0, rotY = 0) {
  const palm = new THREE.Group();

  const trunkMat = new THREE.MeshLambertMaterial({
    color: 0x78350f,
    flatShading: true
  });
  const frondMat = new THREE.MeshLambertMaterial({
    color: 0x16a34a,
    flatShading: true
  });
  const datesMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.4
  });

  // Curved segmented trunk (4 tilted cylinders)
  const segments = 4;
  let curY = 0;
  let curX = 0;
  for (let s = 0; s < segments; s++) {
    const segH = 0.52 * scale;
    const segR1 = (0.16 - s * 0.02) * scale;
    const segR2 = (0.19 - s * 0.02) * scale;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(segR1, segR2, segH, 7),
      trunkMat
    );
    seg.position.set(curX, curY + segH / 2, 0);
    seg.rotation.z = -0.09 * (s + 1);
    seg.castShadow = true;
    palm.add(seg);

    curY += segH * 0.95;
    curX += 0.05 * scale;
  }

  // Fruit clusters (dates) hanging below crown
  for (let d = 0; d < 3; d++) {
    const cluster = new THREE.Mesh(
      new THREE.SphereGeometry(0.12 * scale, 6, 6),
      datesMat
    );
    cluster.scale.set(1, 1.4, 1);
    const ang = (d / 3) * Math.PI * 2;
    cluster.position.set(curX + Math.cos(ang) * 0.15 * scale, curY - 0.08 * scale, Math.sin(ang) * 0.15 * scale);
    palm.add(cluster);
  }

  // Arching Feather Palm Fronds (8 radially distributed curved leaves)
  const frondCount = 8;
  for (let f = 0; f < frondCount; f++) {
    const ang = (f / frondCount) * Math.PI * 2;
    const frondGroup = new THREE.Group();

    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.24 * scale, 1.15 * scale, 4),
      frondMat
    );
    blade.scale.set(1.4, 1.0, 0.25);
    blade.position.y = 0.55 * scale;
    blade.castShadow = true;
    frondGroup.add(blade);

    frondGroup.position.set(curX, curY, 0);
    frondGroup.rotation.y = ang;
    frondGroup.rotation.x = 0.72; // Arch outward and downward
    palm.add(frondGroup);
  }

  palm.position.set(x, 0.35, z);
  palm.rotation.y = rotY;
  return palm;
}

/**
 * Builds a charming low-poly Thar Desert Camel with Rajasthani tapestry saddle.
 * @param {number} x
 * @param {number} z
 * @param {number} scale
 * @param {number} rotY
 * @returns {THREE.Group}
 */
export function createRajasthanCamel3D(x = 0, z = 0, scale = 1.0, rotY = 0) {
  const camel = new THREE.Group();

  const furMat = new THREE.MeshLambertMaterial({
    color: 0xd97706, // Camel tan
    flatShading: true
  });
  const darkFurMat = new THREE.MeshLambertMaterial({
    color: 0xb45309,
    flatShading: true
  });
  const saddleMat = new THREE.MeshStandardMaterial({
    color: 0xbe123c, // Royal Rajasthani crimson tapestry
    roughness: 0.5
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.8,
    roughness: 0.3
  });

  // 1. Sturdy Barrel Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.85 * scale, 0.65 * scale, 1.45 * scale),
    furMat
  );
  body.position.y = 0.95 * scale;
  body.castShadow = true;
  body.receiveShadow = true;
  camel.add(body);

  // 2. Iconic Camel Hump
  const hump = new THREE.Mesh(
    new THREE.ConeGeometry(0.42 * scale, 0.65 * scale, 8),
    darkFurMat
  );
  hump.scale.set(0.9, 1.0, 1.2);
  hump.position.set(0, 1.45 * scale, 0.05 * scale);
  hump.castShadow = true;
  camel.add(hump);

  // 3. Royal Tapestry Saddle & Gold Fringe
  const saddle = new THREE.Mesh(
    new THREE.BoxGeometry(0.92 * scale, 0.35 * scale, 0.90 * scale),
    saddleMat
  );
  saddle.position.set(0, 1.15 * scale, 0.05 * scale);
  saddle.castShadow = true;
  camel.add(saddle);

  const goldTrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.96 * scale, 0.08 * scale, 0.94 * scale),
    goldTrimMat
  );
  goldTrim.position.set(0, 1.02 * scale, 0.05 * scale);
  camel.add(goldTrim);

  // 4. Elegant Curved Neck & Head
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * scale, 0.24 * scale, 0.85 * scale, 6),
    furMat
  );
  neck.position.set(0, 1.35 * scale, 0.78 * scale);
  neck.rotation.x = 0.42;
  neck.castShadow = true;
  camel.add(neck);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.28 * scale, 0.28 * scale, 0.52 * scale),
    furMat
  );
  head.position.set(0, 1.75 * scale, 1.05 * scale);
  head.castShadow = true;
  camel.add(head);

  // Cute desert ears
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.06 * scale, 0.16 * scale, 4), darkFurMat);
  earL.position.set(-0.12 * scale, 1.95 * scale, 0.92 * scale);
  const earR = earL.clone();
  earR.position.x = 0.12 * scale;
  camel.add(earL, earR);

  // 5. Four Legs
  const legGeo = new THREE.CylinderGeometry(0.08 * scale, 0.10 * scale, 0.75 * scale, 6);
  const legOffsets = [
    { x: -0.32, z: 0.45 },
    { x: 0.32, z: 0.45 },
    { x: -0.32, z: -0.45 },
    { x: 0.32, z: -0.45 }
  ];
  legOffsets.forEach(lo => {
    const leg = new THREE.Mesh(legGeo, furMat);
    leg.position.set(lo.x * scale, 0.38 * scale, lo.z * scale);
    leg.castShadow = true;
    camel.add(leg);

    // Desert foot / hoof pad
    const hoof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12 * scale, 0.13 * scale, 0.08 * scale, 6),
      darkFurMat
    );
    hoof.position.set(lo.x * scale, 0.04 * scale, lo.z * scale);
    camel.add(hoof);
  });

  camel.position.set(x, 0.35, z);
  camel.rotation.y = rotY;
  return camel;
}

/**
 * Builds the complete authentic Rajasthan diorama centerpiece.
 * @param {THREE.Group} boardGroup
 * @returns {THREE.Group}
 */
export function buildRajasthanCenterpiece3D(boardGroup) {
  const rajasthanGroup = new THREE.Group();
  rajasthanGroup.name = 'rajasthan-centerpiece';

  // 1. The Majestic Hill Fort on Left
  const fort = createRajasthanFort3D();
  fort.position.set(-3.2, 0, 0);
  rajasthanGroup.add(fort);

  // 2. The Sacred Royal Oasis Lake on Right-Front
  const lake = createRajasthanLake3D();
  lake.position.set(3.4, 0, -2.4);
  rajasthanGroup.add(lake);

  // 3. Thar Desert Sand Dunes
  const dunes = createRajasthanDunes3D();
  rajasthanGroup.add(dunes);

  // 4. Royal Date Palms around Lake & Dunes
  const palms = [
    { x: 1.2, z: -4.8, s: 1.15, r: 0.4 },
    { x: 5.6, z: -0.8, s: 1.05, r: -1.2 },
    { x: 2.2, z: -0.4, s: 0.95, r: 1.8 },
    { x: 4.8, z: 2.2, s: 1.10, r: -0.5 }
  ];
  palms.forEach(p => {
    const palm = createRajasthanDatePalm3D(p.x, p.z, p.s, p.r);
    rajasthanGroup.add(palm);
  });

  // 5. Desert Caravan Camels
  const camel1 = createRajasthanCamel3D(2.8, 3.2, 0.92, -0.6);
  const camel2 = createRajasthanCamel3D(4.2, 4.4, 0.78, -0.8);
  rajasthanGroup.add(camel1, camel2);

  // 6. Flowering Desert Bougainvillea Shrubs
  const bougMat = new THREE.MeshLambertMaterial({ color: 0xdb2777, flatShading: true });
  [
    { x: -0.8, z: 2.8, s: 0.42 },
    { x: 0.6, z: -2.8, s: 0.38 },
    { x: 2.4, z: 1.2, s: 0.35 }
  ].forEach(bp => {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(bp.s, 0), bougMat);
    bush.position.set(bp.x, 0.48, bp.z);
    bush.castShadow = true;
    rajasthanGroup.add(bush);
  });

  boardGroup.add(rajasthanGroup);
  return rajasthanGroup;
}
