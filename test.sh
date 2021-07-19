curl --silent -i -X POST "https://swiftfiddle.com/run" \
  -H "Content-Type:application/json" \
  --data '{"code":"print(\"Hello, World!\")","toolchain_version":"latest"}'
curl --silent -i -X POST "https://swiftfiddle.com/run" \
  -H "Content-Type:application/json" \
  --data '{"code":"print(\"Hello, World!\")","toolchain_version":"stable"}'

versions=$(curl --silent -X GET "https://swiftfiddle.com/versions" -H "Content-Type:application/json")
len=$(echo $versions | jq length)
for i in $( seq 0 $(($len - 1)) ); do
  version=$(echo $versions | jq .[$i])
  curl --silent -i -X POST "https://swiftfiddle.com/run" \
    -H "Content-Type:application/json" \
    --data "{\"code\":\"print(\\\"Hello, World!\\\")\",\"toolchain_version\":$version}"
done
