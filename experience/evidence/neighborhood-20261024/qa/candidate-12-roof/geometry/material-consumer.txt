import { BackSide, Color, Material, Matrix3, REVISION, ShaderChunk, Vector3 } from 'three';

const SOURCE_ID = 'osm:way:772134672', SOURCE_INDEX = 139;
const ROLE = 'nishiki-colored-roof', PROGRAM_KEY = 'nishiki-diffuse-sheet-v1-three186';
const NAMES = new Set(['nishiki-ridge-red', 'nishiki-ridge-gold', 'nishiki-ridge-green']);
const installed = new WeakMap();

function replaceOnce(source, expected, replacement) {
  if (source.indexOf(expected) < 0 || source.indexOf(expected) !== source.lastIndexOf(expected)) {
    throw new Error('Thin-sheet shader does not match the pinned Three shader chunks');
  }
  return source.replace(expected, replacement);
}

const shadowDeclarations = `
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
  varying vec4 vThinSheetIncidentShadow[ NUM_DIR_LIGHT_SHADOWS ];
#endif
`;

const vertexShadow = `
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
  vec3 thinSheetWorldNormal = normalize( shadowWorldNormal );
  // 成对表面沿世界竖直方向相隔 45 mm，不能按斜面法线挤出。
  vec3 thinSheetIncidentPosition = worldPosition.xyz
    + vec3( 0.0, -sign( thinSheetWorldNormal.y ) * thinSheetSeparation, 0.0 );
  #pragma unroll_loop_start
  for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
    {
      vec3 thinSheetShadowPosition = thinSheetIncidentPosition
        - thinSheetWorldNormal * directionalLightShadows[ i ].shadowNormalBias;
      vThinSheetIncidentShadow[ i ] = directionalShadowMatrix[ i ] * vec4( thinSheetShadowPosition, 1.0 );
    }
  }
  #pragma unroll_loop_end
#endif
`;

const directionalTransmission = `
  {
    // 入射面的阴影独立采样；普通表面的灯光与阴影计算继续保留。
    float thinSheetCosine = saturate( dot( -nonPerturbedNormal, directLight.direction ) );
    float thinSheetVisibility = 1.0;
    #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
      DirectionalLightShadow thinSheetShadow = directionalLightShadows[ i ];
      // 双面材质的背面会翻转片元法线，此时入射面就是原始几何面的外侧。
      vec4 thinSheetShadowCoord = gl_FrontFacing ? vThinSheetIncidentShadow[ i ] : vDirectionalShadowCoord[ i ];
      thinSheetVisibility = ( directLight.visible && receiveShadow )
        ? getShadow( directionalShadowMap[ i ], thinSheetShadow.shadowMapSize,
          thinSheetShadow.shadowIntensity, thinSheetShadow.shadowBias, thinSheetShadow.shadowRadius,
          thinSheetShadowCoord ) : 1.0;
    #endif
    vec3 thinSheetEntry = vec3( 1.0 ) - F_Schlick( material.specularColor, material.specularF90, thinSheetCosine );
    thinSheetDirect += directLight.color * thinSheetCosine * thinSheetVisibility * thinSheetEntry;
  }
`;

const finishTransmission = `
// 仅使用现有全局环境照明；此近似没有局部天空遮挡或照射到街面的彩色透射。
vec3 thinSheetSky = getAmbientLightIrradiance( ambientLightColor );
#if NUM_HEMI_LIGHTS > 0
  #pragma unroll_loop_start
  for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
    thinSheetSky += getHemisphereLightIrradiance( hemisphereLights[ i ], -nonPerturbedNormal );
  }
  #pragma unroll_loop_end
#endif
#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
  thinSheetSky += getIBLIrradiance( -nonPerturbedNormal );
#endif
vec3 thinSheetExit = vec3( 1.0 ) - F_Schlick( material.specularColor, material.specularF90,
  saturate( dot( nonPerturbedNormal, geometryViewDir ) ) );
vec3 thinSheetDiffuse = clamp( diffuseColor.rgb, 0.0, 1.0 ) * thinSheetColor
  * thinSheetFraction * RECIPROCAL_PI * thinSheetExit;
reflectedLight.directDiffuse *= 1.0 - thinSheetFraction;
reflectedLight.indirectDiffuse *= 1.0 - thinSheetFraction;
reflectedLight.directDiffuse += thinSheetDirect * thinSheetDiffuse;
reflectedLight.indirectDiffuse += thinSheetSky * thinSheetDiffuse * ( vec3( 1.0 ) - material.specularColor );
`;

function compileSheet(shader, uniforms) {
  if (REVISION !== '186') throw new Error('Thin-sheet material requires the pinned Three revision');
  for (const [chunk, token] of [
    ['shadowmap_vertex', 'vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );'],
    ['shadowmap_pars_vertex', 'uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];'],
    ['normal_fragment_begin', 'vec3 nonPerturbedNormal = normal;'],
    ['envmap_physical_pars_fragment', 'vec3 getIBLIrradiance( const in vec3 normal )'],
  ]) replaceOnce(ShaderChunk[chunk], token, token);
  const begin = replaceOnce(ShaderChunk.lights_fragment_begin,
    '\t\tgetDirectionalLightInfo( directionalLight, directLight );',
    '\t\tgetDirectionalLightInfo( directionalLight, directLight );' + directionalTransmission);
  // 保留 Three 负责的宏展开、灯光数量与阴影类型，不修改共享 ShaderChunk。
  shader.vertexShader = replaceOnce(shader.vertexShader, '#include <shadowmap_pars_vertex>',
    '#include <shadowmap_pars_vertex>\nuniform float thinSheetSeparation;\n' + shadowDeclarations);
  shader.vertexShader = replaceOnce(shader.vertexShader, '#include <shadowmap_vertex>',
    '#include <shadowmap_vertex>\n' + vertexShadow);
  shader.fragmentShader = replaceOnce(shader.fragmentShader, '#include <shadowmap_pars_fragment>',
    '#include <shadowmap_pars_fragment>\nuniform float thinSheetFraction;\nuniform vec3 thinSheetColor;\n' + shadowDeclarations);
  shader.fragmentShader = replaceOnce(shader.fragmentShader, '#include <lights_fragment_begin>',
    'vec3 thinSheetDirect = vec3( 0.0 );\n' + begin);
  shader.fragmentShader = replaceOnce(shader.fragmentShader, '#include <lights_fragment_end>',
    '#include <lights_fragment_end>\n' + finishTransmission);
  Object.assign(shader.uniforms, uniforms);
}

