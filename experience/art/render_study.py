# SPDX-License-Identifier: GPL-3.0-or-later
"""Render matched, original Cycles views of the exact exported street scene.

blender -b --python experience/art/render_study.py -- --blend /path/shijo-block.blend
Source .blend is intentionally an editable generator output: it contains the same
original geometry/materials exported to GLB plus camera/light authoring objects.
Its use is necessary for path tracing; loading the GLB back would lose those
editable source objects. Runtime geometry identity is bound by the manifest hash.
"""
import argparse, hashlib, json, math, sys, time
from pathlib import Path
from datetime import datetime, timezone
import bpy
from mathutils import Vector

parser=argparse.ArgumentParser()
parser.add_argument('--blend',required=True)
parser.add_argument('--output-dir')
parser.add_argument('--samples',type=int,default=32)
parser.add_argument('--width',type=int,default=1200)
parser.add_argument('--height',type=int,default=750)
parser.add_argument('--views',default='intersection,mitsui-frontage,daiya-frontage')
parser.add_argument('--draft',action='store_true',help='Write composition previews only; do not change tracked final manifest')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
repo=Path(__file__).resolve().parents[2]
output=Path(args.output_dir) if args.output_dir else repo/'experience/public/render-study'
output.mkdir(parents=True,exist_ok=True)
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
source=Path(args.blend); bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.context.scene
for obj in bpy.data.objects: obj.hide_render=False
for obj in list(bpy.data.objects):
    if obj.type in ('LIGHT','CAMERA'): bpy.data.objects.remove(obj,do_unlink=True)
