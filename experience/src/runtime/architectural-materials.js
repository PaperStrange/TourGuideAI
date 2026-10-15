const finishes = {
  'pale-stone': { roughness: 1, metalness: 0, normalStrength: 0.48, environment: 1 },
  'granite-fascia': { roughness: 0.88, metalness: 0, normalStrength: 0.42, environment: 1.15 },
  'glazing': { roughness: 0.12, metalness: 0, environment: 2.1 },
  'glazing-blinds': { roughness: 0.19, metalness: 0, environment: 1.75 },
  'glass-dark': { roughness: 0.14, metalness: 0, environment: 1.9 },
  'bronze-frame': { roughness: 0.3, metalness: 0.8, environment: 1.2 },
  'metal': { roughness: 0.27, metalness: 0.85, environment: 1.15 },
  'dark-metal': { roughness: 0.34, metalness: 0.75, environment: 1.1 },
  'canopy': { roughness: 0.72, metalness: 0, environment: 0.9 },
};

export function prepareArchitecturalMaterials(root, maxAnisotropy) {
  const replacements = new Map(), textures = new Set();
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const materials = [mesh.material].flat().map(source => {
      if (!replacements.has(source)) {
        const material = source.clone(), finish = finishes[source.name];
        if (finish && material.isMeshStandardMaterial) {
          material.roughness = finish.roughness;
          material.metalness = finish.metalness;
          material.envMapIntensity = finish.environment;
          if (finish.normalStrength !== undefined) material.normalScale.setScalar(finish.normalStrength);
        }
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
          const texture = material[key];
          if (texture && !textures.has(texture)) {
            texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
            texture.needsUpdate = true;
            textures.add(texture);
          }
        }
        replacements.set(source, material);
      }
      return replacements.get(source);
    });
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
  });
  for (const material of replacements.keys()) material.dispose();
  return { materials: replacements.size, filteredTextures: textures.size };
}
