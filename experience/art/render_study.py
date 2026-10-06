# SPDX-License-Identifier: GPL-3.0-or-later
"""Matched Cycles day/night study from the unchanged editable street source.

The rig is authoritative for positions, colour, fixture intent and material rules.
Cycles powers and environment strength are explicitly calibrated separately from
Three's candela/PMREM/shadow-map approximation. No HDR city panorama is displayed.
"""
import argparse, hashlib, json, math, subprocess, sys, time
from pathlib import Path
from datetime import datetime, timezone
import bpy
import numpy as np
from mathutils import Vector

parser=argparse.ArgumentParser()
parser.add_argument('--blend',required=True)
parser.add_argument('--rig')
parser.add_argument('--output-dir')
parser.add_argument('--samples',type=int,default=64)
parser.add_argument('--width',type=int,default=1200)
parser.add_argument('--height',type=int,default=750)
parser.add_argument('--views',default='intersection,mitsui-frontage,daiya-frontage')
parser.add_argument('--modes',default='day,night')
parser.add_argument('--denoiser',help='Optional official oidnDenoise executable; HDR linear data, before view transform')
parser.add_argument('--denoiser-version',default='2.5.1',help='Version of the explicitly verified CLI supplied with --denoiser')
parser.add_argument('--work-dir',help='Scratch directory for raw linear EXR/PFM and filtered PFM files')
parser.add_argument('--preserve-renders',action='store_true',help='Retain verified existing render records for unchanged modes/views and source/rig bindings')
parser.add_argument('--draft',action='store_true',help='Write scratch previews and their draft manifest, never the public study directory')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
repo=Path(__file__).resolve().parents[2]
output=Path(args.output_dir).resolve() if args.output_dir else repo/'experience/public/render-study'
if args.draft and output==(repo/'experience/public/render-study').resolve():
    parser.error('--draft requires a separate --output-dir')
output.mkdir(parents=True,exist_ok=True)
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
rig_path=Path(args.rig).resolve() if args.rig else repo/'experience/public/lighting/rig.json'
rig=json.loads(rig_path.read_text())
source=Path(args.blend); bpy.ops.wm.open_mainfile(filepath=str(source)); scene=bpy.context.scene
work=Path(args.work_dir).resolve() if args.work_dir else source.parent/'render-intermediates'
if args.denoiser: work.mkdir(parents=True,exist_ok=True)
for obj in bpy.data.objects: obj.hide_render=False
for obj in list(bpy.data.objects):
    if obj.type in ('LIGHT','CAMERA'): bpy.data.objects.remove(obj,do_unlink=True)
actor=bpy.data.objects.get('Traveller'); actor.location=(23.8,2.1,.17)
def blender_pos(p): return Vector((p[0],-p[2],p[1]))
def linear_color(color):
    rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb)

def denoise_linear(raw_exr, final_png, stem):
    """OIDN receives scene-linear RGB, never a tone-mapped screenshot.

    Blender and PFM both use bottom-to-top pixel rows. Beauty-only RT filtering is
    deliberate: no clean-guide claim, no unavailable built-in Blender denoiser.
    """
    raw=bpy.data.images.load(str(raw_exr),check_existing=False)
    width,height=raw.size
    pixels=np.empty(width*height*4,dtype=np.float32); raw.pixels.foreach_get(pixels)
    color=np.ascontiguousarray(pixels.reshape(height,width,4)[:,:,:3],dtype='<f4')
    input_path=work/(stem+'-linear.pfm'); output_path=work/(stem+'-filtered.pfm')
    with input_path.open('wb') as handle:
        handle.write(f'PF\n{width} {height}\n-1.0\n'.encode()); handle.write(color.tobytes())
    start=time.perf_counter()
    subprocess.run([str(Path(args.denoiser).resolve()),'--device','cpu','--hdr',str(input_path),'--output',str(output_path),'--quality','high','--threads','4'],check=True)
    elapsed=time.perf_counter()-start
    with output_path.open('rb') as handle:
        if handle.readline().strip()!=b'PF': raise ValueError('Expected RGB PFM output')
        size=tuple(map(int,handle.readline().split())); scale=float(handle.readline())
        if size!=(width,height): raise ValueError('Denoiser changed image dimensions')
        filtered=np.frombuffer(handle.read(),dtype='<f4' if scale<0 else '>f4').reshape(height,width,3)
    if not np.isfinite(filtered).all(): raise ValueError('Non-finite denoised pixels')
    rgba=np.ones((height,width,4),dtype=np.float32); rgba[:,:,:3]=filtered
    result=bpy.data.images.new(stem+' linear filtered',width=width,height=height,alpha=False,float_buffer=True)
    result.pixels.foreach_set(rgba.ravel())
    scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'; scene.render.image_settings.color_depth='8'
    result.save_render(str(final_png),scene=scene)
    bpy.data.images.remove(raw); bpy.data.images.remove(result)
    return {'denoiseSeconds':round(elapsed,2),'rawExrSha256':sha(raw_exr),'rawLinearSha256':sha(input_path),'denoisedLinearSha256':sha(output_path)}
