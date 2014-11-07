#!/bin/sh

PROJECTROOT=/mnt/projects
PROJECTNAME=$1
JOBNAME=$2

SYNCTIME=10
JOBDIR=$PROJECTROOT/$PROJECTNAME/jobs/$JOBNAME
PARTIALDIR=$JOBDIR/scratch/partial
INCOMINGDIR=$JOBDIR/scratch/incoming
[ ! -d "$INCOMINGDIR" ] && mkdir -p "$INCOMINGDIR"
[ ! -d "$PARTIALDIR" ] && mkdir -p "$PARTIALDIR"

DEBUGNAME=output-sync
DEBUGFILE=$JOBDIR/scratch/log
. ./scripts/brenda/job-debug.sh

SYNCFILE=$PARTIALDIR/LASTSYNC
touch "$SYNCFILE"

debug_log "Syncing S3 data to $INCOMINGDIR..."
while true; do
  # Sync s3 bucket into the partial directory
  s3cmd sync s3://elation-render-output/$PROJECTNAME/$JOBNAME/ "$PARTIALDIR/" >/dev/null

  # Symlink all newly-downloaded files into the incoming directory, and update sync file timestamp
  COUNT=$(find "$PARTIALDIR" -type f -cnewer "$SYNCFILE" |wc -l)
  if [ $COUNT -gt 0 ]; then
    find "$PARTIALDIR" -type f -cnewer "$SYNCFILE" -exec ln -sf {} "$INCOMINGDIR/" \;
    debug_log "Synced $COUNT files"
  fi
  touch "$SYNCFILE"

  # Check for doneness
  if [ -e "$JOBDIR/scratch/DONE" ]; then
    debug_log "Job marked as complete, exiting"
    exit
  fi

  # Sleepy time
  sleep $SYNCTIME
done
