debug_log() {
  DEBUGDATE=$(date --rfc-3339=seconds)
  DEBUGDIR=$(dirname $DEBUGFILE)
  [ ! -d "$DEBUGDIR" ] && mkdir -p "$DEBUGDIR"
  DEBUGSTR="$DEBUGDATE\t$PROJECTNAME\t$JOBNAME\t$DEBUGNAME\t$@"
  echo "$DEBUGSTR" >>$DEBUGFILE
  echo "$DEBUGSTR"
}

