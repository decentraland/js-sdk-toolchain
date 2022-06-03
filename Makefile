
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

install:
	npm i
	cd packages/@dcl/build-ecs; npm ci
	cd packages/@dcl/dcl-rollup; npm ci
	cd packages/@dcl/amd; npm ci
	cd packages/@dcl/legacy-ecs; npm ci
	cd packages/@dcl/ecs; make install

lint:
	node_modules/.bin/eslint . --ext .ts

lint-fix:
	node_modules/.bin/eslint . --ext .ts --fix

test:
	node_modules/.bin/jest --detectOpenHandles --colors --roots "test"
	cd packages/@dcl/ecs; make test

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --watch --roots "test"

build:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --runTestsByPath scripts/build.spec.ts

prepare:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --runTestsByPath scripts/prepare.spec.ts

.PHONY: build test install
