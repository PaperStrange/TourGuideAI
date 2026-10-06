# SPDX-License-Identifier: GPL-3.0-or-later
"""Original editable Shijo scene and independently animated traveller.

Blender4.3.2: blender -b --python experience/art/build_scene.py --
Canonical inputs are experience/src/content/kyoto.js; no legacy runtime dependency.
Mapped footprints, corner planes and OSM floor counts are retained. Storey heights,
facade/roof treatment, materials, threshold detail, planting form and light remain AUTHORED.
Generated PBR textures contain original procedural surface/reflection cues, not
photographs or surveyed facades. Runtime lighting must be evaluated independently.
"""
import argparse, hashlib, json, math, random, struct, subprocess, sys, tempfile, time
from pathlib import Path
import bpy
import numpy as np
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
# Tracked reference metadata is required to carry licensed visual-study attribution.
reference_path=repo/'experience/public/content-evidence/facade-references.json'
reference_data=json.loads(reference_path.read_text())
# Tracked OSM context supplies visual geometry; gameplay bounds remain in WORLD.
context_path=repo/'experience/public/content-evidence/street-context.json'
context=json.loads(context_path.read_text())
(out/'world.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
def stage(message): print('[experience-art] '+message,flush=True)
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
stage('Read new canonical content')
random.seed(271)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene; scene.unit_settings.system='METRIC'
materials={}; material_repeat={}; texture_images=[]

surface_maps={}
def save_texture(name, rgb, noncolor=False):
    size=rgb.shape[0]
    image=bpy.data.images.new(name,width=size,height=size,alpha=False)
    if noncolor: image.colorspace_settings.name='Non-Color'
    rgba=np.ones((size,size,4),dtype=np.float32); rgba[:,:,:3]=rgb
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw=str(out/(name+'.png')); image.file_format='PNG'; image.save(); image.pack()
    texture_images.append(image)
    return image

def texture(name,kind,size=512):
    """Original tileable material maps in metre-scaled UVs, never photo pixels."""
    rng=np.random.default_rng(81+len(texture_images)); yy,xx=np.mgrid[:size,:size]
    n=rng.normal(0,.32,(size,size)); nx=xx/size; ny=yy/size
    broad=np.sin(nx*math.tau*3)*np.sin(ny*math.tau*2)
    if kind=='paving':
        joint=((xx%128)<2)|((yy%128)<2)
        tile=((xx//128+3*(yy//128))%7)/7
        h=n*.003-joint*.06; v=.43+tile*.055+n*.015-joint*.09
        rough=.80+tile*.10+n*.045
        tint=(1,.985,.956)
    elif kind=='asphalt':
        h=n*.022; v=.16+n*.020+broad*.010
        rough=.82+n*.09+broad*.04; tint=(.97,1,1.035)
    elif kind=='stone':
        joint=((yy%128)<2)|(((xx+128*((yy//128)%2))%256)<2)
        h=n*.002-joint*.025; v=.57+n*.012-joint*.065+broad*.006
        rough=.55+n*.035; tint=(1,.982,.945)
    elif kind=='granite':
        h=n*.006; v=.32+n*.085; rough=.45+n*.10; tint=(1,1.005,1.015)
    else:
        h=n*.0001; v=.12+.085*ny+.018*np.sin(nx*math.tau*4)
        if kind=='glass_blind': v=v+((yy%36)<3)*.052
        rough=.16+n*.009; tint=(.82,.94,1)
    rgb=np.stack([v*c for c in tint],axis=-1).clip(.005,.95)
    image=save_texture(name,rgb)
    if kind in ('paving','asphalt','stone','granite'):
        dx=(np.roll(h,-1,1)-np.roll(h,1,1))*3
        dy=(np.roll(h,-1,0)-np.roll(h,1,0))*3
        normal=np.stack([-dx,-dy,np.ones_like(h)],axis=-1)
        normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
        normal=save_texture(name+'-normal',normal*.5+.5,True)
        rough=save_texture(name+'-roughness',np.repeat(rough.clip(.15,.98)[:,:,None],3,axis=2),True)
        surface_maps[image.name]=(normal,rough)
    return image

tex_paving=texture('paving-colour','paving')
tex_asphalt=texture('asphalt-colour','asphalt')
tex_stone=texture('stone-colour','stone')
tex_granite=texture('granite-fascia-colour','granite')
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
        if image.name in surface_maps:
            normal_image,rough_image=surface_maps[image.name]
            nm=mat.node_tree.nodes.new('ShaderNodeTexImage'); nm.image=normal_image
            norm=mat.node_tree.nodes.new('ShaderNodeNormalMap'); norm.inputs['Strength'].default_value=.65
            mat.node_tree.links.new(nm.outputs['Color'],norm.inputs['Color'])
            mat.node_tree.links.new(norm.outputs['Normal'],bsdf.inputs['Normal'])
            rough_node=mat.node_tree.nodes.new('ShaderNodeTexImage'); rough_node.image=rough_image
            mat.node_tree.links.new(rough_node.outputs['Color'],bsdf.inputs['Roughness'])
    mat.diffuse_color=(*color,1); materials[name]=mat; material_repeat[name]=repeat
    return mat

material('pavement',(.55,.55,.54),.87,0,tex_paving,2.4)
material('asphalt',(.24,.26,.27),.93,0,tex_asphalt,3.0)
material('pale-stone',(.72,.715,.704),.64,0,tex_stone,1.6)
material('granite-fascia',(.46,.46,.45),.59,0,tex_granite,1.0)
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
 ('bronze-frame',(.085,.073,.061),.33,.55),('canopy',(.53,.525,.50),.60,.02),
 ('lime-accent',(.48,.60,.06),.65,0),
]: material(name,col,rough,metal)
material('glazing',(.12,.15,.18),.17,.12,tex_glass,4)
material('glazing-blinds',(.12,.15,.18),.22,.10,tex_blind,4)

roots={}; static=[]; actor_parts=[]; meshes={}; active_group='Street'
def empty(name,parent=None,loc=(0,0,0)):
    obj=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(obj); obj.location=loc
    if parent: obj.parent=parent
    return obj
for name in ('Street','Context','NorthBuilding','SouthBuilding'):
    roots[name]=empty(name)
for side in ('North','South'):
    for part in ('Shell','Ground','Upper','Roof','Canopy','CanopyPosts'):
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

primitive_meshes={}
def cylinder(name,loc,radius,depth,mat,parent=None,top=None,vertices=10):
    ratio=1 if top is None else top/radius
    key=('cone',vertices,round(ratio,7),mat)
    if key not in primitive_meshes:
        bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=1,radius2=ratio,depth=1)
        template=bpy.context.object; mesh=template.data; mesh.materials.append(materials[mat])
        for p in mesh.polygons: p.use_smooth=True
        primitive_meshes[key]=mesh; bpy.data.objects.remove(template,do_unlink=True)
    obj=bpy.data.objects.new(name,primitive_meshes[key]); bpy.context.collection.objects.link(obj)
    obj.location=loc; obj.scale=(radius,radius,depth)
    return remember(obj,parent)

def oval(name,loc,scale,mat,parent=None,subdivision=2):
    key=('ico',subdivision,mat)
    if key not in primitive_meshes:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivision,radius=1)
        template=bpy.context.object; mesh=template.data; mesh.materials.append(materials[mat])
        for p in mesh.polygons: p.use_smooth=True
        primitive_meshes[key]=mesh; bpy.data.objects.remove(template,do_unlink=True)
    obj=bpy.data.objects.new(name,primitive_meshes[key]); bpy.context.collection.objects.link(obj)
    obj.location=loc; obj.scale=scale
    return remember(obj,parent)

font_path=Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
font=bpy.data.fonts.load(str(font_path))
def text(name,label,loc,size,facing='south',mat='off-white'):
    curve=bpy.data.curves.new(name,'FONT'); curve.body=label; curve.font=font; curve.size=size
    curve.align_x='CENTER'; curve.align_y='CENTER'; curve.extrude=.003; curve.resolution_u=2
    obj=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(obj); obj.location=loc
    obj.rotation_euler=(math.pi/2,0,0) if facing=='south' else (math.pi/2,0,math.pi)
    obj.data.materials.append(materials[mat])
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH'); obj['factual_name']=label
    return remember(obj)

# Ground/context geometry is source-positioned; all display widths are authored.
from mathutils.geometry import tessellate_polygon

def slab(name,points,z,depth,mat):
    pts=[Vector((p['x'],p['y'],z)) if isinstance(p,dict) else Vector((p[0],p[1],z)) for p in points]
    if (pts[0]-pts[-1]).length<.001: pts=pts[:-1]
    n=len(pts); verts=[tuple(p) for p in pts]+[(p.x,p.y,z-depth) for p in pts]
    triangles=tessellate_polygon([pts]); faces=[]
    for tri in triangles:
        ids=[v if isinstance(v,int) else min(range(n),key=lambda i:(pts[i]-v).length) for v in tri]
        faces.append(tuple(ids)); faces.append(tuple(i+n for i in reversed(ids)))
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update(); mesh.materials.append(materials[mat]); add_uv(mesh,mat)
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj); return remember(obj)

def segment(name,a,b,width,z,depth,mat,bevel=0):
    a=Vector((a['x'],a['y'])) if isinstance(a,dict) else Vector(a)
    b=Vector((b['x'],b['y'])) if isinstance(b,dict) else Vector(b)
    d=b-a; mid=(a+b)/2
    obj=box(name,(mid.x,mid.y,z-depth/2),(d.length,width,depth),mat,bevel)
    obj.rotation_euler.z=math.atan2(d.y,d.x); return obj

def ribbon(name,path,width,z,depth,mat):
    for a,b in zip(path,path[1:]): segment(name,a,b,width,z,depth,mat)

R=context['renderBounds']; rx0=R['minX']; rx1=R['maxX']; ry0=R['minY']; ry1=R['maxY']
xmid=(B['minX']+B['maxX'])/2; span=B['maxX']-B['minX']
active_group='Context'
box('Expanded source context ground',((rx0+rx1)/2,(ry0+ry1)/2,-.13),(rx1-rx0,ry1-ry0,.18),'pavement',0)
# Explicitly authored horizon continuation avoids a hard stage edge; no new building claims.
box('Authored distant neutral ground',(15,-5,-.25),(560,420,.18),'concrete',0)
last=next(r for r in context['roads'] if r['osmId']==465069436)['path'][0]
segment('Authored distant Shijo continuation',(last['x'],last['y']),(260,last['y']),18.3,.038,.08,'asphalt')
# Road centreline buffers are expressly authored display surfaces, not surveyed kerbs.
for feature in context['roads']:
    width=9.7 if feature.get('oneway') else 18.3
    ribbon('Context road '+str(feature['osmId']),feature['path'],width,.04,.08,'asphalt')
for feature in context['sidewalks']:
    ribbon('Mapped sidewalk '+str(feature['osmId']),feature['path'],3.3,.165,.16,'pavement')
# The accepted playable surface remains the same, over the display-only context.
active_group='Street'; walkables=[]
east_start=cross['x']
obj=box('WalkableRoad',((east_start+B['maxX'])/2,(road['northY']+road['southY'])/2,.025),(B['maxX']-east_start,road['northY']-road['southY'],.05),'asphalt',0)
obj['walkable']=True; walkables.append(obj)
obj=box('WalkableWesternIntersection',(cross['x']/2,(W['northFacadeY']+W['southFacadeY'])/2,.025),(cross['x'],W['northFacadeY']-W['southFacadeY'],.05),'asphalt',0)
obj['walkable']=True; walkables.append(obj)
for side in ('north','south'):
    a,b=sorted((W[side+'FacadeY'],road[side+'Y']))
    start=cross['x']
    obj=box('Walkable'+side.title()+'Sidewalk',((start+B['maxX'])/2,(a+b)/2,.085),(B['maxX']-start,b-a,.17),'pavement',.012)
    obj['walkable']=True; walkables.append(obj)
    # Stop visual curb at the crossing-corner transition rather than bridging Karasuma.
    start=cross['x']-1.2
    box(side+' curb',((start+B['maxX'])/2,road[side+'Y'],.12),(B['maxX']-start,.16,.2),'curb',.01)
    # Surface relief distinguishes tactile paving from a solid yellow painted strip.
    ty=road[side+'Y']+(.50 if side=='north' else -.50)
    box(side+' tactile approach',((cross['x']+B['maxX'])/2,ty,.178),(B['maxX']-cross['x'],.28,.014),'tactile',0)
    for k in range(4):
        box('Tactile directional rib',((cross['x']+B['maxX'])/2,ty-.105+k*.07,.188),(B['maxX']-cross['x'],.024,.012),'tactile',.004)
    for x in (cross['x']-1,cross['x']+1):
        box('Crossing warning pad',(x,ty,.19),(.55,.55,.028),'tactile',.004)
        for i in range(4):
            for j in range(4): cylinder('Tactile warning dot',(x-.19+i*.125,ty-.19+j*.125,.211),.019,.012,'tactile',vertices=6)
    for x in range(25,64,7):
        gy=road[side+'Y']+(.16 if side=='north' else -.16)
        box('Drainage inset',(x,gy,.176),(.55,.19,.019),'dark-metal',.008)
        for j in range(7): box('Drain grate slots',(x-.22+j*.075,gy,.189),(.023,.16,.009),'mortar',0)
y=road['southY']+.45
while y<road['northY']-.25:
    box('Mapped crossing authored paint',(cross['x'],y,.057),(cross['width'],.68,.012),'paint',0); y+=1.32
for x in range(3,int(B['maxX'])-1,6):
    if abs(x-cross['x'])>cross['width']+1: box('Authored lane marking',(x,W['roadCenterY'],.057),(2.6,.11,.01),'paint',0)
# Clip supplemental authored surface patches to EXISTING play bounds. No new navigation.
def clip_to_play(points):
    for axis,bound,sign in ((0,B['minX'],1),(0,B['maxX'],-1),(1,B['minY'],1),(1,B['maxY'],-1)):
        result=[]
        for a,b in zip(points,points[1:]+points[:1]):
            ia=(a[axis]-bound)*sign>=0; ib=(b[axis]-bound)*sign>=0
            if ia: result.append(a)
            if ia!=ib:
                t=(bound-a[axis])/(b[axis]-a[axis]); result.append(tuple(a[j]+t*(b[j]-a[j]) for j in range(2)))
        points=result
        if not points: break
    return points
for category in ('sidewalks',):
    for feature in context[category]:
        # East straight surfaces are supplied by the original encounter meshes.
        if feature['osmId'] in (465066447,465069406,465069436): continue
        width=(9.7 if feature.get('oneway') else 18.3) if category=='roads' else 3.3
        z=.05 if category=='roads' else .17
        for a,b in zip(feature['path'],feature['path'][1:]):
            a=Vector((a['x'],a['y'])); b=Vector((b['x'],b['y'])); d=(b-a).normalized(); n=Vector((-d.y,d.x))*width/2
            poly=clip_to_play([tuple(a-n),tuple(b-n),tuple(b+n),tuple(a+n)])
            area=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1])))/2 if poly else 0
            if len(poly)>2 and area>1e-5:
                obj=slab('WalkableContext'+('Road' if category=='roads' else 'Sidewalk'),poly,z,.08,'asphalt' if category=='roads' else 'pavement'); obj['walkable']=True; walkables.append(obj)

