
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

install:
	@npm i
	@cd packages/build-ecs; npm i
	@cd packages/decentraland-amd; npm i

test: build
	node_modules/.bin/jest --forceExit --detectOpenHandles --coverage --verbose

test-watch: build
	node_modules/.bin/jest --forceExit --detectOpenHandles --coverage --verbose --watch

build:
	# @echo "> Building: build-ecs..."
	# @cd packages/build-ecs; ../../node_modules/.bin/tsc -p tsconfig.json

	@echo "> Building: decentraland-amd..."
	@cd packages/decentraland-amd; npm run build

.PHONY: build test install