views=[
 {'id':'intersection','label':{'en':'01 · Shijō–Karasuma intersection','zh':'01 · 四条乌丸路口'},'camera':{'position':[-22,18,9],'target':[20,10,9],'fov':55,'aspect':1.6,'near':.15,'far':260,'up':[0,1,0]},'hiddenGroups':[]},
 {'id':'mitsui-frontage','label':{'en':'02 · Kyoto Mitsui frontage','zh':'02 · 京都三井大厦沿街'},'camera':{'position':[38,3.2,8],'target':[31,3,-4.7],'fov':50,'aspect':1.6,'near':.15,'far':260,'up':[0,1,0]},'hiddenGroups':[]},
 {'id':'daiya-frontage','label':{'en':'03 · Kyoto Daiya frontage','zh':'03 · 京都钻石大厦沿街'},'camera':{'position':[29,3.2,7],'target':[24,3,20],'fov':50,'aspect':1.6,'near':.15,'far':260,'up':[0,1,0]},'hiddenGroups':[]},
]
for view in views: view['renders']={mode:{'file':view['id']+'-'+mode+'.png'} for mode in ('day','night')}
bpy.ops.object.camera_add(); camera=bpy.context.object; scene.camera=camera
scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=args.samples
scene.cycles.use_denoising=False; scene.cycles.use_adaptive_sampling=True; scene.cycles.adaptive_threshold=.018
scene.cycles.max_bounces=7; scene.cycles.diffuse_bounces=4; scene.cycles.glossy_bounces=4
scene.render.threads_mode='FIXED'; scene.render.threads=12
scene.render.resolution_x=args.width; scene.render.resolution_y=args.height; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'
scene.view_settings.view_transform='Khronos PBR Neutral'; scene.view_settings.look='None'
scene.render.film_transparent=False
context_path=repo/'experience/public/content-evidence/street-context.json'; context=json.loads(context_path.read_text())
material_cache={}
# Object material overrides preserve shared source meshes while allowing semantic
# groups to receive distinct emission without changing/exporting the GLB.
def apply_materials(config):
    for obj in bpy.data.objects:
        if obj.type!='MESH': continue
        group=obj.get('semantic_group','')
        for slot in obj.material_slots:
            original=slot.material
            if not original: continue
            name=original.get('lightingOriginalName',original.name)
            rule=next((r for r in config['materials'] if name in r['match'] and ('semanticGroups' not in r or group in r['semanticGroups'])),None)
            if not rule: continue
            key=(name,group)
            if key not in material_cache:
                material_cache[key]=original.copy(); material_cache[key]['lightingOriginalName']=name
            mat=material_cache[key]; slot.link='OBJECT'; slot.material=mat
            bsdf=mat.node_tree.nodes.get('Principled BSDF')
            for link in list(bsdf.inputs['Emission Color'].links): mat.node_tree.links.remove(link)
            color=(*linear_color(rule['emissiveColor']),1)
            bsdf.inputs['Emission Color'].default_value=color
            bsdf.inputs['Emission Strength'].default_value=rule['emissiveIntensity']
            if rule.get('emissiveFromBaseColor') and bsdf.inputs['Base Color'].is_linked:
                mix=mat.node_tree.nodes.get('Study emission modulation') or mat.node_tree.nodes.new('ShaderNodeMixRGB')
                mix.name='Study emission modulation'; mix.blend_type='MULTIPLY'; mix.inputs[0].default_value=1; mix.inputs[2].default_value=color
                mat.node_tree.links.new(bsdf.inputs['Base Color'].links[0].from_socket,mix.inputs[1])
                mat.node_tree.links.new(mix.outputs[0],bsdf.inputs['Emission Color'])