# Other mapped crossing centrelines receive simple authored zebra paint.
active_group='Context'
for feature in context['crossings']:
    if str(feature.get('osmId'))=='465069430': continue
    path=feature['path']; a=Vector((path[0]['x'],path[0]['y'])); b=Vector((path[-1]['x'],path[-1]['y'])); d=b-a
    if d.length<2: continue
    u=d.normalized(); angle=math.atan2(d.y,d.x)
    for t in np.arange(.4,d.length-.3,1.3):
        p=a+u*t; obj=box('Context crossing stripe',(p.x,p.y,.046),(.66,2.65,.01),'paint',0); obj.rotation_euler.z=angle
for x,y in ((-4,-8),(27,-9),(-36,-7),(0,28),(0,-47)):
    cylinder('Authored flush access cover',(x,y,.06),.35,.013,'dark-metal',vertices=24)
    for j in range(5): box('Cover shallow slot',(x-.20+j*.10,y,.071),(.027,.40,.007),'metal',0)

# Local facade coordinates: x along a COUNTERCLOCKWISE footprint edge, +y inward.
def place_local(start_index,a,b):
    a=Vector((a['x'],a['y'])); d=Vector((b['x'],b['y']))-a; angle=math.atan2(d.y,d.x)
    ca,sa=math.cos(angle),math.sin(angle)
    for obj in static[start_index:]:
        p=obj.location.copy(); obj.location.x=a.x+ca*p.x-sa*p.y; obj.location.y=a.y+sa*p.x+ca*p.y
        obj.rotation_euler.z+=angle

