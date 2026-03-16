.PHONY: build install clean

PREFIX ?= $(HOME)/.mycelium/bin

build:
	@echo "Building wait-for-idle (macOS only)..."
	cc -framework CoreGraphics -o bin/wait-for-idle src/wait-for-idle.c
	@echo "Done."

install: build
	@echo "Installing to $(PREFIX)..."
	mkdir -p $(PREFIX)
	cp bin/myc bin/myc-watcher bin/myc-historian bin/myc-register $(PREFIX)/
	[ -f bin/wait-for-idle ] && cp bin/wait-for-idle $(PREFIX)/ || true
	chmod +x $(PREFIX)/myc $(PREFIX)/myc-watcher $(PREFIX)/myc-historian $(PREFIX)/myc-register
	@echo ""
	@echo "Add to your PATH: export PATH=\"$(PREFIX):\$$PATH\""
	@echo "Then run: myc init"

clean:
	rm -f bin/wait-for-idle
