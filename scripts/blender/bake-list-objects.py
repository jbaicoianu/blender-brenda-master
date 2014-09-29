import bpy

objects = bpy.context.scene.objects.keys()
with open("objects.txt", "w") as objlist:
	for o in objects:
		if bpy.data.objects[o].type == 'MESH':
			objlist.write("%s\n" % o)
	objlist.close()
