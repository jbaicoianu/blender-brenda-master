#!/bin/bash

PROJECTNAME=$1
JOBNAME=$2
JOBTYPE=$3

# Directory shortcut variables
PROJECTROOT=/mnt/projects
JOBDIR=$PROJECTROOT/$PROJECTNAME/jobs/$JOBNAME
INCOMINGDIR=$JOBDIR/scratch/incoming
PROCESSINGDIR=$JOBDIR/scratch/processing
PROCESSEDDIR=$JOBDIR/scratch/processed

# Create directories if they don't exist
[ ! -d "$INCOMINGDIR" ] && mkdir -p "$INCOMINGDIR"
[ ! -d "$PROCESSINGDIR" ] && mkdir -p "$PROCESSINGDIR"
[ ! -d "$PROCESSEDDIR" ] && mkdir -p "$PROCESSEDDIR"

DEBUGNAME=combine
DEBUGFILE=$JOBDIR/scratch/log
. ./scripts/brenda/job-debug.sh

animation_get_filename() {
  # Simple case, just change the directory
  INFILE=$1
  FNAME=$(basename $INFILE)
  echo $JOBDIR/$FNAME
}
subframe_get_filename() {
  # Given a subframe filename, extract the frame name (eg. frame_000470_X-0.5-0.75-Y-0.25-0.5.png => frame_000470.png)
  INFILE=$1
  FNAME=$(basename $INFILE |sed -Ee 's/_X-[0-9\.]+-[0-9\.]+-Y-[0-9\.]+-[0-9\.]+\./\./')
  echo $JOBDIR/$FNAME
}
bake_get_filename() {
  # Given a bake subtask filename, extract the bake image name (eg. lightmap-interior::floor.png => lightmap-interior.png)
  INFILE=$1
  FNAME=$(basename $INFILE |sed -Ee 's/::.*?\.png/.png/')
  echo $JOBDIR/$FNAME
}
job_get_filename() {
  INFILE=$1
  case "$JOBTYPE" in
    "animation" )
      animation_get_filename "$INFILE"
      ;;
    "subframe" )
      subframe_get_filename "$INFILE"
      ;;
    "bake" )
      bake_get_filename "$INFILE"
      ;;
  esac
}
job_combine() {
  INFILE=$1
  OUTFILE=$(job_get_filename "$INFILE")
  DONEFILE=$PROCESSEDDIR/$(basename $INFILE)

  case "$JOBTYPE" in
    "animation")
      ln -s "$INFILE" "$OUTFILE"
      ;;
    *)
      # Create blank subframe file if this is our first time seeing this frame
      if [ ! -e $OUTFILE ]; then
        job_create_outfile "$OUTFILE"
      fi
      if composite "$OUTFILE" "$INFILE" "$OUTFILE"; then
        mv "$INFILE" "$DONEFILE"
      fi
      ;;
  esac
  debug_log "$INFILE => $OUTFILE"
}
job_create_outfile() {
  OUTFILE=$1
  convert -size 1x1 xc:white "$OUTFILE"
  debug_log "New outfile '$OUTFILE'"
  #echo .
}
job_get_incoming_file() {
  # Check the incoming directory for files.  If any exist, move the first one into the processing directory, and return its name
  NEWFILE=$(find "$INCOMINGDIR" -type l |head -1)
  if [ ! -z "$NEWFILE" ] && [ -e "$NEWFILE" ]; then
    mv "$NEWFILE" "$PROCESSINGDIR"
    FNAME=$(basename $NEWFILE)
    echo "$PROCESSINGDIR/$FNAME"
  fi
}

job_combine_incoming() {
  # Clear out the incoming directory of any existing files
  FNAME=$(job_get_incoming_file)
  while [ ! -z "$FNAME" ]; do
    job_combine "$FNAME"
    FNAME=$(job_get_incoming_file)
  done
}

debug_log "Monitoring $INCOMINGDIR for new files..."
while true; do
  job_combine_incoming
  if [ -e "$JOBDIR/scratch/DONE" ]; then
    # Call this one last time just to make sure we're not caught in a race condition.  It should be a no-op.
    job_combine_incoming
    debug_log "Job complete, exiting"
    exit
  fi
  sleep 1
done