def arch_detail(name,center,front,spring,radius):
    # An opaque recess establishes depth without fabricating an enterable interior.
    polygon=[(-radius,.22),(radius,.22)]+[(radius*math.cos(i*math.pi/24),spring+radius*math.sin(i*math.pi/24)) for i in range(25)]
    n=len(polygon); verts=[(center+x,front,z) for x,z in polygon]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],[tuple(range(n))]); mesh.update(); mesh.materials.append(materials['glass-dark']); add_uv(mesh,'glass-dark')
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj); remember(obj)
    for i in range(16):
        a=(i+.5)*math.pi/16
        obj=box('Arch stone voussoir',(center+(radius+.14)*math.cos(a),front-.13,spring+(radius+.14)*math.sin(a)),(.25,.34,.34),'pale-stone',.008)
        obj.rotation_euler.y=math.pi/2-a
    for sign in (-1,1): box('Arch stone jamb',(center+sign*(radius+.14),front-.10,(spring+.22)/2),(.28,.34,spring-.22),'pale-stone',.012)

def column(x,y,base,height,radius):
    cylinder('Classical tapered shaft',(x,y,base+height/2),radius,height,'pale-stone',top=radius*.85,vertices=20)
    for z,r,h in ((base-.17,radius*1.55,.16),(base-.055,radius*1.30,.12),(base+.07,radius*1.12,.10),(base+height-.04,radius*1.12,.12),(base+height+.15,radius*1.45,.24)):
        cylinder('Column moulding',(x,y,z),r,h,'pale-stone',vertices=20)
    box('Capital abacus',(x,y,base+height+.35),(radius*3.2,radius*3.2,.16),'pale-stone',.025)
    for a in range(8):
        theta=a*math.pi/4
        obj=box('Simplified capital leaf',(x+radius*1.1*math.cos(theta),y+radius*1.1*math.sin(theta),base+height+.12),(.12,.11,.28),'pale-stone',.022); obj.rotation_euler.z=theta

