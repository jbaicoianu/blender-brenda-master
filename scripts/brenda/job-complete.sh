#!/bin/sh

PROJECTROOT=/mnt/projects

PROJECTNAME=$1
JOBNAME=$2

JOBDIR=$PROJECTROOT/$PROJECTNAME/jobs/$JOBNAME

DEBUGNAME=complete
DEBUGFILE=$JOBDIR/scratch/log
. ./scripts/brenda/job-debug.sh

if [ -d "$JOBDIR" ]; then
  if [ ! -f "$JOBDIR/scratch/DONE" ]; then
    touch "$JOBDIR/scratch/DONE"
    debug_log "Marking job '$JOBNAME' of project '$PROJECTNAME' as complete"
  else
    debug_log "Job already marked as complete, doing nothing"
  fi
else
  # duh - can't log here because we don't have a JOBDIR, so just echo the error
  #debug_log "ERROR - couldn't find job '$JOBNAME' of project '$PROJECTNAME' , can't mark as complete"
  echo "ERROR - couldn't find job '$JOBNAME' of project '$PROJECTNAME', can't mark as complete"
fi
