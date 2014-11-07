debug_log() {
  DEBUGDATE=$(date --rfc-3339=ns)
  DEBUGDIR=$(dirname $DEBUGFILE)
  [ ! -d "$DEBUGDIR" ] && mkdir -p "$DEBUGDIR"
  echo "$DEBUGDATE\t$DEBUGNAME\t$@" >>$DEBUGFILE
  #echo "$DEBUGDATE\t$DEBUGNAME\t$@"
}

