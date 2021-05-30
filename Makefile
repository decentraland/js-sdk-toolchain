
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

install:
	npm i
	cd packages/@dcl/build-ecs; npm ci
	cd packages/@dcl/dcl-rollup; npm ci
	cd packages/@dcl/amd; npm ci
	cd packages/decentraland-ecs; npm i

test:
	node_modules/.bin/jest --forceExit --detectOpenHandles --colors --coverage --verbose --roots "test"

test-watch:
	node_modules/.bin/jest --forceExit --detectOpenHandles --colors --coverage --verbose --watch --roots "test"

build:
	node_modules/.bin/jest --forceExit --detectOpenHandles --colors --verbose --runInBand --runTestsByPath scripts/build.spec.ts

release:
	node_modules/.bin/jest --forceExit --detectOpenHandles --colors --verbose --runInBand --runTestsByPath scripts/prepare.spec.ts

.PHONY: build test install
