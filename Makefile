
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

PROTOBUF_VERSION = 3.20.1
ifeq ($(shell uname),Darwin)
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-osx-x86_64.zip
else
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-linux-x86_64.zip
endif

PROTOC = node_modules/.bin/protobuf/bin/protoc
SCENE_PROTO_FILES := $(wildcard packages/@dcl/ecs/node_modules/@dcl/protocol/proto/decentraland/kernel/apis/*.proto)
PBS_TS = $(SCENE_PROTO_FILES:packages/@dcl/ecs/node_modules/@dcl/protocol/proto/decentraland/kernel/apis/%.proto=scripts/rpc-api-generation/src/proto/%.gen.ts)


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

TESTARGS ?= test/
test:
	node_modules/.bin/jest --detectOpenHandles --colors $(TESTARGS)

test-coverage:
	node_modules/.bin/jest --detectOpenHandles --colors --coverage $(TESTARGS)

node_modules/.bin/protobuf/bin/protoc:
	curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v$(PROTOBUF_VERSION)/$(PROTOBUF_ZIP)
	unzip -o $(PROTOBUF_ZIP) -d node_modules/.bin/protobuf
	rm $(PROTOBUF_ZIP)
	chmod +x ./node_modules/.bin/protobuf/bin/protoc

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --watch --roots "test"

build:
	make clean
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --runTestsByPath scripts/build.spec.ts

prepare:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --runTestsByPath scripts/prepare.spec.ts

scripts/rpc-api-generation/src/proto/%.gen.ts: packages/@dcl/ecs/node_modules/@dcl/protocol/proto/decentraland/kernel/apis/%.proto node_modules/.bin/protobuf/bin/protoc
	${PROTOC}  \
			--plugin=./node_modules/.bin/protoc-gen-ts_proto \
			--ts_proto_opt=esModuleInterop=true,returnObservable=false,outputServices=generic-definitions \
			--ts_proto_opt=fileSuffix=.gen \
			--ts_proto_opt=onlyTypes=true \
			--ts_proto_out="$(PWD)/scripts/rpc-api-generation/src/proto" \
			-I="$(PWD)/scripts/rpc-api-generation/src/proto" \
			-I="$(PWD)/packages/@dcl/ecs/node_modules/@dcl/protocol/proto/" \
			"$(PWD)/packages/@dcl/ecs/node_modules/@dcl/protocol/proto/decentraland/kernel/apis/$*.proto";

compile_apis: ${PBS_TS}

.PHONY: build test install

deep-clean:
	rm -rf node_modules/ packages/@dcl/amd/node_modules/ packages/@dcl/build-ecs/node_modules/ packages/@dcl/dcl-rollup/node_modules/ packages/@dcl/ecs/node_modules/ packages/@dcl/react-ecs/node_modules/  packages/@dcl/sdk/node_modules/
	make clean

clean:
	rm -rf coverage/
	rm -rf packages/@dcl/amd/dist/ packages/@dcl/build-ecs/dist/  packages/@dcl/dcl-rollup/dist/ packages/@dcl/ecs/dist/ packages/@dcl/sdk/dist/
	rm -rf packages/@dcl/ecs/src/components/generated/ packages/@dcl/ecs/temp/
	rm -rf packages/@dcl/js-runtime/apis.d.ts
	rm -rf packages/@dcl/react-ecs/dist/ packages/@dcl/react-ecs/src/generated/ packages/@dcl/react-ecs/temp/
	rm -rf packages/@dcl/sdk/package-lock.json packages/@dcl/sdk/types/env/ packages/@dcl/sdk/types/rpc-modules/
	rm -rf scripts/rpc-api-generation/src/modules/ scripts/rpc-api-generation/src/proto/
	rm -rf test/build-ecs/fixtures/dcl-test-lib-integration/bin/ test/build-ecs/fixtures/dcl-test-lib-integration/node_modules/
	rm -rf test/build-ecs/fixtures/ecs7-scene/bin/ test/build-ecs/fixtures/ecs7-scene/node_modules/
	rm -rf test/build-ecs/fixtures/rollup-lib-integration/dist/ test/build-ecs/fixtures/rollup-lib-integration/tsdoc-metadata.json
	rm -rf test/build-ecs/fixtures/simple-scene-with-bundled/bin/ test/build-ecs/fixtures/simple-scene-with-bundled/node_modules/
	rm -rf test/build-ecs/fixtures/simple-scene-with-library/bin/ test/build-ecs/fixtures/simple-scene-with-library/node_modules/
	rm -rf test/build-ecs/fixtures/simple-scene-without-installed-ecs/bin/
	rm -rf test/build-ecs/fixtures/simple-scene/bin/ test/build-ecs/fixtures/simple-scene/node_modules/
	rm -rf test/ecs/snippets/dist/