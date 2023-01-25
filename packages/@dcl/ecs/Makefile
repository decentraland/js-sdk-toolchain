
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

clean:
	rm -rf dist/
	rm -rf src/components/generated

watch:
	./node_modules/.bin/tsc -p tsconfig.json -w

.PHONY: build test clean
