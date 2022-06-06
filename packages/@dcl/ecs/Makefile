
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
	npm install
	make install_protobuffer_compiler

test:
	./node_modules/.bin/jest --testPathIgnorePatterns test/performance.spec.ts --detectOpenHandles --coverage --silent=false --verbose --colors --runInBand $(TESTARGS)

benchmark:
	./node_modules/.bin/jest --detectOpenHandles --silent=false --verbose --colors --runInBand test/performance.spec.ts

test-watch:
	./node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS)

build:
	rm -rf dist/
	make generate-components
	make build-ecs
	cp -r src/components/definitions dist/proto-definitions

build-ecs:
	./node_modules/.bin/rollup -c ./node_modules/@dcl/dcl-rollup/ecs.config.js


watch:
	./node_modules/.bin/tsc -p tsconfig.json -w

lint:
	./node_modules/.bin/eslint . --ext .ts

lint-fix:
	./node_modules/.bin/eslint . --ext .ts --fix

install_protobuffer_compiler:
	curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v$(PROTOBUF_VERSION)/$(PROTOBUF_ZIP)
	unzip -o $(PROTOBUF_ZIP) -d node_modules/.bin/protobuf
	rm $(PROTOBUF_ZIP)
	chmod +x ./node_modules/.bin/protobuf/bin/protoc

build-tools:
	rm -rf tools/dist/
	./node_modules/.bin/tsc -p tools/tsconfig.json
	chmod +x ./tools/dist/check-proto-compatibility/index.js
	chmod +x ./tools/dist/protocol-buffer-generation/index.js

generate-components:
	make build-tools
	./tools/dist/protocol-buffer-generation/index.js --component-path ${PWD}/src/components

test-components-compatibility:
	./tools/dist/check-proto-compatibility/index.js --definitions-path ${PWD}/src/components/definitions

.PHONY: build test
