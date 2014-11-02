#!/bin/sh

PROJECTNAME=$1
PROJECTROOT=/mnt/projects
S3BUCKETNAME=elation-render-data

if [ ! -z $PROJECTNAME ]; then
	if [ -d "$PROJECTROOT/$PROJECTNAME" ]; then
		if [ -d "$PROJECTROOT/$PROJECTNAME/data" ]; then
			ZIPFILE="$PROJECTNAME.tar.gz"
			# Build the zip file, if it doesn't exist
			NEWER=1
			if [ -f "$PROJECTROOT/$PROJECTNAME/$ZIPFILE" ]; then
				# If it does exist, only build if any files changed more recently than the zip file
				NEWER=$(find "$PROJECTROOT/$PROJECTNAME/data" -cnewer "$PROJECTROOT/$PROJECTNAME/$ZIPFILE")
			fi

			if [ ! -z "$NEWER" ]; then
				echo -n "Building $ZIPFILE..."
				cd "$PROJECTROOT/$PROJECTNAME/data"
				tar czf "../$ZIPFILE" .
				echo "done"
				cd ../../..
			else
				echo "$ZIPFILE already up to date, skipping..."
			fi
			echo -n "Uploading $ZIPFILE to s3..."
			s3cmd sync "$PROJECTROOT/$PROJECTNAME/$ZIPFILE" s3://$S3BUCKETNAME/$ZIPFILE
			echo "done"
		else
			echo "ERROR: $PROJECTNAME exists, but has no data in $PROJECTROOT/$PROJECTNAME/data"
			exit 1
		fi
	else
		echo "ERROR: missing $PROJECTROOT/$PROJECTNAME"
		exit 1
	fi
else
	echo "ERROR: must specify a job name"
	exit 1
fi
