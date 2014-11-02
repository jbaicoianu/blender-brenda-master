#!/bin/sh

PROJECTROOT=/mnt/projects
PROJECTNAME=$1
JOBNAME=$2

JOBDIR=$PROJECTROOT/$PROJECTNAME/jobs/$JOBNAME
PARTIALDIR=$JOBDIR/scratch/partial
INCOMINGDIR=$JOBDIR/scratch/incoming
[ ! -d "$INCOMINGDIR" ] && mkdir -p "$INCOMINGDIR"
[ ! -d "$PARTIALDIR" ] && mkdir -p "$PARTIALDIR"

DEBUGFILE=$JOBDIR/scratch/log
DEBUGNAME=output-sync
debug_log() {
  echo "[$DEBUGNAME]\t$@" >>$DEBUGFILE
}

SYNCFILE=$PARTIALDIR/LASTSYNC
touch "$SYNCFILE"

debug_log "Syncing S3 data to $INCOMINGDIR..."
while true; do
  # Sync s3 bucket into the partial directory
  s3cmd sync s3://elation-render-output/$PROJECTNAME/$JOBNAME/ "$PARTIALDIR/" >/dev/null

  # Symlink all newly-downloaded files into the incoming directory, and update sync file timestamp
  find "$PARTIALDIR" -type f -cnewer "$SYNCFILE" -exec ln -sf {} "$INCOMINGDIR/" \;
  COUNT=$(find "$PARTIALDIR" -type f -cnewer "$SYNCFILE" |wc -l)
  debug_log "Synced $COUNT files"
  touch "$SYNCFILE"

  # Check for doneness
  if [ -e "$JOBDIR/scratch/DONE" ]; then
    debug_log "Job marked as complete, exiting"
    exit
  fi

  # Sleepy time
  sleep 5
done