def canopy(length,title):
    global active_group
    active_group=title+'Canopy'
    # Single smooth curved sheet per bay, structural ribs run across rather than roof stripes.
    bay_count=max(1,round(length/3.6)); bay=length/bay_count; width=2.05
    for i in range(bay_count):
        verts=[]
        for x in (i*bay,(i+1)*bay-.016):
            for j in range(13):
                t=j/12; verts.append((x,-.12-t*width,3.36+.27*math.sin(t*math.pi)))
        faces=[(j,j+1,14+j,13+j) for j in range(12)]
        mesh=bpy.data.meshes.new('Canopy curved panel'); mesh.from_pydata(verts,[],faces); mesh.update(); mesh.materials.append(materials['canopy']); add_uv(mesh,'canopy')
        for p in mesh.polygons: p.use_smooth=True
        obj=bpy.data.objects.new('Canopy curved panel',mesh); bpy.context.collection.objects.link(obj); remember(obj)
        for j in range(6):
            t=(j+.5)/6; z=3.32+.27*math.sin(t*math.pi)
            obj=box('Canopy cross rib',(i*bay,-.12-t*width,z),(.047,width/6+.018,.085),'metal',.005)
            obj.rotation_euler.x=-.27*math.pi/width*math.cos(t*math.pi)
        box('Recessed soffit lamp',((i+.5)*bay,-1.12,3.31),(.46,.18,.045),'off-white',.015)
    box('Canopy outer gutter',(length/2,-2.18,3.31),(length,.12,.16),'canopy',.012)
    box('Canopy wall flashing',(length/2,-.07,3.38),(length,.13,.14),'metal',.008)
    active_group=title+'CanopyPosts'
    for x in np.arange(.45,length-.3,5.6):
        box('Pale ribbed canopy support',(x,-2.07,1.73),(.12,.14,3.12),'canopy',.012)
        for k in (-1,0,1): box('Support flute',(x+k*.032,-2.148,1.76),(.010,.009,2.98),'metal',.002)
        box('Support shoe',(x,-2.07,.24),(.20,.23,.16),'metal',.015)

