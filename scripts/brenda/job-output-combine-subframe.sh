#!/bin/sh

PROJECTNAME=$1
JOBNAME=$2

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

DEBUGFILE=$JOBDIR/scratch/log
DEBUGNAME=combine-subframe
debug_log() {
  echo "[$DEBUGNAME]\t$@" >>$DEBUGFILE
}

subframe_get_filename() {
  # Given a subframe filename, extract the frame name (eg. frame_000470_X-0.5-0.75-Y-0.25-0.5.png => frame_000470.png)
  INFILE=$1
  FNAME=$(basename $INFILE |sed -Ee 's/_X-[0-9\.]+-[0-9\.]+-Y-[0-9\.]+-[0-9\.]+\./\./')
  echo $JOBDIR/$FNAME
}
subframe_combine() {
  INFILE=$1
  OUTFILE=$(subframe_get_filename "$INFILE")
  DONEFILE=$PROCESSEDDIR/$(basename $INFILE)
  # Create blank subframe file if this is our first time seeing this frame
  if [ ! -e $OUTFILE ]; then
    subframe_create "$OUTFILE"
  fi
  debug_log "Combining $INFILE with $OUTFILE"
  if composite "$INFILE" "$OUTFILE" "$OUTFILE"; then
    mv "$INFILE" "$DONEFILE"
  fi
}
subframe_create() {
  OUTFILE=$1
  debug_log "Creating new output file '$OUTFILE'"
  convert -size 1920x1080 xc:white "$OUTFILE"
  #echo .
}
subframe_get_incoming_file() {
  # Check the incoming directory for files.  If any exist, move the first one into the processing directory, and return its name
  NEWFILE=$(find "$INCOMINGDIR" -type l |head -1)
  if [ ! -z "$NEWFILE" ] && [ -e "$NEWFILE" ]; then
    mv "$NEWFILE" "$PROCESSINGDIR"
    FNAME=$(basename $NEWFILE)
    echo "$PROCESSINGDIR/$FNAME"
  fi
}

subframe_combine_incoming() {
  # Clear out the incoming directory of any existing files
  FNAME=$(subframe_get_incoming_file)
  while [ ! -z "$FNAME" ]; do
    subframe_combine "$FNAME"
    FNAME=$(subframe_get_incoming_file)
  done
}

debug_log "Monitoring $INCOMINGDIR for new files..."
while true; do
  subframe_combine_incoming
  if [ -e "$JOBDIR/scratch/DONE" ]; then
    # Call this one last time just to make sure we're not caught in a race condition.  It should be a no-op.
    subframe_combine_incoming
    debug_log "Job marked as complete, exiting"
    exit
  fi
  sleep 1
done
