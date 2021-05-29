
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

install:
	npm i
	cd packages/build-ecs; npm ci
	cd packages/@dcl/rollup-config; npm ci
	cd packages/decentraland-amd; npm ci
	cd packages/decentraland-ecs; npm ci

test: build
	node_modules/.bin/jest --forceExit --detectOpenHandles --coverage --verbose

test-watch: build
	node_modules/.bin/jest --forceExit --detectOpenHandles --coverage --verbose --watch

build:
	@echo "> Building: build-ecs..."
	@cd packages/build-ecs; $(PWD)/node_modules/.bin/tsc -p tsconfig.json

	@echo "> Building: decentraland-amd..."
	@cd packages/decentraland-amd; $(PWD)/node_modules/.bin/tsc -p tsconfig.json && $(PWD)/packages/@dcl/rollup-config/node_modules/.bin/terser --mangle --comments some --source-map -o dist/amd.min.js dist/amd.js

	@echo "> Building: @dcl/rollup-config..."
	cd packages/@dcl/rollup-config; npm run build

	@echo "> Building: decentraland-ecs..."
	cd packages/decentraland-ecs; $(PWD)/packages/@dcl/rollup-config/node_modules/.bin/rollup -c $(PWD)/packages/@dcl/rollup-config/ecs.config.js
	rm -rf packages/decentraland-ecs/artifacts || true
	mkdir packages/decentraland-ecs/artifacts
	cp packages/build-ecs/index.js packages/decentraland-ecs/artifacts/build-ecs.js
	cp packages/decentraland-amd/dist/* packages/decentraland-ecs/artifacts

.PHONY: build test install build-decentraland-ecs
