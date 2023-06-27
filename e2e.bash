npx http-server packages/@dcl/inspector/public -p 8000 &
sleep 2
server_pid=$!
echo "server_pid=$server_pid"
cd ./packages/@dcl/inspector && IS_E2E=true ./../../../node_modules/.bin/jest --detectOpenHandles --colors --config ./jest.config.js
kill $server_pid
sleep 1