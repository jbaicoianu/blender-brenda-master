#!/bin/sh

JOBNAME=$1
JOBROOT=jobdata
S3BUCKETNAME=elation-render-data

if [ ! -z $JOBNAME ]; then
	if [ -d jobdata/$JOBNAME ]; then
		ZIPFILE="$JOBNAME.tar.gz"
		NEWER=$(find "$JOBROOT/$JOBNAME/" -cnewer "$JOBROOT/$ZIPFILE")
		if [ ! -f "$JOBROOT/$ZIPFILE" ] || [ ! -z "$NEWER" ]; then
			echo -n "Building $ZIPFILE..."
			cd "$JOBROOT/$JOBNAME"
			tar czf "../$ZIPFILE" .
			echo "done"
			cd ../..
		else
			echo "$ZIPFILE already up to date, skipping..."
		fi
		echo -n "Uploading $ZIPFILE to s3..."
		s3cmd put "$JOBROOT/$ZIPFILE" s3://$S3BUCKETNAME
		echo "done"
	else
		echo ERROR: missing $JOBROOT/$JOBNAME
		exit 1
	fi
else
	echo ERROR: specify a job name
	exit 1
fi