function validateSheet(mesh, previous) {
  const spec = mesh.userData.thinSheet, material = mesh.material;
  if (spec.version !== 1 || spec.role !== ROLE || spec.sourceId !== SOURCE_ID || spec.sourceIndex !== SOURCE_INDEX ||
    spec.pairedVerticalOffsetMetres !== .045 || !Number.isFinite(spec.diffuseTransmission) ||
    spec.diffuseTransmission < 0 || spec.diffuseTransmission > 1 || !Array.isArray(spec.transmissionColor) ||
    spec.transmissionColor.length !== 3 || spec.transmissionColor.some(value => !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error('Invalid Nishiki thin-sheet source, role or energy parameters');
  }
  if (!material?.isMeshStandardMaterial || !NAMES.has(material.name) || material.metalness !== 0 || material.side === BackSide ||
    (!previous && (material.transparent || material.opacity !== 1)) || (material.transmission ?? 0) !== 0 ||
    material.emissive.r !== 0 || material.emissive.g !== 0 || material.emissive.b !== 0 || material.emissiveMap ||
    (!previous && material.onBeforeCompile !== Material.prototype.onBeforeCompile)) {
    throw new Error('Thin-sheet requires an unmodified opaque nonemissive roof material');
  }
  if (!mesh.userData.occlusionGroup?.startsWith('Canopy_') ||
    mesh.userData.featureTable?.[SOURCE_INDEX]?.sourceId !== SOURCE_ID) {
    throw new Error('Thin-sheet mesh is missing its reviewed canopy source identity');
  }
  const position = mesh.geometry.getAttribute('position'), normal = mesh.geometry.getAttribute('normal');
  const source = mesh.geometry.getAttribute('_source_index');
  if (!position || position.count < 3 || !normal || !source || normal.count !== position.count || source.count !== position.count) {
    throw new Error('Thin-sheet mesh is missing source or paired-surface geometry');
  }
  const normals = new Matrix3().getNormalMatrix(mesh.matrixWorld), point = new Vector3(), direction = new Vector3();
  const points = [], keys = new Set();
  const key = value => [value.x, value.y, value.z].map(component => Math.round(component * 10000)).join(':');
  for (let index = 0; index < position.count; index++) {
    if (source.getX(index) !== SOURCE_INDEX) throw new Error('Thin-sheet mesh contains another source');
    point.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
    direction.fromBufferAttribute(normal, index).applyMatrix3(normals).normalize();
    if (!Number.isFinite(point.x + point.y + point.z + direction.x + direction.y + direction.z) || Math.abs(direction.y) < .1) {
      throw new Error('Thin-sheet geometry does not have paired pitched roof faces');
    }
    points.push({ point: point.clone(), sign: Math.sign(direction.y) });
    keys.add(key(point) + ':' + Math.sign(direction.y));
  }
  for (const item of points) {
    point.copy(item.point); point.y -= item.sign * spec.pairedVerticalOffsetMetres;
    if (!keys.has(key(point) + ':' + -item.sign)) throw new Error('Thin-sheet faces do not preserve their 45 mm vertical pairing');
  }
  if (previous && previous !== JSON.stringify(spec)) throw new Error('Shared thin-sheet material has inconsistent parameters');
  return spec;
}

export function installThinSheetMaterials(root) {
  root.updateMatrixWorld(true);
  const diagnostics = [];
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const spec = mesh.userData.thinSheet;
    if (!spec) {
      if ([mesh.material].flat().some(material => NAMES.has(material?.name))) throw new Error('Thin-sheet roof material is missing its role metadata');
      return;
    }
    const previous = installed.get(mesh.material);
    validateSheet(mesh, previous);
    if (!previous) {
      const uniforms = { thinSheetFraction: { value: spec.diffuseTransmission },
        thinSheetColor: { value: new Color(...spec.transmissionColor) },
        thinSheetSeparation: { value: spec.pairedVerticalOffsetMetres } };
      mesh.material.onBeforeCompile = shader => compileSheet(shader, uniforms);
      mesh.material.customProgramCacheKey = () => PROGRAM_KEY;
      mesh.material.needsUpdate = true;
      installed.set(mesh.material, JSON.stringify(spec));
    }
    diagnostics.push({ mesh: mesh.name, material: mesh.material.name, sourceId: spec.sourceId, sourceIndex: spec.sourceIndex,
      role: spec.role, diffuseTransmission: spec.diffuseTransmission, transmissionColor: [...spec.transmissionColor],
      pairedVerticalOffsetMetres: spec.pairedVerticalOffsetMetres, programKey: PROGRAM_KEY,
      environmentOcclusion: 'global-environment-only', directionalOcclusion: 'paired-incident-face-shadow',
      framebufferTransmission: false });
  });
  return diagnostics;
}
