import sys; a=sys.argv[sys.argv.index("--")+1:]; sys.path.insert(0,a[0])
import bpy, lib, os
D=bpy.data
S_,TEX,BLEND,GLB=a[0],a[1],a[2],a[3]   # TEX: carpeta con mapas finales (2048/ o 1024/)
def img(name,cs):
    p=f"{TEX}/{name}"; im=D.images.load(p,check_existing=False); im.name=name; im.colorspace_settings.name=cs; im.pack(); return im
def N(nt,t,loc): n=nt.nodes.new(t); n.location=loc; return n
def build(matname,tag,normal=True):
    m=D.materials[matname]; nt=m.node_tree; nt.nodes.clear()
    out=N(nt,'ShaderNodeOutputMaterial',(900,0)); bs=N(nt,'ShaderNodeBsdfPrincipled',(600,0)); nt.links.new(bs.outputs['BSDF'],out.inputs['Surface'])
    mr=N(nt,'ShaderNodeTexImage',(0,0)); mr.image=img(f"banca-claude-{tag}-metalrough-v2.png",'Non-Color')
    sep=N(nt,'ShaderNodeSeparateColor',(300,0)); nt.links.new(mr.outputs['Color'],sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'],bs.inputs['Roughness']); nt.links.new(sep.outputs['Blue'],bs.inputs['Metallic'])
    if normal:
        bc=N(nt,'ShaderNodeTexImage',(0,300)); bc.image=img(f"banca-claude-{tag}-basecolor-v2.png",'sRGB'); nt.links.new(bc.outputs['Color'],bs.inputs['Base Color'])
        nm=N(nt,'ShaderNodeTexImage',(-300,-300)); nm.image=img(f"banca-claude-{tag}-normal-v2.png",'Non-Color')
        nmap=N(nt,'ShaderNodeNormalMap',(250,-300)); nmap.space='TANGENT'; nmap.uv_map="MapaUV"
        nt.links.new(nm.outputs['Color'],nmap.inputs['Color']); nt.links.new(nmap.outputs['Normal'],bs.inputs['Normal'])
        for n in (bc,nm,mr): n.interpolation='Linear'
    else:
        bs.inputs['Base Color'].default_value=(0.78,0.79,0.8,1)
build(lib.GREEN,"verde"); build(lib.GRAF,"grafito"); build(lib.STEEL,"acero",normal=False)
for o in lib.coll().all_objects:
    pass
import bmesh
seen=set()
for o in lib.textured_objs(lib.STEEL):
    if o.data.name in seen: continue
    seen.add(o.data.name); bm=bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4],quad_method='BEAUTY',ngon_method='BEAUTY'); bm.to_mesh(o.data); bm.free()
c=lib.coll(); bpy.ops.object.select_all(action='DESELECT')
for o in c.all_objects: o.select_set(True)
bpy.context.view_layer.objects.active=list(c.all_objects)[0]
r=bpy.ops.export_scene.gltf(filepath=GLB,export_format='GLB',use_selection=True,export_apply=True,export_image_format='AUTO',export_materials='EXPORT',export_tangents=True,export_cameras=False,export_lights=False,export_extras=False)
print("EXPORT",r,os.path.getsize(GLB))
if BLEND!="-":
    bpy.data.orphans_purge(do_recursive=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND,compress=True); print("SAVED",BLEND,os.path.getsize(BLEND))