def facade(length,height,levels,title,style,street_face=False,karasuma=False):
    global active_group
    ground=3.9 if style=='mitsui' else 4.7
    storey=(height-ground)/(levels-1); count=max(1,round(length/(2.75 if style=='mitsui' else 2.0))); bay=length/count
    active_group=title+'Upper' if title else 'Context'
    if style=='mitsui':
        for floor in range(1,levels):
            base=ground+(floor-1)*storey; gh=1.62; bottom=.72; ww=bay*.43
            box('Continuous lower stone course',(length/2,0,base+bottom/2),(length,.46,bottom),'pale-stone',.008)
            top=storey-bottom-gh
            box('Continuous upper stone course',(length/2,0,base+storey-top/2),(length,.46,top),'pale-stone',.008)
            for i in range(count):
                x=(i+.5)*bay; z=base+bottom+gh/2
                box('Deep window reveal',(x,.26,z),(ww+.11,.22,gh+.10),'bronze-frame',.007)
                box('Recessed glazing',(x,.075,z),(ww,.018,gh),'glazing-blinds' if (i+floor)%8==0 else 'glazing',0)
                box('Window sash',(x,.027,z),(.026,.045,gh),'bronze-frame',.002)
                box('Projecting stone sill',(x,-.08,base+bottom-.025),(ww+.22,.46,.095),'granite-fascia',.006)
            for j in range(count+1):
                pw=(bay-ww)/2 if j in(0,count) else bay-ww; x=j*bay+(pw/2 if j==0 else -pw/2 if j==count else 0)
                box('Solid pale stone pier',(x,0,base+bottom+gh/2),(pw,.46,gh),'pale-stone',.009)
    else:
        for i in range(count):
            x=(i+.5)*bay; clear=bay-.42
            box('Tall inset glazing',(x,.20,(ground+height)/2),(clear,.025,height-ground),'glazing-blinds' if i%6==2 else 'glazing',0)
            for floor in range(1,levels):
                z=ground+floor*storey
                box('Quiet floor transom',(x,.11,z),(clear,.09,.065),'dark-metal',.002)
            box('Tall slender window mullion',(x,.10,(ground+height)/2),(.038,.12,height-ground),'metal',.002)
        for j in range(count+1):
            pw=.21 if j in(0,count) else .42; x=j*bay+(pw/2 if j==0 else -pw/2 if j==count else 0)
            box('Vertical pale stone rib',(x,-.02,(ground+height)/2),(pw,.68,height-ground),'pale-stone',.013)
        for z in (ground,ground+storey*3.6,height): box('Expressed facade belt',(length/2,-.05,z),(length,.69,.29),'pale-stone',.015)
    active_group=title+'Ground' if title else 'Context'
    if style=='daiya' and karasuma:
        bays=max(1,round(length/4.5)); step=length/bays
        box('Podium stone backing',(length/2,.34,ground/2),(length,.30,ground),'pale-stone',.01)
        for i in range(bays): arch_detail('Karasuma arched glazing',(i+.5)*step,.01,2.20,min(1.44,step*.36))
    else:
        bays=max(1,round(length/3.05)); step=length/bays
        for i in range(bays):
            x=(i+.5)*step
            box('Ground recessed glazing',(x,.23,1.62),(step-.11,.035,2.80),'glazing',0)
            box('Ground frame',(i*step+.03,0,1.62),(.065,.26,2.88),'bronze-frame' if style=='mitsui' else 'metal',.006)
            box('Ground window sill',(x,-.025,.26),(step,.32,.16),'granite-fascia',.009)
            if i%3==0:
                box('Interior visual depth cue',(x,.54,2.86),(step-.35,.1,.08),'off-white',0)
        box('Ground transom',(length/2,-.015,3.05),(length,.27,.32),'bronze-frame' if style=='mitsui' else 'metal',.008)
        box('Textured stone fascia',(length/2,.005,(3.23+ground)/2),(length,.50,ground-3.23),'granite-fascia' if style=='mitsui' else 'pale-stone',.012)
        if street_face:
            box('Restrained institution colour',(length/2,.01,2.68 if style=='mitsui' else 1.26),(length,.03,.045 if style=='mitsui' else .021),'lime-accent' if style=='mitsui' else 'mufg-red',0)
            label='京都三井ビルディング' if style=='mitsui' else '三菱UFJ銀行'
            x=length*.50
            box('Building name plaque',(x,-.17,2.96),(min(length-.4,7.6),.12,.46),'bronze-frame' if style=='mitsui' else 'off-white',.009)
            text('Plain sourced name',label,(x,-.235,2.96),.31,mat='off-white' if style=='mitsui' else 'dark-metal')
    box('Stone base plinth',(length/2,-.015,.22),(length,.44,.28),'granite-fascia',.01)
    if title and street_face: canopy(length,title)

