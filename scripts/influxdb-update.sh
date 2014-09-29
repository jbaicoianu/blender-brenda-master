#!/bin/sh

#FIXME - yeah, obviously
USER=root
PASS=root
HOST=localhost:8086
DATABASE=brenda_jobs

JOBCOUNT=$(brenda-work status |cut -d ' ' -f 3)
INSTANCECOUNT=$(brenda-run status |grep 'Status: fulfilled' |wc -l)
PAYLOAD=$(sed -e "s/JOBCOUNT/$JOBCOUNT/" -e "s/INSTANCECOUNT/$INSTANCECOUNT/" templates/influxdb/counts)

echo $PAYLOAD
echo $PAYLOAD |POST "http://localhost:8086/db/$DATABASE/series?u=$USER&p=$PASS"
