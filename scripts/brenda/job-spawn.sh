#!/bin/bash

PROJECTROOT=/mnt/projects

PROJECTNAME=$1
JOBNAME=$2
JOBTYPE=$3 # subframe|animation|bake
JOBARGS=${@:4}

# Push the new job file to S3 (TODO - could be done with btsync)
./scripts/brenda/job-data-build.sh "$PROJECTNAME" "$JOBNAME"

# Create job directory and its subdirectories if they doesn't exist
JOBDIR=$PROJECTROOT/$PROJECTNAME/jobs/$JOBNAME
[ ! -d "$JOBDIR/scratch" ] && mkdir -p "$JOBDIR/scratch"

# Create new job config file if it doesn't exist yet
JOBCONFIG=$JOBDIR/scratch/brenda-job.conf
if [ ! -f $JOBCONFIG ]; then
  sed -e "s/\$PROJECTNAME/$PROJECTNAME/" \
      -e "s/\$JOBNAME/$JOBNAME/" \
      config/brenda-job.conf > "$JOBCONFIG"
fi


# Add new job tasks to the queue
brenda-work --config="$JOBCONFIG" -T templates/brenda/$JOBTYPE $JOBARGS push

# Watch S3 for finished data and sync them for further processing
./scripts/brenda/job-output-sync.sh "$PROJECTNAME" "$JOBNAME" &

# Automatically combine new data into final output
./scripts/brenda/job-output-combine.sh "$PROJECTNAME" "$JOBNAME" "$JOBTYPE" &

