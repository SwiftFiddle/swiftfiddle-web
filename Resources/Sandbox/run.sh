#!/bin/bash
set -e

to=$1
shift

if type timeout > /dev/null 2>&1; then
    timeoutCommand='timeout'
else
    timeoutCommand='gtimeout'
fi

containerId=$(docker run --rm -d "$@")
status=$($timeoutCommand "$to" docker wait "$containerId" || true)
docker kill $containerId &> /dev/null
echo -n 'status: '
if [ -z "$status" ]; then
    echo 'timeout'
else
    echo "exited: $status"
fi

docker logs $containerId | sed 's/^/\t/'
docker rm $containerId &> /dev/null
