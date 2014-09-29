import bpy

objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and 'LightMap' in obj.data.uv_layers]
with open("objects.txt", "w") as objlist:
	for obj in objects:
		print("%s" % (obj.name))
		objlist.write("%s\n" % obj.name)
	objlist.close()
