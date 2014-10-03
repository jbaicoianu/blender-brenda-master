#!/bin/sh

JOBNAME=$1

if [ ! -d "frames/$JOBNAME/" ]; then
	mkdir -p "frames/$JOBNAME/"
fi
watch --interval 10 s3cmd sync s3://elation-render-output/$JOBNAME/ frames/$JOBNAME/
