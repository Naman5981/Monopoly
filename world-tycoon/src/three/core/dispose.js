/**
 * three/core/dispose.js
 * Centralized GPU resource and VRAM disposal utility for Three.js.
 * Recursively disposes geometries, materials, and textures to prevent memory leaks.
 */

/**
 * Disposes a single material and all of its attached textures.
 * @param {THREE.Material} mat
 */
export function disposeMaterial(mat) {
  if (!mat) return;
  for (const key of Object.keys(mat)) {
    const val = mat[key];
    if (val && typeof val === 'object' && val.isTexture) {
      try { val.dispose(); } catch (_) {}
    }
  }
  try { mat.dispose(); } catch (_) {}
}

/**
 * Traverses an Object3D hierarchy and disposes all geometries, materials, and textures.
 * @param {THREE.Object3D} root
 */
export function disposeHierarchy(root) {
  if (!root) return;
  root.traverse(obj => {
    if (obj.userData?.isShared) return;
    if (obj.geometry && !obj.geometry.userData?.isShared) {
      try { obj.geometry.dispose(); } catch (_) {}
    }
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => {
          if (m && !m.userData?.isShared) disposeMaterial(m);
        });
      } else if (!obj.material.userData?.isShared) {
        disposeMaterial(obj.material);
      }
    }
  });
}
