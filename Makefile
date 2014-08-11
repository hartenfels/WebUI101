dist/web_ui.js: web_ui.coffee
	coffee -o dist -c web_ui.coffee

clean:
	rm dist/web_ui.js

.PHONY: all clean
