import bpy, bmesh, numpy as np, math
D=bpy.data
GREEN="Claude | rPET Verde"; GRAF="Claude | rPET Grafito"
def coll(): return D.collections["Banca Claude - Modelado"]
def textured_objs(matname):
    return [o for o in coll().all_objects if o.material_slots[0].material.name==matname]
def bake_geometry():
    """Aplica Bevel+WeightedNormal+Triangulate(n-gons) al mesh de verde/grafito (geometría evaluada idéntica)."""
    dg=bpy.context.evaluated_depsgraph_get(); done={}
    for mn in (GREEN,GRAF):
        for o in textured_objs(mn):
            if o.name.startswith("Claude | Soporte"):
                t=o.modifiers.new("Triangular n-gons",'TRIANGULATE'); t.min_vertices=5; t.keep_custom_normals=True; t.quad_method='BEAUTY'; t.ngon_method='BEAUTY'
            old=o.data
            if old.name in done: o.data=done[old.name]
            else:
                dg=bpy.context.evaluated_depsgraph_get()
                new=D.meshes.new_from_object(o.evaluated_get(dg),preserve_all_data_layers=True,depsgraph=dg)
                new.name=old.name+" v2"; done[old.name]=new; o.data=new
            for m in list(o.modifiers): o.modifiers.remove(m)
            for p in o.data.polygons: p.use_smooth=True
    return done
def uv_islands(bm,uv):
    parent=list(range(len(bm.faces)))
    def f(x):
        while parent[x]!=x: parent[x]=parent[parent[x]]; x=parent[x]
        return x
    for e in bm.edges:
        if len(e.link_faces)==2:
            a,b=e.link_faces; ok=True
            for v in e.verts:
                la=[l for l in a.loops if l.vert==v][0]; lb=[l for l in b.loops if l.vert==v][0]
                if (la[uv].uv-lb[uv].uv).length>1e-5: ok=False;break
            if ok: parent[f(a.index)]=f(b.index)
    return [f(i) for i in range(len(bm.faces))]
