
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

install:
	npm install

clean:
	rm -rf dist/
	rm -rf src/components/generated

watch:
	./node_modules/.bin/tsc -p tsconfig.json -w

.PHONY: build test clean