def corner(length,height,title,style):
    global active_group
    active_group=title+'Upper'; center=length/2; flank=(length-6.4)/2
    for x in (flank/2,length-flank/2): box('Chamfer solid side pier',(x,.16,height/2),(flank,.65,height),'pale-stone',.018)
    box('Chamfer upper field',(center,.20,(height+15.0)/2),(6.4,.48,height-15.0),'pale-stone' if style=='mitsui' else 'glass-dark',.01)
    if style=='daiya':
        for x in (center-1.6,center,center+1.6): box('Chamfer high glazing mullion',(x,-.06,(height+15.0)/2),(.055,.10,height-15.0),'metal',.005)
    base=4.8; h=7.9 if style=='mitsui' else 8.6
    box('Classical feature recessed backing',(center,4.10 if style=='mitsui' else .85,9.8),(6.4,.3,10.0),'pale-stone',.014)
    if style=='mitsui':
        # Cylindrical classical fragment is centred on the DIAGONAL mapped face.
        for i in range(16):
            a=math.pi+(i+.5)*math.pi/16; r=2.82
            obj=box('Curved classical stone drum',(center+r*math.cos(a),3.45+r*math.sin(a),8.0),(.61,.22,7.2),'pale-stone',.01); obj.rotation_euler.z=a+math.pi/2
        for degree in (209,247,293,331):
            a=math.radians(degree); column(center+3.20*math.cos(a),3.45+3.20*math.sin(a),base,h,.30)
        for i in range(18):
            a=math.pi+(i+.5)*math.pi/18
            for dz,r,w in ((.0,3.46,.27),(.25,3.63,.23),(.48,3.50,.16)):
                obj=box('Curved stepped classical cornice',(center+r*math.cos(a),3.45+r*math.sin(a),base+h+.55+dz),(.67,w,.18),'pale-stone',.012); obj.rotation_euler.z=a+math.pi/2
        text('Corner building sign','MITSUI BUILDING',(center,-.08,height-1.8),.44,mat='dark-metal')
    else:
        for dx in (-2.05,2.05): column(center+dx,-.46,base,h,.34)
        for dz,width,depth in ((.0,6.2,.75),(.24,6.7,.94),(.49,6.35,.86)):
            box('Classical entablature',(center,-.32,base+h+.55+dz),(width,depth,.20),'pale-stone',.015)
        for x in np.arange(center-2.8,center+2.81,.36): box('Cornice dentil',(x,-.78,base+h+.48),(.16,.20,.14),'pale-stone',.008)
    active_group=title+'Ground'
    box('Chamfer podium',(center,.35,2.45),(length,.5,4.7),'pale-stone',.018)
    if style=='daiya': arch_detail('Corner arched recess',center,-.035,2.22,1.45)
    else:
        for x in (center-1.7,center,center+1.7): box('Classical podium recessed panel',(x,.01,2.05),(1.28,.06,2.80),'granite-fascia',.008)
    for x in (center-3.3,center+3.3):
        box('Wall lantern housing',(x,-.39,2.66),(.22,.20,.50),'bronze-frame',.016)
        box('Wall lantern glass',(x,-.50,2.66),(.15,.035,.35),'off-white',.004)
    box('Corner foot course',(center,-.12,.32),(length,.78,.35),'granite-fascia',.014)

