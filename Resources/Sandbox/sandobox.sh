#!/bin/bash

to=$1
shift

if type timeout > /dev/null 2>&1; then
  timeoutCommand='timeout'
else
  timeoutCommand='gtimeout'
fi

# 10MB file size limit
# 10 processes limit
# 20% CPU usage
containerId=$(docker run --rm --detach --ulimit fsize=10000000:10000000 --pids-limit 10 --cpus="0.2" "$@")
status=$($timeoutCommand "$to" docker wait "$containerId" || true)
docker kill $containerId &> /dev/null

statusFile="${2%:/\[REDACTED]}/status"
/bin/echo -n "status: " > "$statusFile"
if [ -z "$status" ]; then
  /bin/echo 'timeout' >> "$statusFile"
else
  /bin/echo "exited($status)" >> "$statusFile"
fi

docker logs $containerId | sed 's/^/\t/'
docker rm $containerId &> /dev/null