def apply_rig(mode):
    config=rig['modes'][mode]; offline=config['offline']
    scene.cycles.sample_clamp_direct=offline['sampleClampDirect']; scene.cycles.sample_clamp_indirect=offline['sampleClampIndirect']
    scene.cycles.blur_glossy=offline['filterGlossy']; scene.cycles.adaptive_threshold=offline['adaptiveThreshold']
    for obj in list(bpy.data.objects):
        if obj.type=='LIGHT': bpy.data.objects.remove(obj,do_unlink=True)
    world=bpy.data.worlds.new('Study '+mode+' environment'); world.use_nodes=True; scene.world=world
    nodes=world.node_tree.nodes; nodes.clear(); links=world.node_tree.links
    environment=nodes.new('ShaderNodeTexEnvironment')
    env_path=(rig_path.parent/config['environment']['file']).resolve()
    if sha(env_path)!=config['environment']['sha256']: raise ValueError('Environment hash mismatch: '+str(env_path))
    environment.image=bpy.data.images.load(str(env_path),check_existing=True)
    environment.texture_mapping.rotation[2]=config['environment']['rotationY']
    hdr=nodes.new('ShaderNodeBackground'); hdr.inputs['Strength'].default_value=offline['environmentStrength']; links.new(environment.outputs['Color'],hdr.inputs['Color'])
    illumination=hdr.outputs[0]
    if mode=='day':
        # The full-resolution HDR contains a second solar disc. Three's PMREM
        # cannot cast that disc's geometric shadow; leave the shared directional
        # key authoritative for diffuse shadows. Keep the original HDR energy
        # for glossy reflections. This is an explicit offline approximation,
        # not a modified source HDR or physically identical transport.
        bounded=nodes.new('ShaderNodeVectorMath'); bounded.operation='MINIMUM'; bounded.inputs[1].default_value=(1,1,1)
        links.new(environment.outputs['Color'],bounded.inputs[0])
        diffuse=nodes.new('ShaderNodeBackground'); diffuse.inputs['Strength'].default_value=offline['environmentStrength']; links.new(bounded.outputs[0],diffuse.inputs['Color'])
        kind=nodes.new('ShaderNodeLightPath'); separate=nodes.new('ShaderNodeMixShader')
        links.new(kind.outputs['Is Glossy Ray'],separate.inputs[0]); links.new(diffuse.outputs[0],separate.inputs[1]); links.new(hdr.outputs[0],separate.inputs[2])
        illumination=separate.outputs[0]
    background=nodes.new('ShaderNodeBackground'); background.inputs['Color'].default_value=(*linear_color(config['backgroundColor']),1); background.inputs['Strength'].default_value=1
    ray=nodes.new('ShaderNodeLightPath'); mix=nodes.new('ShaderNodeMixShader'); out=nodes.new('ShaderNodeOutputWorld')
    links.new(ray.outputs['Is Camera Ray'],mix.inputs[0]); links.new(illumination,mix.inputs[1]); links.new(background.outputs[0],mix.inputs[2]); links.new(mix.outputs[0],out.inputs['Surface'])
    sun=config['sun']
    if sun['enabled']:
        bpy.ops.object.light_add(type='SUN',location=blender_pos(sun['position'])); light=bpy.context.object; light.name='Study '+mode+' sky key'
        light.rotation_euler=(blender_pos(sun['target'])-light.location).to_track_quat('-Z','Y').to_euler()
        light.data.color=linear_color(sun['color']); light.data.energy=offline['sunEnergy']; light.data.angle=math.radians(offline['sunAngularDiameterDegrees'])
    for fixture in config['fixtures']:
        if not fixture['enabled']: continue
        bpy.ops.object.light_add(type=fixture['type'].upper(),location=blender_pos(fixture['position'])); light=bpy.context.object; light.name='Study fixture '+fixture['id']
        light.data.color=linear_color(fixture['color']); light.data.energy=fixture['offlinePowerWatts']; light.data.shadow_soft_size=fixture['offlineRadiusMetres']
        if fixture['type']=='spot':
            light.rotation_euler=(blender_pos(fixture['target'])-light.location).to_track_quat('-Z','Y').to_euler()
            light.data.spot_size=fixture['angle']*2; light.data.spot_blend=fixture['penumbra']
    apply_materials(config)
    scene.view_settings.exposure=offline['exposureStops']
    fog=config['fog']; world.mist_settings.start=fog['near']; world.mist_settings.depth=fog['far']-fog['near']; world.mist_settings.falloff='LINEAR'
    scene.view_layers[0].use_pass_mist=True; scene.use_nodes=True; scene.node_tree.nodes.clear()
    layers=scene.node_tree.nodes.new('CompositorNodeRLayers'); fog_mix=scene.node_tree.nodes.new('CompositorNodeMixRGB'); output_node=scene.node_tree.nodes.new('CompositorNodeComposite')
    fog_mix.inputs[2].default_value=(*linear_color(fog['color']),1)
    scene.node_tree.links.new(layers.outputs['Mist'],fog_mix.inputs[0]); scene.node_tree.links.new(layers.outputs['Image'],fog_mix.inputs[1]); scene.node_tree.links.new(fog_mix.outputs[0],output_node.inputs['Image'])