def measure(matname,R=2048,pad_test=(8,16)):
    meshes={}
    for o in textured_objs(matname): meshes[o.data]=o
    cnt=np.zeros((R,R),np.int16); lab=np.zeros((R,R),np.int32); nid=0; dens=[]; isl=0
    for me in meshes:
        bm=bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table(); bmesh.ops.triangulate(bm,faces=bm.faces[:]) if False else None
        uv=bm.loops.layers.uv.active; groups=uv_islands(bm,uv); gid={g:i+1+nid for i,g in enumerate(sorted(set(groups)))}; nid+=len(gid); isl+=len(gid)
        tris=me.loop_triangles if False else None
        for f in bm.faces:
            L=list(f.loops)
            if len(L)>3:
                pts=[np.array(l[uv].uv) for l in L]
            a3=f.calc_area()
            P=[np.array(l[uv].uv) for l in L]
            a2=0.5*abs(sum(P[i][0]*P[(i+1)%len(P)][1]-P[(i+1)%len(P)][0]*P[i][1] for i in range(len(P))))
            if a3>1e-9: dens.append(math.sqrt(a2*R*R/(a3*1e6)))
            for i in range(1,len(L)-1):
                p=[np.array(L[k][uv].uv)*R for k in (0,i,i+1)]
                x0=max(int(min(q[0] for q in p)),0); x1=min(int(max(q[0] for q in p))+1,R-1)
                y0=max(int(min(q[1] for q in p)),0); y1=min(int(max(q[1] for q in p))+1,R-1)
                xs,ys=np.meshgrid(np.arange(x0,x1+1)+0.5,np.arange(y0,y1+1)+0.5)
                (ax,ay),(bx,by),(cx,cy)=p; d=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy)
                if abs(d)<1e-9: continue
                l1=((by-cy)*(xs-cx)+(cx-bx)*(ys-cy))/d; l2=((cy-ay)*(xs-cx)+(ax-cx)*(ys-cy))/d
                m=(l1>=0)&(l2>=0)&(1-l1-l2>=0)
                sl=(slice(y0,y1+1),slice(x0,x1+1))
                cnt[sl]+=m; lab[sl]=np.where(m,gid[groups[f.index]],lab[sl])
        bm.free()
    dens=np.array(dens)
    # min gap between different islands: dilate labels by n px and look for conflict
    res={}
    for n in pad_test:
        bad=0
        L=lab.copy()
        for dy in range(-n,n+1,max(1,n//4)):
            for dx in range(-n,n+1,max(1,n//4)):
                if dx*dx+dy*dy>n*n: continue
                sh=np.roll(np.roll(L,dy,0),dx,1)
                bad+=int(((sh>0)&(L>0)&(sh!=L)).sum())
        res[n]=bad
    return dict(islands=isl,meshes=len(meshes),overlap_px=int((cnt>1).sum()),coverage=round(float((cnt>0).mean()),3),dens_p1=round(float(np.percentile(dens,1)),2),dens_p50=round(float(np.percentile(dens,50)),2),dens_p99=round(float(np.percentile(dens,99)),2),dens_max=round(float(dens.max()),2),pad_conflicts=res,uvmin=None)
def unwrap_set(matname,angle,margin,pack_margin):
    meshes={}
    for o in textured_objs(matname): meshes[o.data]=o
    bpy.ops.object.select_all(action='DESELECT')
    for me,o in meshes.items(): o.select_set(True)
    bpy.context.view_layer.objects.active=list(meshes.values())[0]
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=angle,island_margin=margin,area_weight=0.0,correct_aspect=True,scale_to_bounds=False)
    bpy.ops.uv.select_all(action='SELECT'); bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(rotate=False,margin=pack_margin,margin_method='ADD')
    bpy.ops.object.mode_set(mode='OBJECT')
STEEL="Claude | Acero inoxidable"
def make_steel_proc():
    n=STEEL+" (procedural)"
    if n in D.materials: return D.materials[n]
    m=D.materials.new(n); m.use_nodes=True; nt=m.node_tree; nt.nodes.clear()
    out=nt.nodes.new('ShaderNodeOutputMaterial'); bs=nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(bs.outputs['BSDF'],out.inputs['Surface'])
    co=nt.nodes.new('ShaderNodeTexCoord'); nz=nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value=600; nz.inputs['Detail'].default_value=3; nz.inputs['Roughness'].default_value=0.55
    nt.links.new(co.outputs['Object'],nz.inputs['Vector'])
    mr=nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value=0.17; mr.inputs['To Max'].default_value=0.31
    nt.links.new(nz.outputs['Fac'],mr.inputs['Value']); nt.links.new(mr.outputs['Result'],bs.inputs['Roughness'])
    bs.inputs['Base Color'].default_value=(0.78,0.79,0.8,1); bs.inputs['Metallic'].default_value=1.0
    m.use_fake_user=True
    return m
def bake_set(objs,procmat,tag,S,kinds,outdir):
    sc=bpy.context.scene
    saved=[(o,o.material_slots[0].material) for o in objs]
    for o in objs: o.material_slots[0].material=procmat
    nt=procmat.node_tree
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    node=nt.nodes.new('ShaderNodeTexImage'); nt.nodes.active=node
    imgs={}
    for kind,btype,cs,kw in kinds:
        name=f"banca-claude-{tag}-{kind}-v2-src"
        if name in D.images: D.images.remove(D.images[name])
        im=D.images.new(name,S,S,alpha=False); im.colorspace_settings.name=cs; node.image=im
        bpy.ops.object.bake(type=btype,margin=16,margin_type='EXTEND',use_clear=True,**kw); imgs[kind]=im
    nt.nodes.remove(node)
    for o,m in saved: o.material_slots[0].material=m
    return imgs
