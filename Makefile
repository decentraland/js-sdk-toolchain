
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

PROTOBUF_VERSION = 3.20.1
ifeq ($(shell uname),Darwin)
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-osx-x86_64.zip
else
ifeq ($(shell arch),aarch64)
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-linux-aarch_64.zip
else
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-linux-x86_64.zip
endif
endif

SED_OPTION = -i
ifeq ($(shell uname),Darwin)
SED_OPTION=-i ""
endif

PROTOC = node_modules/.bin/protobuf/bin/protoc
SCENE_PROTO_FILES := $(wildcard node_modules/@dcl/protocol/proto/decentraland/kernel/apis/*.proto)
PBS_TS = $(SCENE_PROTO_FILES:node_modules/@dcl/protocol/proto/decentraland/kernel/apis/%.proto=scripts/rpc-api-generation/src/proto/%.gen.ts)


install:
	npm i
	make node_modules/.bin/protobuf/bin/protoc

lint:
	node_modules/.bin/eslint . --ext .ts

lint-fix:
	node_modules/.bin/syncpack format --config .syncpackrc.json  --source "packages/@dcl/*/package.json" --source "package.json"
	node_modules/.bin/syncpack fix-mismatches --config .syncpackrc.jsonnode_modules/.bin/syncpack format --config .syncpackrc.json --source "packages/@dcl/*/package.json" --source "package.json"
	node_modules/.bin/eslint . --ext .ts --fix

TESTARGS ?= test/
test:
	node_modules/.bin/jest --detectOpenHandles --colors $(TESTARGS)

test-cli:
	@rm -rf tmp
	@mkdir -p tmp/scene
	cd tmp/scene; $(PWD)/packages/@dcl/sdk-commands/dist/index.js init

test-coverage:
	WITH_COVERAGE=true node_modules/.bin/jest --detectOpenHandles --colors --coverage $(TESTARGS)

recreate-test-scene:
	@rm -rf tmp/scene || true
	mkdir -p tmp/scene
	cd tmp/scene; ../../packages/@dcl/sdk/dist/index.js init --skip-install
	cd tmp/scene; npm install ../../packages/@dcl/sdk ../../packages/@dcl/sdk-commands ../../packages/@dcl/js-runtime
	cd tmp/scene; npm run build
	cd tmp/scene; ../../packages/@dcl/sdk/dist/index.js export-static --destination ../static --timestamp 1676821392357
	cd tmp/scene; npm run start

node_modules/.bin/protobuf/bin/protoc:
	curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v$(PROTOBUF_VERSION)/$(PROTOBUF_ZIP)
	unzip -o $(PROTOBUF_ZIP) -d node_modules/.bin/protobuf
	rm $(PROTOBUF_ZIP)
	chmod +x ./node_modules/.bin/protobuf/bin/protoc

docs:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --runTestsByPath scripts/docs.spec.ts
# Cloudflare doesn't allow a directory called functions. 🪄🎩
	mv api-docs/functions api-docs/funcs
	find ./api-docs -type f -name '*.html' \
  | xargs sed ${SED_OPTION} -E 's:(href="[^"]+)functions/:\1funcs/:g'

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --watch --roots "test"

build:
	make clean
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --runTestsByPath scripts/build.spec.ts

prepare:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --runTestsByPath scripts/prepare.spec.ts

lint-packages:
	node_modules/.bin/syncpack list-mismatchesnode_modules/.bin/syncpack format --config .syncpackrc.json  --source "packages/@dcl/*/package.json" --source "package.json"

scripts/rpc-api-generation/src/proto/%.gen.ts: node_modules/@dcl/protocol/proto/decentraland/kernel/apis/%.proto node_modules/.bin/protobuf/bin/protoc
	@${PROTOC}  \
			--plugin=./node_modules/.bin/protoc-gen-ts_proto \
			--ts_proto_opt=esModuleInterop=true,returnObservable=false,outputServices=generic-definitions \
			--ts_proto_opt=fileSuffix=.gen \
			--ts_proto_opt=onlyTypes=true \
			--ts_proto_out="$(PWD)/scripts/rpc-api-generation/src/proto" \
			-I="$(PWD)/scripts/rpc-api-generation/src/proto" \
			-I="$(PWD)/node_modules/@dcl/protocol/proto/" \
			"$(PWD)/node_modules/@dcl/protocol/proto/decentraland/kernel/apis/$*.proto";

compile_apis: ${PBS_TS}

deep-clean-and-snapshot:
	git clean -fxd
	make install
	make lint-fix
	make build
	make update-snapshots 

.PHONY: build test install docs deep-clean-and-snapshot update-snapshots lint-packages

deep-clean:
	rm -rf node_modules/ \
		packages/@dcl/ecs/node_modules/ \
		packages/@dcl/react-ecs/node_modules/ \
		packages/@dcl/sdk/node_modules/ \
		packages/@dcl/inspector/node_modules/
	make clean

update-snapshots: export UPDATE_SNAPSHOTS=true
update-snapshots: test

clean:
	@echo "> Cleaning all folders"
	@rm -rf coverage/
	@rm -rf packages/@dcl/sdk/*.js packages/@dcl/sdk/*.d.ts packages/@dcl/sdk/internal
	@rm -rf packages/@dcl/inspector/public/*.js packages/@dcl/inspector/public/*.d.ts packages/@dcl/inspector/public/*.map packages/@dcl/inspector/public/*.css
	@rm -rf packages/@dcl/ecs/dist/ packages/@dcl/sdk/dist/
	@rm -rf packages/@dcl/sdk-commands/dist
	@rm -rf packages/@dcl/ecs/src/components/generated/ packages/@dcl/ecs/temp/
	@rm -rf packages/@dcl/js-runtime/apis.d.ts
	@rm -rf packages/@dcl/react-ecs/dist/ packages/@dcl/react-ecs/src/generated/ packages/@dcl/react-ecs/temp/
	@rm -rf packages/@dcl/sdk/package-lock.json packages/@dcl/sdk/types/env/ packages/@dcl/sdk/types/rpc-modules/
	@rm -rf scripts/rpc-api-generation/src/modules/ scripts/rpc-api-generation/src/proto/
	@rm -rf test/build-ecs/fixtures/dcl-test-lib-integration/bin/ test/build-ecs/fixtures/dcl-test-lib-integration/node_modules/
	@rm -rf test/build-ecs/fixtures/ecs7-scene/bin/ test/build-ecs/fixtures/ecs7-scene/node_modules/
	@rm -rf test/build-ecs/fixtures/simple-scene-with-bundled/bin/ test/build-ecs/fixtures/simple-scene-with-bundled/node_modules/
	@rm -rf test/build-ecs/fixtures/simple-scene-with-library/bin/ test/build-ecs/fixtures/simple-scene-with-library/node_modules/
	@rm -rf test/build-ecs/fixtures/simple-scene/bin/ test/build-ecs/fixtures/simple-scene/node_modules/
	@rm -rf test/ecs/snippets/dist/