manifest={'version':2,'generatedAt':datetime.now(timezone.utc).isoformat(),'status':'draft' if args.draft else 'rendering','model':'../models/shijo-block.glb','modelSha256':sha(repo/'experience/public/models/shijo-block.glb'),'axes':'Three(east,height,-north), metres','imageSize':[args.width,args.height],
 'actor':{'model':'../models/traveller.glb','modelSha256':sha(repo/'experience/public/models/traveller.glb'),'position':[23.8,.17,-2.1],'rotationY':0},
 'lightingRig':'../lighting/rig.json','lightingRigSha256':sha(rig_path),'defaultMode':rig['defaultMode'],'modes':{k:{'label':v['label'],'environmentSha256':v['environment']['sha256'],'offline':v['offline']} for k,v in rig['modes'].items()},
 'renderEngine':'Blender Cycles CPU','rendererVersion':bpy.app.version_string,'samples':args.samples,
 'denoising':{'enabled':True,'tool':'Intel Open Image Denoise','version':args.denoiser_version,'binarySha256':sha(args.denoiser),'filter':'RT','quality':'high','device':'CPU','input':'scene-linear HDR RGB PFM, beauty only; no guide passes','outputTransform':'Khronos PBR Neutral with mode exposureStops','releaseUrl':'https://github.com/RenderKit/oidn/releases/tag/v'+args.denoiser_version,'license':'Apache-2.0'} if args.denoiser else {'enabled':False},
 'sourceSceneSha256':sha(source),'renderScriptSha256':sha(__file__),'contextSha256':sha(context_path),'renderBounds':context['renderBounds'],
 'sourceScope':{'en':'Mapped footprints and existing geometry are unchanged. Day/night fixture placement, colours and intensity are authored; no actual opening, occupancy or interior claim. Licensed external HDRIs illuminate and reflect only.','zh':'地图建筑轮廓及现有几何保持不变。日夜灯具位置、颜色与强度为设计表达，不代表真实营业、房间使用或室内状态。获许可外部 HDRI 仅用于照明与反射。'},
 'renderDifference':{'en':'Shared geometry, cameras and authored lighting rig. A uses PMREM and cached shadow maps; B uses calibrated Cycles power, indirect light and emissive bounce. B limits daylight HDR diffuse radiance to avoid a second solar shadow, while retaining full HDR for glossy reflections. Powers, falloff and haze are not physically identical. B is a fixed image, not path-traced play.','zh':'共用几何、相机及设计灯光配置。A 使用 PMREM 和缓存阴影；B 使用校准后的 Cycles 功率、间接光和发光反弹。B 限制日间 HDR 漫反射辐亮度以避免第二道太阳阴影，镜面反射保留完整 HDR。光功率、衰减与雾效并非物理一致；B 是固定图片，并非路径追踪游玩。'},
 'offlineShaderProcessing':{'day':{'diffuseHDRChannelMaximumLinear':1.0,'fullHDRForGlossyRays':True,'basis':'Suppress the HDR solar disc as a competing diffuse key; source HDR bytes unchanged.'},'night':{'diffuseHDRChannelMaximumLinear':None,'fullHDRForGlossyRays':True}},
 'producerPolicy':'Per-render renderScriptSha256 records the producer when unchanged images are preserved; top-level hash is the current manifest writer.','views':views}
