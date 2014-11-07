#!/bin/sh

PROJECTNAME=$1
JOBNAME=$2

PROJECTROOT=/mnt/projects
S3BUCKETNAME=elation-render-data

JOBDIR=$PROJECTROOT/$PROJECTNAME/jobs/$JOBNAME

DEBUGNAME=data-build
DEBUGFILE=$JOBDIR/scratch/log
. ./scripts/brenda/job-debug.sh

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
				debug_log "Building $ZIPFILE..."
				cd "$PROJECTROOT/$PROJECTNAME/data"
				tar czf "../$ZIPFILE" .
				debug_log "done"
				cd ../../..
			else
				debug_log "$ZIPFILE already up to date, skipping..."
			fi
      # FIXME - the log is misleading here, it should tell us if the upload wasn't necessary because the file was already in sync
			debug_log "Uploading $ZIPFILE to s3..."
			s3cmd sync "$PROJECTROOT/$PROJECTNAME/$ZIPFILE" s3://$S3BUCKETNAME/$ZIPFILE
			debug_log "done"
		else
			debug_log "ERROR: $PROJECTNAME exists, but has no data in $PROJECTROOT/$PROJECTNAME/data"
			exit 1
		fi
	else
		debug_log "ERROR: missing $PROJECTROOT/$PROJECTNAME"
		exit 1
	fi
else
	debug_log "ERROR: must specify a job name"
	exit 1
fi
