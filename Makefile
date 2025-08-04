
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
INSPECTOR_PATH = packages/@dcl/inspector
CH_PATH = packages/@dcl/creator-hub
TSC = node_modules/.bin/tsc
ESLINT = node_modules/.bin/eslint
SYNC_PACK = node_modules/.bin/syncpack
JEST = node_modules/.bin/jest

# this DEVELOPER_MODE is important to not send developer's events to the same segment
# stream as the production ones. Look for it's usage on the analytics component
export DEVELOPER_MODE=true

install:
	npm i --silent
	make install-protobuf

update-protocol:
	npm i --save-exact @dcl/protocol@next
	cd packages/@dcl/sdk-commands; npm i --save-exact @dcl/protocol@next
	$(MAKE) sync-deps compile_apis

update-renderer:
	cd packages/@dcl/sdk; npm i --save-exact @dcl/explorer@latest

lint:
	$(ESLINT) . --ext .ts,.tsx,.js,.json --fix

typecheck:
	make typecheck-creator-hub

typecheck-creator-hub:
	cd $(CH_PATH); npm run typecheck

sync-deps:
	$(SYNC_PACK) format --config .syncpackrc.json --source "packages/*/package.json" --source "package.json"
	$(SYNC_PACK) fix-mismatches --config .syncpackrc.json --source "packages/*/package.json" --source "package.json"

lint-packages:
	$(SYNC_PACK) list-mismatches --config .syncpackrc.json  --source "packages/*/package.json" --source "package.json"
	$(SYNC_PACK) format --config .syncpackrc.json  --source "packages/*/package.json" --source "package.json"

lint-fix: sync-deps
	node_modules/.bin/eslint . --ext .ts,.tsx --fix

test:
	node_modules/.bin/jest --detectOpenHandles --colors test/
	make test-inspector
	make test-creator-hub

TESTARGS ?= test/
test-ecs:
	node_modules/.bin/jest --detectOpenHandles --colors $(TESTARGS)

test-inspector:
	cd ./packages/@dcl/inspector/; TS_JEST_TRANSFORMER=true ./../../../node_modules/.bin/jest --coverage --detectOpenHandles --colors --config ./jest.config.js $(FILES)

test-inspector-e2e:
	cd ./packages/@dcl/inspector/; IS_E2E=true ./../../../node_modules/.bin/jest --detectOpenHandles --colors --config ./jest.config.js

test-creator-hub:
	cd $(CH_PATH); npm run test

test-coverage:
	node_modules/.bin/jest --detectOpenHandles --colors --coverage $(TESTARGS)

format:
	npx prettier --write "**/*.{js,ts,tsx,json}"

install-protobuf:
	curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v$(PROTOBUF_VERSION)/$(PROTOBUF_ZIP)
	unzip -o $(PROTOBUF_ZIP) -d node_modules/.bin/protobuf
	rm $(PROTOBUF_ZIP)
	chmod +x $(PROTOC)

docs: | install build
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --runTestsByPath scripts/docs.spec.ts
# Cloudflare doesn't allow a directory called functions. 🪄🎩
	mv api-docs/functions api-docs/funcs
# copy inspector
	cp -r packages/@dcl/inspector/public api-docs/inspector
# big files need to be removed for cloudflare pages
	rm api-docs/inspector/bundle.js.map
# replace the paths of /functions to /funcs
	find ./api-docs -type f -name '*.html' \
  	| xargs sed ${SED_OPTION} -E 's:(href="[^"]+)functions/:\1funcs/:g'

build:
	make clean
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --runTestsByPath scripts/build.spec.ts

prepare:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --runTestsByPath scripts/prepare.spec.ts

scripts/rpc-api-generation/src/proto/%.gen.ts: node_modules/@dcl/protocol/proto/decentraland/kernel/apis/%.proto node_modules/.bin/protobuf/bin/protoc
	@${PROTOC}  \
			--plugin=./node_modules/.bin/protoc-gen-dcl_ts_proto \
			--dcl_ts_proto_opt=esModuleInterop=true,returnObservable=false,outputServices=generic-definitions \
			--dcl_ts_proto_opt=fileSuffix=.gen \
			--dcl_ts_proto_opt=onlyTypes=true \
			--dcl_ts_proto_out="$(PWD)/scripts/rpc-api-generation/src/proto" \
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
		packages/@dcl/sdk-commands/node_modules \
		packages/@dcl/inspector/node_modules/ \
		packages/@dcl/creator-hub/node_modules/
	make clean

update-snapshots: export UPDATE_SNAPSHOTS=true
update-snapshots: test

clean:
	@echo "> Cleaning all folders"
	@rm -rf coverage/
	@rm -rf packages/@dcl/sdk/*.js packages/@dcl/sdk/*.d.ts packages/@dcl/sdk/internal packages/@dcl/sdk/testing
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
	@rm -rf $(CH_PATH)/node_modules/
	@rm -rf $(CH_PATH)/main/dist/
	@rm -rf $(CH_PATH)/preload/dist/
	@rm -rf $(CH_PATH)/renderer/dist/
