
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

PROTOBUF_VERSION = 3.20.1
ifeq ($(shell uname),Darwin)
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-osx-x86_64.zip
else
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-linux-x86_64.zip
endif

install: node_modules/.bin/protobuf/bin/protoc
	npm install

test:
	./node_modules/.bin/jest --testPathIgnorePatterns test/performance.spec.ts --detectOpenHandles --coverage --silent=false --verbose --colors --runInBand $(TESTARGS)

benchmark:
	./node_modules/.bin/jest --detectOpenHandles --silent=false --verbose --colors --runInBand test/performance.spec.ts

test-watch:
	./node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS)

clean:
	rm -rf dist/
	rm -rf src/components/generated

build: | clean install generate-components build-ecs
	cp -r node_modules/@dcl/protocol/ecs/components dist/proto-definitions

build-ecs:
	./../dcl-rollup/node_modules/.bin/rollup -c ./../dcl-rollup/dist/ecs.config.js

watch:
	./node_modules/.bin/tsc -p tsconfig.json -w

node_modules/.bin/protobuf/bin/protoc:
	curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v$(PROTOBUF_VERSION)/$(PROTOBUF_ZIP)
	unzip -o $(PROTOBUF_ZIP) -d node_modules/.bin/protobuf
	rm $(PROTOBUF_ZIP)
	chmod +x ./node_modules/.bin/protobuf/bin/protoc

build-tools:
	rm -rf tools/dist/
	./node_modules/.bin/tsc -p tools/tsconfig.json
	chmod +x ./tools/dist/protocol-buffer-generation/index.js

generate-components: build-tools
	./tools/dist/protocol-buffer-generation/index.js --component-path ${PWD}/src/components --definitions-path ${PWD}/node_modules/@dcl/protocol/ecs/components

.PHONY: build test clean
