#!/bin/sh

JOBNAME=$1

watch --interval 10 s3cmd sync s3://elation-render-output/$JOBNAME/ frames/$JOBNAME/
