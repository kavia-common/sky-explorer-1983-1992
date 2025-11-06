#!/bin/bash
cd /home/kavia/workspace/code-generation/sky-explorer-1983-1992/three_js_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

