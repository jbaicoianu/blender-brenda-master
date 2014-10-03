#!/bin/sh

#FIXME - yeah, obviously
DBUSER=root
DBPASS=root
DBHOST=localhost:8086
DATABASE=brenda_jobs

JOBCOUNT=$(brenda-work status |cut -d ' ' -f 3)
#INSTANCECOUNT=$(brenda-run status |grep 'Status: fulfilled' |wc -l)
INSTANCECOUNT=$(brenda-tool instances | wc -l)
PAYLOAD=$(sed -e "s/JOBCOUNT/$JOBCOUNT/" -e "s/INSTANCECOUNT/$INSTANCECOUNT/" templates/influxdb/counts)

echo $PAYLOAD
echo $PAYLOAD |POST "http://$DBHOST/db/$DATABASE/series?u=$DBUSER&p=$DBPASS"

