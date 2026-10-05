# SPDX-License-Identifier: GPL-3.0-or-later
"""Bounded original-art Blender proof; this licence applies to this bpy script.

Run: blender -b --python build_scene.py -- --output-dir /workspace/scratch/blender-depth
The source content.js is the necessary, canonical geometry dependency. Optional
--world-json accepts a deliberately exported snapshot, whose hash is recorded.
No geometry is read from a derived HTML bundle. Heights, depths, materials, roof
forms, facade modules, door treatments, props and light are AUTHORED, not surveys.
Meshes use core metallic/roughness PBR. Opaque coloured glazing avoids pretending
Cycles transmission/reflections survive export. Beauty lighting is not baked;
the browser must provide its own lighting, shadows and colour management.
"""
import argparse
import hashlib
import json
import math
import random
import struct
import subprocess
import sys
import time
from pathlib import Path

import bpy
from mathutils import Vector

START = time.perf_counter()
parser = argparse.ArgumentParser()
parser.add_argument('--output-dir', default='/workspace/scratch/blender-depth')
parser.add_argument('--world-json')
parser.add_argument('--samples', type=int, default=32)
parser.add_argument('--skip-render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
out = Path(args.output_dir).resolve()
out.mkdir(parents=True, exist_ok=True)
repo = Path(__file__).resolve().parents[3]
source = repo / 'iteration/game/src/content.js'

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def stage(message):
    print('[blender-depth] ' + message, flush=True)

if args.world_json:
    dependency = Path(args.world_json).resolve()
    data = json.loads(dependency.read_text())
else:
    dependency = source
    export = "import{pathToFileURL}from'node:url';const m=await import(pathToFileURL(process.argv[1]));console.log(JSON.stringify({WORLD:m.WORLD,DOORS:m.DOORS,TARGETS:m.TARGETS.map(({id,x,y,modelled,originalJapaneseName})=>({id,x,y,modelled,originalJapaneseName}))}));"
    data = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', export, str(source)], text=True))
W, doors = data['WORLD'], data['DOORS']
(out / 'world.json').write_text(json.dumps(data, ensure_ascii=False, indent=2))
stage('Read canonical world; wrote world.json')
random.seed(19)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1

materials = {}
def material(name, colour, roughness=.7, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*colour, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    mat.diffuse_color = (*colour, 1)
    materials[name] = mat
    return mat

palette = {
    'cut_stone': ((.56,.58,.48),.85,0), 'limestone': ((.68,.66,.53),.73,0),
    'light_stone': ((.81,.78,.64),.7,0), 'warm_concrete': ((.57,.56,.47),.85,0),
    'paver_a': ((.63,.64,.56),.9,0), 'paver_b': ((.69,.69,.59),.9,0),
    'paver_c': ((.58,.60,.54),.9,0), 'asphalt': ((.19,.24,.23),.96,0),
    'paint': ((.84,.82,.67),.84,0), 'tactile': ((.78,.60,.24),.8,0),
    'glass_teal': ((.11,.25,.27),.24,.22), 'glass_light': ((.20,.37,.37),.29,.16),
    'glass_dark': ((.075,.16,.18),.32,.18), 'mullion': ((.27,.32,.30),.34,.62),
    'bronze': ((.34,.25,.14),.4,.5), 'wood': ((.35,.23,.12),.8,0),
    'leaf_dark': ((.15,.29,.14),.9,0), 'leaf_mid': ((.26,.40,.18),.92,0),
    'leaf_light': ((.39,.50,.24),.92,0), 'soil': ((.19,.17,.12),1,0),
    'terracotta': ((.49,.28,.17),.8,0), 'ochre': ((.92,.51,.10),.68,0),
    'coat_shadow': ((.54,.29,.07),.75,0), 'trousers': ((.065,.14,.16),.85,0),
    'skin': ((.72,.46,.30),.78,0), 'hat': ((.74,.62,.39),.92,0),
    'shoes': ((.18,.13,.095),.72,0), 'red_bank': ((.48,.065,.045),.65,0),
}
for name, values in palette.items():
    material(name, *values)

meshes = {}
static = []
traveller_parts = []
def remember(obj, parent=None):
    if parent:
        obj.parent = parent
        traveller_parts.append(obj)
    else:
        static.append(obj)
    return obj

def box(name, loc, size, mat, bevel=.035, parent=None):
    # Linked data is retained in the .blend source; export is batched by material.
    key = (tuple(round(v,5) for v in size), mat, bevel)
    if key in meshes:
        obj = bpy.data.objects.new(name, meshes[key])
        bpy.context.collection.objects.link(obj)
        obj.location = loc
    else:
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.data.materials.append(materials[mat])
        if bevel:
            mod = obj.modifiers.new('Authored softened edges', 'BEVEL')
            mod.width = min(bevel, min(size)/3)
            mod.segments = 2
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_apply(modifier=mod.name)
        meshes[key] = obj.data
    return remember(obj, parent)

def cylinder(name, loc, radius, depth, mat, vertices=10, parent=None, radius_top=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius if radius_top is None else radius_top, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(materials[mat])
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return remember(obj, parent)

def ellipsoid(name, loc, scale, mat, parent=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(materials[mat])
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return remember(obj, parent)

font_path = Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
font = bpy.data.fonts.load(str(font_path))
def lettering(name, text, loc, size, facing='south', mat='light_stone'):
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = text
    curve.font = font
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.size = size
    curve.extrude = .008
    curve.bevel_depth = .001
    curve.resolution_u = 2
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (math.pi/2, 0, 0) if facing == 'south' else (math.pi/2, 0, math.pi)
    obj.data.materials.append(materials[mat])
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    static.append(obj)
    obj['source_text'] = text
    obj['placement'] = 'authored signage placement; factual name only'
    return obj

B = W['bounds']
xmid = (B['minX'] + B['maxX'])/2
ymid = (B['minY'] + B['maxY'])/2
span = B['maxX'] - B['minX']
box('Diorama cutaway base', (xmid,ymid,-.48), (span,B['maxY']-B['minY'],.96), 'cut_stone', .35)
road = W['roadSurface']
road_width = road['northY']-road['southY']
box('Authored simplified road surface', (xmid,(road['northY']+road['southY'])/2,.035), (span,road_width,.07), 'asphalt', .02)
for side in ('north','south'):
    front = W[side+'FacadeY']
    edge = road[side+'Y']
    a,b = sorted((front,edge))
    box(side+' footway substrate', (xmid,(a+b)/2,.1), (span,b-a,.2), 'warm_concrete', .03)
    # Authored paving units, offset joints and restrained colour variation.
    rows = max(1,round((b-a)/.72))
    tile_y = (b-a)/rows
    for row in range(rows):
        for i in range(math.ceil(span/1.28)):
            left = B['minX']+i*1.28
            width = min(1.25,B['maxX']-left-.01)
            if width > .1:
                box(side+' paving', (left+width/2,a+(row+.5)*tile_y,.205), (width,tile_y-.027,.018), random.choice(['paver_a','paver_a','paver_b','paver_c']), .006)
    box(side+' curb', (xmid,edge,.17), (span,.20,.25), 'light_stone', .025)
    # Simplified tactile strip is authored treatment of a source-supported feature.
    for i in range(math.ceil(span/1.2)):
        x = B['minX']+(i+.5)*1.2
        if x < B['maxX']:
            box(side+' tactile', (x,edge+(.52 if side=='north' else -.52),.23), (1.14,.27,.025), 'tactile', .005)

cross = W['crossing']
y = road['southY']+.45
while y < road['northY']-.25:
    box('Authored zebra stripe', (cross['x'],y,.09), (cross['width'],.68,.025), 'paint', .008)
    y += 1.32
for i in range(12):
    x = B['minX'] + 3 + i*5.4
    if x < B['maxX']-1 and abs(x-cross['x'])>cross['width']+1:
        box('Authored road dash', (x,W['roadCenterY'],.084), (2.8,.12,.019), 'paint', .002)

# Buildings preserve the sourced full front spans. All vertical/depth geometry is authored.
for side in ('north','south'):
    building = W['buildings'][side]
    x0,x1 = building['minX'],building['maxX']
    front = W[side+'FacadeY']
    sign = 1 if side=='north' else -1
    depth = (B['maxY']-front-.35) if side=='north' else (front-B['minY']-.35)
    height = 11.6 if side=='north' else 3.25 # Deliberate foreground cutaway, not actual height.
    body = box(side+' authored building volume', ((x0+x1)/2,front+sign*(depth/2+.35),height/2), (x1-x0,depth-.35,height), 'limestone' if side=='north' else 'warm_concrete', .09)
    body['osm_id'] = building['osmId']
    body['height_value_kind'] = 'authored cutaway'
    box(side+' plinth', ((x0+x1)/2,front,height*.015+.21), (x1-x0+.08,.45,.35), 'bronze', .02)
    count = max(1,round((x1-x0)/3.0))
    bay = (x1-x0)/count
    floors = 3 if side=='north' else 1
    for index in range(count):
        center = x0+(index+.5)*bay
        for floor in range(floors):
            z = 1.7+floor*3.35
            box(side+' recessed glass module', (center,front+sign*.14,z), (bay-.28,.09,2.72), ['glass_teal','glass_light','glass_dark'][(index+floor)%3], .025)
            for offset in (-bay*.24,bay*.24):
                box(side+' slender glazing mullion', (center+offset,front-sign*.005,z), (.045,.14,2.75), 'mullion', .01)
            box(side+' glazing crossrail', (center,front-sign*.025,z-.55), (bay-.28,.16,.045), 'mullion', .007)
        box(side+' facade pier', (x0+index*bay,front-sign*.03,height/2), (.23,.38,height), 'light_stone', .026)
    box(side+' last facade pier', (x1,front-sign*.03,height/2), (.23,.38,height), 'light_stone', .026)
    for floor in range(floors+1):
        z = .30+floor*3.35
        if z<height:
            box(side+' horizontal spandrel', ((x0+x1)/2,front-sign*.04,z), (x1-x0+.1,.38,.30), 'light_stone', .025)
    roof_z = height+.12
    box(side+' roof cornice', ((x0+x1)/2,front+sign*depth/2,roof_z), (x1-x0+.5,depth+.65,.28), 'light_stone', .08)
    box(side+' inset flat roof', ((x0+x1)/2,front+sign*depth/2,roof_z+.16), (x1-x0-.5,depth-.5,.09), 'warm_concrete', .02)
    for end in (x0+.25,x1-.25):
        box(side+' parapet end', (end,front+sign*depth/2,roof_z+.37), (.18,depth,.48), 'limestone', .025)
    box(side+' parapet rear', ((x0+x1)/2,front+sign*depth,roof_z+.37), (x1-x0,.18,.48), 'limestone', .025)
    box(side+' shallow canopy', ((x0+x1)/2,front-sign*.48,3.0), (x1-x0+.25,1.25,.16), 'bronze', .045)
    if side=='north':
        box('Mitsui name plaque', ((x0+x1)/2,front-.27,10.84), (13.1,.13,.88), 'bronze', .035)
        lettering('Mitsui sourced name',building['nameJa'],((x0+x1)/2,front-.355,10.84),.57)
        # Mechanical roof detail is decorative, not factual reconstruction.
        for dx in (.22,.67):
            box('Authored rooftop enclosure', (x0+(x1-x0)*dx,front+depth*.66,roof_z+.62), (3.1,1.8,.9), 'mullion', .08)
    else:
        box('Daiya street-facing fascia', ((x0+x1)/2,front+.3,2.6), (x1-x0-.5,.13,.61), 'red_bank', .025)
        lettering('Daiya sourced name',building['nameJa'],((x0+x1)/2,front+.385,2.6),.39,'north')

for door in doors:
    sign = 1 if door['side']=='north' else -1
    y = W[door['side']+'FacadeY']-sign*.15
    d = box('Door '+door['id']+' authored', (door['x'],y,1.36), (.91,.11,2.2), 'glass_dark', .028)
    d['value_kind']='authored'; d['tenant']='unassigned'
    for delta in (-.47,.47):
        box('Door jamb', (door['x']+delta,y-sign*.07,1.36), (.045,.17,2.26), 'bronze', .007)
    box('Door transom',(door['x'],y-sign*.07,2.49),(1.0,.17,.07),'bronze',.008)
    box('Door handle',(door['x']+.27,y-sign*.17,1.37),(.035,.05,.4),'light_stone',.008)

# Reusable original street assets. Their location, appearance and quantities are authored.
def tree(x,y,scale=1):
    cylinder('Tree planter', (x,y,.49),.59,.56,'terracotta',12,radius_top=.68)
    cylinder('Planter soil',(x,y,.785),.61,.045,'soil',12)
    cylinder('Tree tapered trunk',(x,y,2.2*scale),.12*scale,3.0*scale,'wood',9,radius_top=.065)
    for index,(dx,dy,dz) in enumerate(((-.62,0,3.6),(.6,.2,3.85),(0,-.42,4.2),(.1,.45,4.5),(-.2,0,4.9))):
        ellipsoid('Volumetric foliage cluster',(x+dx*scale,y+dy*scale,dz*scale),(1.05*scale,.86*scale,.95*scale),['leaf_dark','leaf_mid','leaf_light'][index%3])

north = W['northFacadeY']
south = W['southFacadeY']
for x in (W['buildings']['north']['minX']-4, W['buildings']['north']['maxX']+2.0):
    tree(x, north-1.25, 1)
tree(W['buildings']['south']['maxX']+5, south+1.1,.91)
for x in (W['buildings']['north']['minX']+1,W['buildings']['north']['maxX']-1):
    y=north-.58
    box('Long planter',(x,y,.47),(1.5,.64,.52),'terracotta',.07)
    for dx in (-.45,0,.45):
        ellipsoid('Shrub',(x+dx,y,.98),(.37,.32,.42),'leaf_mid')
for x,y in ((cross['x']-2,road['northY']+.75),(cross['x']+2,road['southY']-.75)):
    cylinder('Slim street lamp',(x,y,2.7),.058,5.1,'mullion',10)
    box('Lamp cap',(x,y,5.26),(.58,.42,.12),'bronze',.025)
    box('Lamp lens',(x,y,5.185),(.45,.32,.06),'light_stone',.014)
for x in (cross['x']-4,cross['x']+5):
    for y in (road['northY']+.3,road['southY']-.3):
        cylinder('Pavement bollard',(x,y,.69),.075,.96,'bronze',10)
        cylinder('Bollard collar',(x,y,.97),.082,.065,'light_stone',10)

# Static traveller scale anchor; animation belongs to a later gameplay integration.
traveller = bpy.data.objects.new('Traveller_Authored',None)
bpy.context.collection.objects.link(traveller)
traveller.location=(W['spawn']['x'],W['spawn']['y'],.23)
traveller['role']='authored 1.82m scale silhouette; static proof, not an animation rig'
for side in (-1,1):
    box('Traveller boot',(.11*side,-.065,.095),(.18,.32,.17),'shoes',.04,traveller)
    cylinder('Traveller trouser',(.11*side,0,.42),.09,.58,'trousers',10,traveller)
ellipsoid('Traveller ochre jacket',(0,0,.96),(.32,.22,.42),'ochre',traveller)
for side in (-1,1):
    arm=ellipsoid('Traveller sleeve',(.33*side,0,.94),(.095,.105,.32),'ochre',traveller)
    arm.rotation_euler.y=side*.15
    ellipsoid('Traveller hand',(.36*side,-.015,.65),(.073,.068,.095),'skin',traveller)
ellipsoid('Traveller head',(0,-.015,1.48),(.16,.145,.20),'skin',traveller)
cylinder('Traveller hat brim',(0,-.015,1.65),.26,.055,'hat',18,traveller)
cylinder('Traveller hat crown',(0,-.015,1.73),.18,.15,'hat',16,traveller,radius_top=.16)
box('Traveller backpack',(0,.22,1.03),(.40,.21,.48),'trousers',.08,traveller)
box('Traveller backpack flap',(0,.345,1.15),(.36,.05,.18),'coat_shadow',.025,traveller)

anchors=[]
for target in data['TARGETS']:
    obj=bpy.data.objects.new('ReadingPoint_'+target['id'],None)
    bpy.context.collection.objects.link(obj)
    obj.location=(target['x'],target['y'],.25)
    obj['id']=target['id']; obj['modelled']=target['modelled']
    obj['position_kind']='authored interaction; not a surveyed doorway'
    anchors.append(obj)

# Real geometry shadows in both paths; no AO/light baked into diffuse colours.
world=bpy.data.worlds.new('Soft warm studio sky')
scene.world=world
world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.68,.75,.68,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='AREA',location=(xmid-20,-34,52))
key=bpy.context.object; key.name='Beauty soft afternoon key'; key.data.energy=21000; key.data.shape='DISK'; key.data.size=18
key.rotation_euler=(Vector((xmid,-5,0))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(75,-88,69))
camera=bpy.context.object; camera.name='Beauty authored perspective camera'
camera_target=Vector((xmid,-4,2.3))
camera.rotation_euler=(camera_target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.lens=49
camera.data.clip_end=300
scene.camera=camera
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=args.samples
# The installed 4.3.2 package has no OpenImageDenoise; keep the proof portable.
scene.cycles.use_denoising=False
scene.render.threads_mode='FIXED'
scene.render.threads=12
scene.render.resolution_x=960; scene.render.resolution_y=640; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(out/'render.png')
try:
    scene.view_settings.view_transform='Khronos PBR Neutral'
except TypeError:
    scene.view_settings.view_transform='AgX'
scene.view_settings.look='None'
scene.view_settings.exposure=0
scene.render.film_transparent=False
bpy.context.view_layer.update()

metrics={
    'status':'source-saved', 'blenderVersion':bpy.app.version_string,
    'scriptSHA256':sha(__file__), 'worldDependency':str(dependency.relative_to(repo)) if dependency.is_relative_to(repo) else str(dependency),
    'worldDependencySHA256':sha(dependency), 'units':'metres',
    'axes':{'blender':['source east X','source north Y','height Z'],'gltf':['source east X','height Y','negative source north Z']},
    'source':{'buildingSpans':W['buildings'],'crossing':cross,'roadSurface':road,'attribution':'© OpenStreetMap contributors · ODbL 1.0'},
    'authored':['flat WORLD facadeY approximation of the slightly sloped sourced frontage','all heights and depths','south building cutaway height','materials and facade modules','roof and back faces','door appearance and tenant-free placements','planting/street furniture','traveller scale silhouette','lighting and camera'],
    'materialPolicy':'Core opaque Principled base color, metallic and roughness only; stylized opaque glass. No image textures, external model/texture URLs, transmission extensions, baked lighting, or proprietary assets.',
    'font':{'source':str(font_path),'usage':'Noto CJK Japanese factual names converted to mesh; no runtime font dependency'},
    'render':{'width':960,'height':640,'samples':args.samples,'engine':'Cycles CPU','denoising':False,'viewTransform':scene.view_settings.view_transform,'lightingBaked':False,'status':'pending'},
    'camera':{'positionBlender':list(camera.location),'targetBlender':list(camera_target),'focalLengthMM':camera.data.lens},
    'sourceObjects':len(static)+len(traveller_parts),'sourceMeshDatablocks':len({o.data.name for o in static+traveller_parts}),
    'limitations':['Research proof, not final art or game integration.','Foreground south volume is an authored low cutaway for visibility, not actual building height.','Static traveller has no animation or gameplay controls.','Cycles area light/environment and browser directional/hemisphere lighting differ; compare materials and shadows in actual browser.','No source photograph or actual elevation has been used; detail expresses modern architecture, not an observed facade reconstruction.'],
}

def write_metrics():
    (out/'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2))

# The saved source keeps modular objects; temporary runtime batches reduce draw calls.
bpy.ops.wm.save_as_mainfile(filepath=str(out/'block.blend'))
write_metrics()
stage('Saved reusable modular block.blend')

# Batch immutable street meshes by PBR material, while keeping traveller separately movable.
export_collection=bpy.data.collections.new('Runtime batches')
scene.collection.children.link(export_collection)
bpy.context.view_layer.update()
def batch(objects,prefix,parent=None):
    groups={}
    for obj in objects:
        mesh=obj.data
        mat=mesh.materials[0]
        verts,faces,smooth=groups.setdefault(mat.name,([],[],[]))
        offset=len(verts)
        matrix=obj.matrix_world
        if parent:
            matrix=parent.matrix_world.inverted() @ matrix
        verts.extend(tuple(matrix @ vertex.co) for vertex in mesh.vertices)
        faces.extend(tuple(offset+i for i in poly.vertices) for poly in mesh.polygons)
        smooth.extend(poly.use_smooth for poly in mesh.polygons)
    result=[]
    for mat_name,(verts,faces,smooth) in groups.items():
        mesh=bpy.data.meshes.new(prefix+' '+mat_name)
        mesh.from_pydata(verts,[],faces); mesh.update()
        for polygon, use_smooth in zip(mesh.polygons, smooth):
            polygon.use_smooth=use_smooth
        mesh.materials.append(materials[mat_name])
        obj=bpy.data.objects.new(prefix+' '+mat_name,mesh)
        export_collection.objects.link(obj)
        if parent: obj.parent=parent
        result.append(obj)
    return result

export_objects=batch(static,'Street')+batch(traveller_parts,'Traveller',traveller)
bpy.ops.object.select_all(action='DESELECT')
for obj in export_objects+[traveller]+anchors: obj.select_set(True)
bpy.context.view_layer.objects.active=export_objects[0]
bpy.ops.export_scene.gltf(filepath=str(out/'block.glb'),export_format='GLB',use_selection=True,export_yup=True,export_cameras=False,export_lights=False,export_extras=True)
# Temporary batch copies must not double-render source art.
for obj in export_objects: bpy.data.objects.remove(obj,do_unlink=True)
bpy.data.collections.remove(export_collection)
raw=(out/'block.glb').read_bytes()
chunk_length,chunk_type=struct.unpack_from('<II',raw,12)
gltf=json.loads(raw[20:20+chunk_length])
metrics['glb']={'bytes':len(raw),'sha256':sha(out/'block.glb'),'nodes':len(gltf.get('nodes',[])),'meshes':len(gltf.get('meshes',[])),'materials':len(gltf.get('materials',[])),'primitives':sum(len(m['primitives']) for m in gltf.get('meshes',[])),'triangles':sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf.get('meshes',[]) for p in m['primitives']),'extensionsUsed':gltf.get('extensionsUsed',[])}
metrics['status']='exported'; write_metrics()
stage('Exported block.glb: '+json.dumps(metrics['glb']))
if not args.skip_render:
    render_started=time.perf_counter()
    bpy.ops.render.render(write_still=True)
    metrics['render'].update({'status':'rendered','seconds':round(time.perf_counter()-render_started,2),'bytes':(out/'render.png').stat().st_size,'sha256':sha(out/'render.png')})
    stage('Rendered render.png')
else:
    metrics['render']['status']='skipped by request'
metrics['status']='complete'
metrics['totalSeconds']=round(time.perf_counter()-START,2)
metrics['blendBytes']=(out/'block.blend').stat().st_size
write_metrics()
stage('Wrote final metrics.json; proof is ready for browser comparison')
