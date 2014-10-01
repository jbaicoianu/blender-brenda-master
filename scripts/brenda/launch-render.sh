#!/bin/bash

# ./launch-render <jobname> <instances>

JOBNAME=$1
JOBTYPE="subframe"
INSTANCTYPE=$3
INSTANCES=$4

RESX=1920
RESY=1080
TILESX=12
TILESY=8

init_data() {
	./scripts/brenda/build-jobfile.sh $JOBNAME
	return $?
}

init_data
DATAEXISTS=$?

if [ $DATAEXISTS -eq 0 ]; then
	echo -n Populating job queue...
	brenda-work -T templates/brenda/$JOBTYPE -e 1 -X $TILESX -Y $TILESY push
	echo done
else
	echo no build
fi

#echo do some tiling: $TILESX x $TILESY

