debug_log() {
  DEBUGDATE=$(date --rfc-3339=seconds)
  DEBUGDIR=$(dirname $DEBUGFILE)
  [ ! -d "$DEBUGDIR" ] && mkdir -p "$DEBUGDIR"
  DEBUGSTR="$DEBUGDATE $PROJECTNAME $JOBNAME $DEBUGNAME $@"
  echo "$DEBUGSTR" >>$DEBUGFILE
  echo "$DEBUGSTR"
}

