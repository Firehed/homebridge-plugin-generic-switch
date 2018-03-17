.PHONY: all
all: node_modules build/index.js

build/index.js: index.js
	npm run build

node_modules: package.json package-lock.json
	npm install
	touch node_modules