manifest_path=output/'manifest.json'
if args.preserve_renders and manifest_path.exists():
    previous=json.loads(manifest_path.read_text())
    for key in ('modelSha256','lightingRigSha256','sourceSceneSha256','contextSha256','imageSize','samples','denoising','rendererVersion'):
        if previous.get(key)!=manifest.get(key): raise ValueError('Cannot preserve renders with changed '+key)
    if previous.get('actor')!=manifest['actor']: raise ValueError('Cannot preserve changed actor')
    for view in views:
        old=next((v for v in previous['views'] if v['id']==view['id']),None)
        if not old or old['camera']!=view['camera'] or old['hiddenGroups']!=view['hiddenGroups']: raise ValueError('Cannot preserve changed camera/visibility')
        for mode,record in old['renders'].items():
            if record.get('renderSha256') and sha(output/record['file'])==record['renderSha256']:
                record.setdefault('renderScriptSha256',previous['renderScriptSha256'])
                record.setdefault('samples',previous['samples'])
                view['renders'][mode]=record
            else: raise ValueError('Cannot preserve missing or modified still')
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for mode in args.modes.split(','):
    if mode not in rig['modes']: parser.error('Unknown mode '+mode)
    apply_rig(mode)
    for view in views:
        if view['id'] not in args.views.split(','): continue
        cfg=view['camera']; camera.location=blender_pos(cfg['position']); camera.rotation_euler=(blender_pos(cfg['target'])-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.type='PERSP'; camera.data.sensor_fit='VERTICAL'; camera.data.sensor_height=32; camera.data.lens=16/math.tan(math.radians(cfg['fov']/2)); camera.data.clip_start=cfg['near']; camera.data.clip_end=cfg['far']
        record=view['renders'][mode]; final_png=output/record['file']; stem=view['id']+'-'+mode
        if args.denoiser:
            raw_exr=work/(stem+'-linear.exr'); scene.render.filepath=str(raw_exr)
            scene.render.image_settings.file_format='OPEN_EXR'; scene.render.image_settings.color_mode='RGB'; scene.render.image_settings.color_depth='32'; scene.render.image_settings.exr_codec='ZIP'
        else:
            scene.render.filepath=str(final_png); scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'; scene.render.image_settings.color_depth='8'
        bpy.context.view_layer.update()
        start=time.perf_counter(); print('[render-study] Starting '+view['id']+' '+mode,flush=True); bpy.ops.render.render(write_still=True)
        record['traceSeconds']=round(time.perf_counter()-start,2); record['renderScriptSha256']=sha(__file__); record['samples']=args.samples
        if args.denoiser: record.update(denoise_linear(raw_exr,final_png,stem))
        record.update(renderSha256=sha(output/record['file']),renderSeconds=round(time.perf_counter()-start,2))
        print('[render-study] Finished '+view['id']+' '+mode+' '+str(record['renderSeconds'])+'s',flush=True)
        manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
manifest['status']='draft' if args.draft else ('complete' if all('renderSha256' in record for view in views for record in view['renders'].values()) else 'partial')
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('[render-study] '+manifest['status'],flush=True)
