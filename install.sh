#!/bin/bash
set -euo pipefail

REPO="majorbros/mycelium"
INSTALL_DIR="${HOME}/.mycelium/bin"
BRANCH="main"

echo ""
echo "  Installing Mycelium..."
echo ""

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "${HOME}/.mycelium"

# Download scripts
for script in myc myc-watcher myc-historian myc-register; do
    echo "  Downloading ${script}..."
    curl -fsSL "https://raw.githubusercontent.com/${REPO}/${BRANCH}/bin/${script}" \
        -o "${INSTALL_DIR}/${script}"
    chmod +x "${INSTALL_DIR}/${script}"
done

# Build wait-for-idle on macOS
if [ "$(uname)" = "Darwin" ]; then
    echo "  Building wait-for-idle..."
    curl -fsSL "https://raw.githubusercontent.com/${REPO}/${BRANCH}/src/wait-for-idle.c" \
        -o "/tmp/mycelium-wait-for-idle.c"
    cc -framework CoreGraphics -o "${INSTALL_DIR}/wait-for-idle" /tmp/mycelium-wait-for-idle.c 2>/dev/null
    rm -f /tmp/mycelium-wait-for-idle.c
fi

# Add to PATH if not already there
if ! echo "$PATH" | tr ':' '\n' | grep -q "${INSTALL_DIR}"; then
    # Detect shell
    if [ -n "${ZSH_VERSION:-}" ] || [ -f "${HOME}/.zshrc" ]; then
        SHELL_RC="${HOME}/.zshrc"
    else
        SHELL_RC="${HOME}/.bashrc"
    fi
    echo "" >> "$SHELL_RC"
    echo "# Mycelium" >> "$SHELL_RC"
    echo "export PATH=\"${INSTALL_DIR}:\$PATH\"" >> "$SHELL_RC"
    echo "  Added ${INSTALL_DIR} to PATH in ${SHELL_RC}"
fi

echo ""
echo "  Mycelium installed!"
echo ""
echo "  Next steps:"
echo "    source ~/.zshrc  # or restart your terminal"
echo "    myc init         # configure and start services"
echo "    myc cultivate    # watch two agents talk"
echo ""
