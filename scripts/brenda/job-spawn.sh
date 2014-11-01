#!/bin/bash

PROJECTROOT=/mnt/projects

PROJECTNAME=$1
JOBNAME=$2
JOBTYPE=$3 # subframe|animation|bake
JOBARGS=${@:4}

# Push the new job file to S3 (TODO - could be done with btsync)
./scripts/brenda/job-data-build.sh $PROJECTNAME

# Create job directory and its subdirectories if they doesn't exist
JOBDIR=$PROJECTROOT/$PROJECTNAME/jobs/$JOBNAME
[ ! -d "$JOBDIR/scratch" ] && mkdir -p "$JOBDIR/scratch"

# Create new job config file
JOBCONFIG=$JOBDIR/scratch/brenda-job.conf
sed -e "s/\$PROJECTNAME/$PROJECTNAME/" \
    -e "s/\$JOBNAME/$JOBNAME/" \
    config/brenda-job.conf > "$JOBCONFIG"


# Add new job tasks to the queue
brenda-work --config="$JOBCONFIG" -T templates/brenda/$JOBTYPE $JOBARGS push

# Watch S3 for finished data and sync them for further processing
./scripts/brenda/job-output-sync.sh "$PROJECTNAME" "$JOBNAME" &

# (for single-frame renders) Automatically combine new frames into final output image
./scripts/brenda/job-output-combine-subframe.sh "$PROJECTNAME" "$JOBNAME" &