heights={}
for building in context['buildings']:
    stage('Building mapped footprint '+building['id'])
    primary=building['role']=='primary'; style=building['id'] if primary else 'mitsui'
    title=('North' if style=='mitsui' else 'South') if primary else ''
    context_group='ContextBuilding_'+str(building['osmId'])
    if not primary: roots[context_group]=empty(context_group,roots['Context'])
    levels=building.get('levels') or 6; ground=3.9 if style=='mitsui' else 4.7; height=ground+(levels-1)*3.05
    heights[building['id']]=height
    ring=building['footprint']; active_group=title+'Roof' if primary else context_group
    roof=slab(building['id']+' mapped footprint roof',ring,height+.08,.25,'concrete'); roof['osmId']=building['osmId']
    for a,b in zip(ring,ring[1:]):
        dx=b['x']-a['x']; dy=b['y']-a['y']; length=math.hypot(dx,dy)
        if length<.35: continue
        is_corner=primary and {a.get('nodeId'),b.get('nodeId')}=={building['chamfer']['from']['nodeId'],building['chamfer']['to']['nodeId']}
        is_shijo=primary and ((style=='mitsui' and abs((a['y']+b['y'])/2-4.7)<.2 and length>20) or (style=='daiya' and abs((a['y']+b['y'])/2+19.86)<.3 and length>10))
        is_return=primary and max(a['x'],b['x'])<10.1 and abs(dy)>5
        index=len(static)
        if is_corner: corner(length,height,title,style)
        elif is_shijo or is_return: facade(length,height,levels,title,style,is_shijo,is_return)
        else:
            active_group=title+'Shell' if primary else context_group
            box('Mapped contextual wall',(length/2,.13,height/2),(length,.26,height),'pale-stone',0)
            if length>5:
                count=max(1,int(length/3.6))
                for floor in range(1,levels):
                    for i in range(count):
                        box('Authored background window',((i+.5)*length/count,-.022,ground+(floor-.5)*3.05),(1.45,.035,1.74),'glazing',0)
        active_group=title+'Roof' if primary else context_group
        box('Footprint parapet',(length/2,.06,height+.36),(length,.26,.55),'pale-stone',.009)
        place_local(index,a,b)

for door in data['DOORS']:
    side=door['side']; direction=1 if side=='north' else -1; active_group=side.title()+'Ground'
    y=W[side+'FacadeY']-.03*direction
    obj=box('Authored threshold '+door['id'],(door['x'],y,.20),(1.17,.52,.07),'granite',.008)
    obj['doorId']=door['id']; obj['valueKind']='authored'; obj['tenant']='unassigned'
    box('Door leaf',(door['x'],y+direction*.09,1.47),(.96,.065,2.50),'glass-dark',.009)
    for dx in (-.51,.51): box('Door jamb',(door['x']+dx,y,1.47),(.045,.18,2.56),'metal',.005)
    box('Door handle',(door['x']+.30,y-direction*.08,1.30),(.025,.05,.46),'metal',.006)

active_group='Context'
# Mapped planting, with authored species, branching, soil-bed dimensions and season.
for feature in context['hedges']:
    path=feature['path']; ribbon('Mapped hedge stone bed',path,.95,.45,.34,'granite-fascia')
    ribbon('Mapped hedge soil',path,.74,.47,.08,'soil')
    for a,b in zip(path,path[1:]):
        a=Vector((a['x'],a['y'])); b=Vector((b['x'],b['y'])); d=b-a
        for t in np.arange(.2,d.length,.48):
            p=a+d.normalized()*t
            for side in (-1,1):
                oval('Hedge small-leaf silhouette',(p.x+side*.19,p.y+random.uniform(-.15,.15),.79+random.uniform(-.08,.10)),(.33,.27,.35),random.choice(['leaf-dark','leaf-mid','leaf-light']),subdivision=1)

def branch(a,b,radius):
    a,b=Vector(a),Vector(b); obj=cylinder('Authored tree branch',(a+b)/2,radius,(b-a).length,'bark',top=radius*.55,vertices=8)
    obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
