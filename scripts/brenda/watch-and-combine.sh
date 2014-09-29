#!/bin/sh

JOBNAME=$1
JOBDIR=frames/$JOBNAME/
OUTFILE=$2

echo -n "Creating new output file $OUTFILE: "
convert -size 1920x1200 xc:white $OUTFILE
echo .

inotifywait -m $JOBDIR -e close_write -e moved_to |
	while read path action file; do
		echo -n "Combining $file: "
		composite $path/$file $OUTFILE $OUTFILE
		echo .
	done