actor=bpy.data.objects.get('Traveller'); actor.location=(23.8,2.1,.17)
# Three source axes (east,height,-north) are transformed into Blender (east,north,height).
def blender_pos(p): return Vector((p[0],-p[2],p[1]))
views=[
 {'id':'intersection','label':{'en':'01 · Shijō–Karasuma intersection','zh':'01 · 四条乌丸路口'},'file':'intersection.png','camera':{'position':[-22,18,9],'target':[20,10,9],'fov':55,'aspect':1.6,'near':.15,'far':260,'up':[0,1,0]},'hiddenGroups':[]},
 {'id':'mitsui-frontage','label':{'en':'02 · Kyoto Mitsui frontage','zh':'02 · 京都三井大厦沿街'},'file':'mitsui-frontage.png','camera':{'position':[38,3.2,8],'target':[31,3,-4.7],'fov':50,'aspect':1.6,'near':.15,'far':260,'up':[0,1,0]},'hiddenGroups':[]},
 {'id':'daiya-frontage','label':{'en':'03 · Kyoto Daiya frontage','zh':'03 · 京都钻石大厦沿街'},'file':'daiya-frontage.png','camera':{'position':[29,3.2,7],'target':[24,3,20],'fov':50,'aspect':1.6,'near':.15,'far':260,'up':[0,1,0]},'hiddenGroups':[]},
]
lighting={'sunPosition':[4,105,36],'sunTarget':[32,0,7],'sunColor':'#fff5e8','sunIntensity':2.25,'environmentIntensity':.52,'hemisphereIntensity':1.35,'exposure':1.189207115}
# Direction and daylight intent agree with A. Cycles integrates indirect bounces;
# Three uses the documented environment/hemisphere approximation, not identical GI.
world=bpy.data.worlds.new('Study neutral daylight'); world.use_nodes=True; scene.world=world
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.67,.75,.86,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.90
bpy.ops.object.light_add(type='SUN',location=blender_pos(lighting['sunPosition'])); sun=bpy.context.object
sun.name='Matched directional daylight'; sun.rotation_euler=(blender_pos(lighting['sunTarget'])-sun.location).to_track_quat('-Z','Y').to_euler()
sun.data.energy=2.25; sun.data.angle=math.radians(2.0); sun.data.color=(1,.956,.89)
bpy.ops.object.camera_add(); camera=bpy.context.object; scene.camera=camera
scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=args.samples
scene.cycles.use_denoising=False; scene.cycles.use_adaptive_sampling=True; scene.cycles.adaptive_threshold=.018
scene.cycles.max_bounces=6; scene.cycles.diffuse_bounces=3; scene.cycles.glossy_bounces=3
scene.render.threads_mode='FIXED'; scene.render.threads=12
scene.render.resolution_x=args.width; scene.render.resolution_y=args.height; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'
scene.view_settings.view_transform='Khronos PBR Neutral'; scene.view_settings.look='None'; scene.view_settings.exposure=.25
scene.render.film_transparent=False
# A linear distance mist corresponds to the study viewer's documented atmospheric fog.
world.mist_settings.start=85; world.mist_settings.depth=105; world.mist_settings.falloff='LINEAR'
scene.view_layers[0].use_pass_mist=True; scene.use_nodes=True
scene.node_tree.nodes.clear()
layers=scene.node_tree.nodes.new('CompositorNodeRLayers'); mix=scene.node_tree.nodes.new('CompositorNodeMixRGB'); output_node=scene.node_tree.nodes.new('CompositorNodeComposite')
fog_srgb=(219/255,227/255,233/255); mix.inputs[2].default_value=tuple(((c+.055)/1.055)**2.4 for c in fog_srgb)+(1,)
scene.node_tree.links.new(layers.outputs['Mist'],mix.inputs[0]); scene.node_tree.links.new(layers.outputs['Image'],mix.inputs[1]); scene.node_tree.links.new(mix.outputs[0],output_node.inputs['Image'])
context_path=repo/'experience/public/content-evidence/street-context.json'
context=json.loads(context_path.read_text())
manifest={'version':1,'generatedAt':datetime.now(timezone.utc).isoformat(),'status':'rendering','model':'../models/shijo-block.glb','modelSha256':sha(repo/'experience/public/models/shijo-block.glb'),
 'axes':'Three(east,height,-north), metres','imageSize':[args.width,args.height],
 'actor':{'model':'../models/traveller.glb','modelSha256':sha(repo/'experience/public/models/traveller.glb'),'position':[23.8,.17,-2.1],'rotationY':0},'lighting':lighting,
 'fog':{'color':'#dbe3e9','near':85,'far':190},'offlineLighting':{'worldColorLinear':[.67,.75,.86],'worldStrength':.90,'sunEnergy':2.25,'sunAngularDiameterDegrees':2.0,'exposureStops':.25,'mistStart':85,'mistDepth':105,'note':'Calibrated Cycles environment fill, not numerically equivalent to realtime PMREM/hemisphere.'},'renderEngine':'Blender Cycles CPU','rendererVersion':bpy.app.version_string,'samples':args.samples,'denoising':False,
 'sourceSceneSha256':sha(source),'renderScriptSha256':sha(__file__),'contextSha256':sha(context_path),
 'renderBounds':context['renderBounds'],'sourceScope':{'en':'Mapped footprints, corner planes, road/sidewalk centrelines and planting positions. Heights, widths, construction, materials and daylight are authored. No photograph pixels or interiors.','zh':'采用地图建筑轮廓、转角平面、道路与人行道中心线及种植位置。高度、宽度、构造、材质与日光均为设计表达；未使用照片像素，也未还原室内。'},
 'renderDifference':{'en':'A uses realtime PBR with approximate environment lighting and shadow maps. B is a fixed Cycles image with traced indirect light and reflections. The geometry and camera are shared; this is not a surveyed or photorealistic replica.','zh':'A 使用实时 PBR、近似环境光与阴影贴图；B 是具有路径追踪间接光与反射的 Cycles 固定图片。两者共用几何与视角，并非测绘级或照片级复刻。'},
 'views':views}
manifest_path=output/'manifest.json'
if not args.draft: manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
selected=args.views.split(',')
for view in views:
    if view['id'] not in selected: continue
    cfg=view['camera']; camera.location=blender_pos(cfg['position'])
    camera.rotation_euler=(blender_pos(cfg['target'])-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='PERSP'; camera.data.sensor_fit='VERTICAL'; camera.data.sensor_height=32
    camera.data.lens=16/math.tan(math.radians(cfg['fov']/2)); camera.data.clip_start=cfg['near']; camera.data.clip_end=cfg['far']
    scene.render.filepath=str(output/view['file']); bpy.context.view_layer.update()
    started=time.perf_counter(); print('[render-study] Starting '+view['id'],flush=True)
    bpy.ops.render.render(write_still=True)
    view['renderSha256']=sha(output/view['file']); view['renderSeconds']=round(time.perf_counter()-started,2)
    print('[render-study] Finished '+view['id']+' '+str(view['renderSeconds'])+'s',flush=True)
    if not args.draft: manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
manifest['status']='complete' if all('renderSha256' in v for v in views) else 'partial'
if not args.draft: manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('[render-study] '+manifest['status'],flush=True)
