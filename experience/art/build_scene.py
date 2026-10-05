# SPDX-License-Identifier: GPL-3.0-or-later
"""Original editable Shijo scene and independently animated traveller.

Blender4.3.2: blender -b --python experience/art/build_scene.py --
Canonical inputs are experience/src/content/kyoto.js; no legacy runtime dependency.
Mapped spans and OSM floor counts are retained. Storey heights, facade treatment,
roof/depth, materials, threshold detail, planting and light remain AUTHORED.
Generated PBR textures contain original procedural surface/reflection cues, not
photographs or surveyed facades. Runtime lighting must be evaluated independently.
"""
import argparse, hashlib, json, math, random, struct, subprocess, sys, tempfile, time
from pathlib import Path
import bpy
from mathutils import Vector

START=time.perf_counter()
parser=argparse.ArgumentParser()
parser.add_argument('--output-dir',default=str(Path(tempfile.gettempdir())/'tourguideai-experience-art'))
parser.add_argument('--asset-dir')
parser.add_argument('--samples',type=int,default=48)
parser.add_argument('--skip-render',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
repo=Path(__file__).resolve().parents[2]
out=Path(args.output_dir).resolve(); out.mkdir(parents=True,exist_ok=True)
assets=Path(args.asset_dir).resolve() if args.asset_dir else repo/'experience/public/models'
assets.mkdir(parents=True,exist_ok=True)
source=repo/'experience/src/content/kyoto.js'
node="import{pathToFileURL}from'node:url';const m=await import(pathToFileURL(process.argv[1]));console.log(JSON.stringify({WORLD:m.WORLD,DOORS:m.DOORS,TARGETS:m.TARGETS.map(({id,x,y,modelled})=>({id,x,y,modelled}))}));"
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',node,str(source)],text=True))
W=data['WORLD']; B=W['bounds']; road=W['roadSurface']; cross=W['crossing']
(out/'world.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
def stage(message): print('[experience-art] '+message,flush=True)
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
stage('Read new canonical content')
random.seed(271)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene; scene.unit_settings.system='METRIC'
materials={}; material_repeat={}; texture_images=[]

def texture(name,kind,size=256):
    """Small seamless original colour textures; no outside imagery or runtime nodes."""
    image=bpy.data.images.new(name,width=size,height=size,alpha=False)
    rng=random.Random(81+len(texture_images)); pixels=[]
    for iy in range(size):
        for ix in range(size):
            n=rng.uniform(-1,1)
            if kind=='paving':
                tilex=(ix//64); tiley=iy//64
                tone=[.0,.017,-.01,.025][(tilex+3*tiley)%4]
                edge=ix%64<1 or iy%64<1
                v=.55+tone+n*.018-(.12 if edge else 0)
                rgb=(v,v*.997,v*.975)
            elif kind=='asphalt':
                v=.26+n*.029
                rgb=(v*.95,v,v*1.03)
            elif kind=='stone':
                v=.72+n*.016
                rgb=(v,v*.995,v*.981)
            else:
                # Authored soft sky/building reflection cues, not an observed reflection.
                top=iy/(size-1)
                band=.026*math.sin(ix/size*math.pi*8)+.014*math.sin(ix/size*math.pi*18)
                v=.25+.17*top+band+n*.004
                if kind=='glass_blind' and iy%18<2: v+=.08
                rgb=(v*.84,v*.94,v)
            pixels.extend((*rgb,1))
    image.pixels=pixels
    image.filepath_raw=str(out/(name+'.png')); image.file_format='PNG'; image.save(); image.pack()
    texture_images.append(image)
    return image

tex_paving=texture('paving-colour','paving')
tex_asphalt=texture('asphalt-colour','asphalt')
tex_stone=texture('stone-colour','stone')
tex_glass=texture('glazing-reflection-cue','glass')
tex_blind=texture('glazing-blind-cue','glass_blind')

def material(name,color,rough=.6,metal=0,image=None,repeat=1):
    mat=bpy.data.materials.new(name); mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Roughness'].default_value=rough; bsdf.inputs['Metallic'].default_value=metal
    if image:
        node=mat.node_tree.nodes.new('ShaderNodeTexImage'); node.image=image
        mat.node_tree.links.new(node.outputs['Color'],bsdf.inputs['Base Color'])
    mat.diffuse_color=(*color,1); materials[name]=mat; material_repeat[name]=repeat
    return mat

material('pavement',(.55,.55,.54),.87,0,tex_paving,2.4)
material('asphalt',(.24,.26,.27),.93,0,tex_asphalt,3.0)
material('pale-stone',(.72,.715,.704),.64,0,tex_stone,1.6)
for name,col,rough,metal in [
 ('concrete',(.39,.40,.40),.88,0),('curb',(.60,.61,.60),.82,0),
 ('granite',(.29,.31,.32),.55,0),('mortar',(.25,.27,.28),.93,0),
 ('metal',(.41,.43,.45),.3,.75),('dark-metal',(.12,.14,.16),.38,.65),
 ('spandrel',(.40,.43,.46),.55,.2),('glass-dark',(.105,.14,.17),.17,.22),
 ('paint',(.82,.83,.80),.78,0),('tactile',(.77,.57,.13),.8,0),
 ('leaf-dark',(.055,.14,.055),.88,0),('leaf-mid',(.09,.22,.085),.85,0),
 ('leaf-light',(.14,.29,.10),.83,0),('bark',(.19,.14,.09),.92,0),
 ('soil',(.07,.055,.035),.98,0),('planter',(.26,.28,.27),.8,0),
 ('jacket',(.58,.25,.055),.8,0),('jacket-dark',(.30,.12,.035),.82,0),
 ('trousers',(.055,.08,.105),.88,0),('skin',(.58,.35,.22),.82,0),
 ('hat',(.51,.42,.29),.86,0),('shoe',(.085,.065,.048),.9,0),
 ('mufg-red',(.37,.025,.035),.6,0),('off-white',(.83,.84,.82),.58,0),
]: material(name,col,rough,metal)
material('glazing',(.27,.31,.35),.18,.32,tex_glass,3)
material('glazing-blinds',(.27,.31,.35),.25,.2,tex_blind,3)

roots={}; static=[]; actor_parts=[]; meshes={}; active_group='Street'
def empty(name,parent=None,loc=(0,0,0)):
    obj=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(obj); obj.location=loc
    if parent: obj.parent=parent
    return obj
for name in ('Street','NorthBuilding','SouthBuilding'):
    roots[name]=empty(name)
for side in ('North','South'):
    for part in ('Shell','Ground','Upper','Roof'):
        name=side+part; roots[name]=empty(name,roots[side+'Building'])

def remember(obj,parent=None):
    if parent:
        obj.parent=parent; actor_parts.append(obj)
    else:
        obj['semantic_group']=active_group; static.append(obj)
    return obj

def add_uv(mesh,mat):
    uv=mesh.uv_layers.new(name='UVMap') if not mesh.uv_layers else mesh.uv_layers[0]
    repeat=material_repeat[mat]
    for poly in mesh.polygons:
        axis=max(range(3),key=lambda a:abs(poly.normal[a]))
        for li in poly.loop_indices:
            v=mesh.vertices[mesh.loops[li].vertex_index].co
            a,b=(v.x,v.y) if axis==2 else ((v.x,v.z) if axis==1 else (v.y,v.z))
            uv.data[li].uv=(a/repeat,b/repeat)

def box(name,loc,size,mat,bevel=.015,parent=None):
    key=(tuple(round(v,5) for v in size),mat,bevel)
    if key in meshes:
        obj=bpy.data.objects.new(name,meshes[key]); bpy.context.collection.objects.link(obj); obj.location=loc
    else:
        bpy.ops.mesh.primitive_cube_add(size=1,location=loc); obj=bpy.context.object; obj.name=name; obj.dimensions=size
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        obj.data.materials.append(materials[mat])
        if bevel:
            mod=obj.modifiers.new('Small real edge radius','BEVEL'); mod.width=min(bevel,min(size)/3); mod.segments=1
            bpy.ops.object.modifier_apply(modifier=mod.name)
        add_uv(obj.data,mat); meshes[key]=obj.data
    return remember(obj,parent)

def cylinder(name,loc,radius,depth,mat,parent=None,top=None,vertices=10):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=radius,radius2=radius if top is None else top,depth=depth,location=loc)
    obj=bpy.context.object; obj.name=name; obj.data.materials.append(materials[mat])
    for p in obj.data.polygons: p.use_smooth=True
    return remember(obj,parent)

def oval(name,loc,scale,mat,parent=None,subdivision=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivision,radius=1,location=loc)
    obj=bpy.context.object; obj.name=name; obj.scale=scale; obj.data.materials.append(materials[mat])
    for p in obj.data.polygons: p.use_smooth=True
    return remember(obj,parent)

font_path=Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
font=bpy.data.fonts.load(str(font_path))
def text(name,label,loc,size,facing='south'):
    curve=bpy.data.curves.new(name,'FONT'); curve.body=label; curve.font=font; curve.size=size
    curve.align_x='CENTER'; curve.align_y='CENTER'; curve.extrude=.003; curve.resolution_u=2
    obj=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(obj); obj.location=loc
    obj.rotation_euler=(math.pi/2,0,0) if facing=='south' else (math.pi/2,0,math.pi)
    obj.data.materials.append(materials['off-white'])
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH'); obj['factual_name']=label
    return remember(obj)

xmid=(B['minX']+B['maxX'])/2; span=B['maxX']-B['minX']
# No raised presentation plinth: world extends as pavement/road at human scale.
box('Street substrate',(xmid,(B['minY']+B['maxY'])/2,-.14),(span,B['maxY']-B['minY'],.28),'concrete',0)
walkables=[]
obj=box('WalkableRoad',(xmid,(road['northY']+road['southY'])/2,.025),(span,road['northY']-road['southY'],.05),'asphalt',0)
obj['walkable']=True; walkables.append(obj)
for side in ('north','south'):
    a,b=sorted((W[side+'FacadeY'],road[side+'Y']))
    obj=box('Walkable'+side.title()+'Sidewalk',(xmid,(a+b)/2,.085),(span,b-a,.17),'pavement',.012)
    obj['walkable']=True; walkables.append(obj)
    box(side+' curb',(xmid,road[side+'Y'],.12),(span,.16,.2),'curb',.01)
    box(side+' tactile strip',(xmid,road[side+'Y']+(.50 if side=='north' else -.50),.181),(span,.28,.015),'tactile',0)
    for i in range(20):
        x=B['minX']+i*3.2+1.6
        box('Curb expansion joint',(x,road[side+'Y']-.085 if side=='north' else road[side+'Y']+.085,.12),(.012,.012,.15),'mortar',0)
y=road['southY']+.45
while y<road['northY']-.25:
    box('Zebra stripe',(cross['x'],y,.057),(cross['width'],.68,.012),'paint',0); y+=1.32
for x in range(3,int(B['maxX'])-1,6):
    if abs(x-cross['x'])>cross['width']+1:
        box('Authored lane marking',(x,W['roadCenterY'],.057),(2.6,.11,.01),'paint',0)

# Faithful floor count, explicitly authored metres and facade modules.
heights={}
for side in ('north','south'):
    title=side.title(); building=W['buildings'][side]; x0=building['minX']; x1=building['maxX']; front=W[side+'FacadeY']
    direction=1 if side=='north' else -1
    levels=building['levels']; ground_height=3.9; storey=3.05; height=ground_height+(levels-1)*storey; heights[side]=height
    depth=min(8.7,B['maxY']-front-.15) if side=='north' else max(3.3,front-B['minY']-.15)
    active_group=title+'Shell'
    # Shell is independently hideable; full street-facing ground level remains separate.
    obj=box(title+' back wall',((x0+x1)/2,front+direction*depth,height/2),(x1-x0,.22,height),'pale-stone',.025)
    obj['osmId']=building['osmId']; obj['heightValueKind']='authored'
    for x in (x0,x1):
        box(title+' return wall',(x,front+direction*depth/2,height/2),(.20,depth,height),'pale-stone',.025)
    bays=max(1,round((x1-x0)/(2.95 if side=='north' else 2.6))); bay=(x1-x0)/bays
    for floor in range(levels):
        active_group=title+('Ground' if floor==0 else 'Upper')
        base=0 if floor==0 else ground_height+(floor-1)*storey
        floorheight=ground_height if floor==0 else storey
        glassheight=floorheight-(.50 if floor==0 else .80)
        glass_z=base+.25+glassheight/2
        for i in range(bays):
            center=x0+(i+.5)*bay
            mat='glass-dark' if floor==0 else ('glazing-blinds' if (i+floor*3)%5==0 else 'glazing')
            box(title+' window recess',(center,front+direction*.23,glass_z),(bay-.22,.075,glassheight),mat,.008)
            # Glass cue UV spans each real window; differences are subtle, not random candy colours.
            for offset in (-bay*.24,bay*.24):
                box('Slender aluminum mullion',(center+offset,front+direction*.09,glass_z),(.038,.15,glassheight),'metal',.005)
            box('Glazing transom',(center,front+direction*.075,glass_z-.45),(bay-.2,.14,.035),'metal',.004)
            box('Recess jamb',(x0+i*bay,front,base+floorheight/2),(.18,.38,floorheight),'pale-stone' if side=='north' else 'granite',.012)
        box('Last recess jamb',(x1,front,base+floorheight/2),(.18,.38,floorheight),'pale-stone' if side=='north' else 'granite',.012)
        box('Horizontal floor band',((x0+x1)/2,front+.04*direction,base+floorheight-.33),(x1-x0,.32,.66),'pale-stone' if side=='north' else 'granite',.016)
        box('Fine sill shadow edge',((x0+x1)/2,front-.10*direction,base+.19),(x1-x0,.25,.065),'metal',.006)
        box('Interior dark floor',((x0+x1)/2,front+direction*depth/2,base+.03),(x1-x0,depth,.06),'mortar',0)
    active_group=title+'Ground'
    box('Ground granite plinth',((x0+x1)/2,front-.025*direction,.23),(x1-x0,.42,.32),'granite',.018)
    box('Slim entry canopy',((x0+x1)/2,front-.37*direction,3.22),(x1-x0+.08,.9,.105),'dark-metal',.018)
    plaque_width=min(x1-x0-1,10.6)
    box('Building name fascia',((x0+x1)/2,front-.15*direction,3.52),(plaque_width,.10,.46),'dark-metal',.009)
    text(title+' sourced building name',building['nameJa'],((x0+x1)/2,front-.215*direction,3.52),.31,'south' if side=='north' else 'north')
    active_group=title+'Roof'
    box(title+' flat roof',((x0+x1)/2,front+direction*depth/2,height+.045),(x1-x0+.2,depth+.22,.17),'concrete',.025)
    for x in (x0,x1): box('Roof parapet',(x,front+direction*depth/2,height+.34),(.15,depth,.50),'pale-stone',.012)
    box('Rear parapet',((x0+x1)/2,front+direction*depth,height+.34),(x1-x0,.15,.50),'pale-stone',.012)

for door in data['DOORS']:
    side=door['side']; direction=1 if side=='north' else -1; active_group=side.title()+'Ground'
    y=W[side+'FacadeY']-.03*direction
    obj=box('Authored threshold '+door['id'],(door['x'],y,.20),(1.17,.52,.07),'granite',.008)
    obj['doorId']=door['id']; obj['valueKind']='authored'; obj['tenant']='unassigned'
    box('Door leaf',(door['x'],y+direction*.09,1.47),(.96,.065,2.50),'glass-dark',.009)
    for dx in (-.51,.51): box('Door jamb',(door['x']+dx,y,1.47),(.045,.18,2.56),'metal',.005)
    box('Door handle',(door['x']+.30,y-direction*.08,1.30),(.025,.05,.46),'metal',.006)

active_group='Street'
def tree(x,y):
    cylinder('Street tree planter',(x,y,.40),.47,.45,'planter',top=.53,vertices=12)
    cylinder('Soil',(x,y,.64),.48,.035,'soil',vertices=12)
    cylinder('Tapered trunk',(x,y,2.16),.09,3.05,'bark',top=.045,vertices=9)
    # Irregular lobed crown: fewer meshes/polygons than the old spherical clumps.
    for i in range(6):
        angle=i*2.4; radius=.38 if i<5 else .20
        oval('Foliage crown',(x+math.sin(angle)*radius,y+math.cos(angle)*radius,3.7+(i%3)*.30),(.66,.59,.79),['leaf-dark','leaf-mid','leaf-light'][i%3],subdivision=2)
for x,y in ((W['buildings']['north']['minX']-3.1,W['northFacadeY']-1.15),(W['buildings']['north']['maxX']+1.8,W['northFacadeY']-1.15),(W['buildings']['south']['maxX']+4,W['southFacadeY']+1.15)):
    tree(x,y)
for x,y in ((cross['x']-1.9,road['northY']+.70),(cross['x']+1.9,road['southY']-.70)):
    cylinder('Street light pole',(x,y,2.56),.045,4.8,'dark-metal',vertices=10)
    box('Light head',(x,y,4.97),(.42,.28,.085),'metal',.012)
for x in (cross['x']-3.5,cross['x']+4.8):
    for y in (road['northY']+.28,road['southY']-.28):
        cylinder('Bollard',(x,y,.58),.055,.80,'dark-metal',vertices=9)
        cylinder('Bollard reflective band',(x,y,.85),.058,.035,'off-white',vertices=9)

# Actor's origin is between feet. In glTF it faces -Z, equivalent to Blender +Y.
traveller=empty('Traveller')
traveller['heightMetres']=1.72; traveller['forward']='glTF -Z'; traveller['art']='original authored traveller'
hips=.76; shoulders=1.29
for label,sign in (('Left',-1),('Right',1)):
    leg=empty(label+'Leg',traveller,(sign*.105,0,hips))
    cylinder(label+' trouser',(0,0,-.32),.078,.64,'trousers',leg,top=.085)
    box(label+' walking shoe',(0,.065,-hips+.08),(.17,.30,.15),'shoe',.035,leg)
    arm=empty(label+'Arm',traveller,(sign*.27,0,shoulders))
    cylinder(label+' sleeve',(0,0,-.19),.075,.39,'jacket',arm,top=.09)
    oval(label+' hand',(0,0,-.44),(.057,.055,.085),'skin',arm)
body=empty('Torso',traveller,(0,0,1.02))
oval('Jacket body',(0,0,0),(.27,.18,.34),'jacket',body)
box('Jacket zip',(0,.175,.045),(.012,.014,.46),'dark-metal',.002,body)
box('Travel backpack',(0,-.20,.05),(.34,.17,.41),'trousers',.055,body)
box('Backpack pocket',(0,-.303,-.025),(.26,.04,.18),'jacket-dark',.015,body)
head=empty('Head',traveller,(0,0,1.48))
oval('Face',(0,.015,0),(.135,.12,.17),'skin',head)
cylinder('Hat brim',(0,.01,.145),.215,.035,'hat',head,vertices=16)
cylinder('Hat crown',(0,.01,.205),.145,.115,'hat',head,top=.13,vertices=14)

# Beauty is closer to playable framing: no plinth, neutral light, south occlusion.
world=bpy.data.worlds.new('Neutral daylight'); world.use_nodes=True; scene.world=world
world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.77,.84,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.52
bpy.ops.object.light_add(type='AREA',location=(xmid-10,-25,47)); key=bpy.context.object; key.name='Neutral sun reference'; key.data.energy=15000; key.data.size=9
key.data.color=(1,.97,.93); key.rotation_euler=(Vector((xmid,0,0))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(W['spawn']['x']+11,W['spawn']['y']-24,19))
camera=bpy.context.object; target=Vector((W['spawn']['x']+4,W['spawn']['y']+2,2.1))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.lens=40; scene.camera=camera
scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=args.samples; scene.cycles.use_denoising=False
scene.render.threads_mode='FIXED'; scene.render.threads=12
scene.render.resolution_x=1200; scene.render.resolution_y=800; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.filepath=str(out/'reference.png')
scene.view_settings.view_transform='Khronos PBR Neutral'; scene.view_settings.look='None'
scene.view_settings.exposure=0; scene.render.film_transparent=False
bpy.context.view_layer.update()

metrics={'status':'source','blenderVersion':bpy.app.version_string,'scriptSHA256':sha(__file__),'canonicalSource':'experience/src/content/kyoto.js','canonicalSHA256':sha(source),'source':{'buildings':W['buildings'],'crossing':cross,'roadSurface':road},'authored':['storey heights '+str(heights),'flat frontage Y approximation','building depths/backfaces/roofs','facade modules/materials/reflection cues','door treatments/thresholds without tenant bindings','furniture and planting','traveller and pose','camera and lighting'],'axes':'Blender(east,north,height) -> glTF(east,height,-north), metres','materials':'core opaque PBR; original embedded colour textures; glass reflection cues authored, runtime PMREM adds environmental reflection; no baked light or transparency','textureCount':len(texture_images),'semanticGroups':list(roots),'actorPivots':['Traveller','LeftLeg','RightLeg','LeftArm','RightArm','Torso','Head'],'sourceObjects':len(static)+len(actor_parts),'font':str(font_path),'limitations':['Facade appearance is authored, not a photographic reconstruction.','Eight levels are OSM metadata; metres per storey are authored.','Full south volume requires runtime occlusion; beauty selectively hides south upper/shell/roof.','No rigged fingers, interiors, observed entry claims or facial animation.','Cycles area lighting is a reference; runtime materials and lighting require browser review.']}
def write_metrics():
    (out/'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2))
write_metrics()
# .blend retains full editable geometry with all semantic tags and original textures.
bpy.ops.wm.save_as_mainfile(filepath=str(out/'shijo-block.blend'))
stage('Saved editable full-height source')

# UVs, normal smoothing, material and semantic identity survive export batching.
export_collection=bpy.data.collections.new('Runtime batches'); scene.collection.children.link(export_collection)
groups={}
for obj in static:
    special=obj.name if obj.get('walkable') else obj['semantic_group']
    mat=obj.data.materials[0]; key=(special,mat.name)
    verts,faces,smooth,uvs=groups.setdefault(key,([],[],[],[])); offset=len(verts); mesh=obj.data
    verts.extend(tuple(obj.matrix_world @ v.co) for v in mesh.vertices)
    faces.extend(tuple(offset+i for i in p.vertices) for p in mesh.polygons)
    smooth.extend(p.use_smooth for p in mesh.polygons)
    uv_layer=mesh.uv_layers.active
    uvs.extend(tuple(uv_layer.data[l.index].uv) if uv_layer else (0,0) for l in mesh.loops)
export_objects=[]
for (semantic,mat),(verts,faces,smooth,uvs) in groups.items():
    mesh=bpy.data.meshes.new(semantic+' '+mat); mesh.from_pydata(verts,[],faces); mesh.update()
    mesh.materials.append(materials[mat]); uv=mesh.uv_layers.new(name='UVMap')
    for p,s in zip(mesh.polygons,smooth): p.use_smooth=s
    for i,coord in enumerate(uvs): uv.data[i].uv=coord
    obj=bpy.data.objects.new(semantic+'_'+mat,mesh); export_collection.objects.link(obj)
    obj['semanticGroup']=semantic
    if semantic.startswith('Walkable'):
        obj.name=semantic; obj['walkable']=True; obj.parent=roots['Street']
    else: obj.parent=roots[semantic]
    export_objects.append(obj)
anchors=[]
for t in data['TARGETS']:
    a=empty('ReadingPoint_'+t['id'],loc=(t['x'],t['y'],.18)); a['id']=t['id']; a['modelled']=t['modelled']; anchors.append(a)

def export_glb(path,objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_cameras=False,export_lights=False,export_extras=True)
    raw=path.read_bytes(); n,_=struct.unpack_from('<II',raw,12); gltf=json.loads(raw[20:20+n])
    return {'bytes':len(raw),'sha256':sha(path),'nodes':len(gltf.get('nodes',[])),'primitives':sum(len(m['primitives']) for m in gltf.get('meshes',[])),'triangles':sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf.get('meshes',[]) for p in m['primitives']),'textures':len(gltf.get('textures',[])),'extensionsUsed':gltf.get('extensionsUsed',[])}
metrics['block']=export_glb(assets/'shijo-block.glb',export_objects+list(roots.values())+anchors)
stage('Exported street '+json.dumps(metrics['block']))
actor_nodes=[traveller]+[o for o in bpy.data.objects if o.type=='EMPTY' and o.parent and (o.parent==traveller or o.parent.parent==traveller)]
metrics['traveller']=export_glb(assets/'traveller.glb',actor_nodes+actor_parts)
stage('Exported articulated traveller '+json.dumps(metrics['traveller']))
for obj in export_objects: bpy.data.objects.remove(obj,do_unlink=True)
bpy.data.collections.remove(export_collection)
# Beauty uses the same asset materials; hide only semantically occluding south mass.
for obj in static:
    if obj['semantic_group'] in ('SouthShell','SouthUpper','SouthRoof'): obj.hide_render=True
traveller.location=(W['spawn']['x'],W['spawn']['y'],.17)
if not args.skip_render:
    t=time.perf_counter(); bpy.ops.render.render(write_still=True)
    metrics['reference']={'path':str(out/'reference.png'),'sha256':sha(out/'reference.png'),'seconds':round(time.perf_counter()-t,2),'samples':args.samples,'size':[1200,800],'denoising':False}
metrics['status']='complete'; metrics['seconds']=round(time.perf_counter()-START,2); write_metrics()
(assets/'provenance.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2))
stage('Complete; compare actual browser before visual acceptance')
