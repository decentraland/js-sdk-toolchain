
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

PROTOBUF_VERSION = 3.20.1
ifeq ($(shell uname),Darwin)
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-osx-x86_64.zip
else
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-linux-x86_64.zip
endif

install:
	npm i
	make node_modules/.bin/protobuf/bin/protoc
	cd packages/@dcl/build-ecs; npm ci
	cd packages/@dcl/dcl-rollup; npm ci
	cd packages/@dcl/amd; npm ci
	cd packages/@dcl/ecs; make install

lint:
	node_modules/.bin/eslint . --ext .ts

lint-fix:
	node_modules/.bin/eslint . --ext .ts --fix

test:
	node_modules/.bin/jest --detectOpenHandles --coverage  --colors --roots "test" $(TESTARGS)

node_modules/.bin/protobuf/bin/protoc:
	curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v$(PROTOBUF_VERSION)/$(PROTOBUF_ZIP)
	unzip -o $(PROTOBUF_ZIP) -d node_modules/.bin/protobuf
	rm $(PROTOBUF_ZIP)
	chmod +x ./node_modules/.bin/protobuf/bin/protoc

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --watch --roots "test"

build:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --runTestsByPath scripts/build.spec.ts

prepare:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --runTestsByPath scripts/prepare.spec.ts

.PHONY: build test install
