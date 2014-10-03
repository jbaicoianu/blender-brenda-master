#!/bin/sh

for IMG in $*; do 
	echo "---- $IMG ----"
	for F in ${IMG}_*.png; do 
		if [ ! -f ${IMG}.png ]; then cp $F ${IMG}.png
		else composite $F ${IMG}.png ${IMG}.png
		fi
		echo $F
	done
done