for tree in context['trees']:
    x,y=tree['x'],tree['y']; cylinder('Mapped tree soil ring',(x,y,.20),.66,.08,'soil',vertices=24)
    branch((x,y,.18),(x+.15,y,3.9),.14)
    for i in range(11):
        a=i*2.4; start=(x+.06,y,1.8+i*.17); end=(x+math.cos(a)*(1.1+(i%3)*.21),y+math.sin(a)*(1.1+(i%3)*.21),3.7+(i%4)*.39)
        branch(start,end,.043)
        for j in range(3):
            p=Vector(end)+Vector((random.uniform(-.50,.50),random.uniform(-.45,.45),random.uniform(-.05,.35)))
            branch(Vector(end)*.65+Vector(start)*.35,p,.013)
            # Disconnected thin leaf clusters reveal the branch network and cast broken shadows.
            for k in range(3):
                q=p+Vector((random.uniform(-.30,.30),random.uniform(-.30,.30),random.uniform(-.20,.20)))
                oval('Sparse authored foliage',q,(.30,.22,.17),random.choice(['leaf-dark','leaf-mid','leaf-light']),subdivision=1)
# Static signal housing is an authored representation, not a real-time signal state.
for feature in context['crossings']:
    for point in (feature['path'][0],feature['path'][-1]):
        x,y=point['x']+.60,point['y']+.42
        cylinder('Crossing signal post',(x,y,2.55),.067,4.8,'dark-metal',vertices=10)
        box('Pedestrian signal housing',(x,y,3.27),(.30,.22,.48),'dark-metal',.025)
        for dz in (-.11,.11): cylinder('Unlit pedestrian signal lens',(x,y-.13,3.27+dz),.066,.018,'glass-dark',vertices=12).rotation_euler.x=math.pi/2
        box('Signal support arm',(x+.48,y,4.82),(1.1,.085,.085),'dark-metal',.008)
        box('Static vehicle signal housing',(x+.88,y,4.69),(.84,.22,.28),'dark-metal',.035)
        for dx in (-.26,0,.26):
            obj=cylinder('Unlit traffic signal lens',(x+.88+dx,y-.13,4.69),.093,.02,'glass-dark',vertices=16); obj.rotation_euler.x=math.pi/2
active_group='Street'
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

metrics={'status':'source','blenderVersion':bpy.app.version_string,'scriptSHA256':sha(__file__),'canonicalSource':'experience/src/content/kyoto.js','canonicalSHA256':sha(source),'streetContextSHA256':sha(context_path),'source':{'buildings':W['buildings'],'crossing':cross,'roadSurface':road,'streetContext':'experience/public/content-evidence/street-context.json','renderBounds':R},'authored':['storey heights '+str(heights),'facade construction on mapped footprint planes','roof form and storey heights','photo-informed facade character; authored bay dimensions, corner simplification, materials and reflection cues','door treatments/thresholds without tenant bindings','distant neutral ground and Shijo road continuation beyond clipped source are authored visual background','display road buffers 9.7m per one-way centreline / 18.3m Shijo, sidewalk buffers 3.3m, kerbs and tactile layout are authored','supplemental clipped movement surfaces are simulation surfaces within existing bounds, not verified walkability','furniture and planting','traveller and pose','camera and lighting'],'axes':'Blender(east,north,height) -> glTF(east,height,-north), metres','materials':'core opaque PBR; original embedded albedo/normal/roughness maps; authored glazing cues and environment reflections; no baked direct light or reconstructed interiors','facadeReferences':reference_data['references'],'facadeReferenceMetadataSHA256':sha(reference_path),'referenceUse':'Visual reference for original simplified facade geometry and materials; photograph pixels are not included. No Google Street View asset derivation.','textureCount':len(texture_images),'normalRoughnessSets':len(surface_maps),'semanticGroups':list(roots),'actorPivots':['Traveller','LeftLeg','RightLeg','LeftArm','RightArm','Torso','Head'],'sourceObjects':len(static)+len(actor_parts),'font':str(font_path),'limitations':['Facade appearance is authored, not a photographic reconstruction.','Eight levels are OSM metadata; metres per storey are authored.','Gameplay uses semantic visibility; optional old beauty hides groups, while render-study uses full visible geometry with matching cameras.','No rigged fingers, interiors, observed entry claims or facial animation.','Cycles area lighting is a reference; runtime materials and lighting require browser review.']}
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
    if obj['semantic_group'] in ('SouthShell','SouthUpper','SouthRoof','SouthCanopy','NorthCanopy'): obj.hide_render=True
traveller.location=(W['spawn']['x'],W['spawn']['y'],.17)
if not args.skip_render:
    t=time.perf_counter(); bpy.ops.render.render(write_still=True)
    metrics['reference']={'path':str(out/'reference.png'),'sha256':sha(out/'reference.png'),'seconds':round(time.perf_counter()-t,2),'samples':args.samples,'size':[1200,800],'denoising':False}
metrics['status']='complete'; metrics['seconds']=round(time.perf_counter()-START,2); write_metrics()
(assets/'provenance.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2))
stage('Complete; compare actual browser before visual acceptance')
