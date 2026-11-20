import sys; sys.path.insert(0,sys.argv[-1]); S_=sys.argv[-1]
import bpy, lib, numpy as np, os, json
D=bpy.data
sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.samples=8; sc.cycles.device='CPU'
lib.bake_geometry()
for mn in (lib.GREEN,lib.GRAF):
    lib.unwrap_set(mn,1.1519,0.0,0.0085)
# steel UVs
steel=lib.textured_objs(lib.STEEL)
meshes={}
for o in steel: meshes[o.data]=o
bpy.ops.object.select_all(action='DESELECT')
for o in meshes.values(): o.select_set(True)
bpy.context.view_layer.objects.active=list(meshes.values())[0]
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.1519,island_margin=0.0,area_weight=0.0,correct_aspect=True,scale_to_bounds=False)
bpy.ops.uv.select_all(action='SELECT'); bpy.ops.uv.average_islands_scale(); bpy.ops.uv.pack_islands(rotate=True,margin=0.012,margin_method='ADD')
bpy.ops.object.mode_set(mode='OBJECT')
out={}
for mn in (lib.GREEN,lib.GRAF,lib.STEEL):
    r=lib.measure(mn,R=2048 if mn!=lib.STEEL else 1024,pad_test=(8,16)); out[mn]=r; print("RES",mn,r)
json.dump(out,open(S_+"/uvstats.json","w"))
# bake
P=os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
os.makedirs(P+"/fuente-2048",exist_ok=True)
kinds=[("basecolor",'DIFFUSE','sRGB',dict(pass_filter={'COLOR'})),("normal",'NORMAL','Non-Color',dict(normal_space='TANGENT')),("roughness",'ROUGHNESS','Non-Color',{})]
for tag,mn in (("verde",lib.GREEN),("grafito",lib.GRAF)):
    objs=lib.textured_objs(mn); proc=D.materials[mn+" (procedural)"]
    imgs=lib.bake_set(objs,proc,tag,2048,kinds,P)
    for k,im in imgs.items():
        im.filepath_raw=f"{P}/fuente-2048/banca-claude-{tag}-{k}-bake.png"; im.file_format='PNG'; im.save()
    print("baked",tag)
sp=lib.make_steel_proc()
imgs=lib.bake_set(lib.textured_objs(lib.STEEL),sp,"acero",1024,[("roughness",'ROUGHNESS','Non-Color',{})],P)
im=imgs["roughness"]; im.filepath_raw=f"{P}/fuente-2048/banca-claude-acero-roughness-bake-1024.png"; im.file_format='PNG'; im.save()
bpy.ops.wm.save_as_mainfile(filepath=S_+"/work_stage1.blend")
print("STAGE1 DONE")
