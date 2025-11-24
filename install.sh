#!/bin/bash

UUID="simple-extension@example.com"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

echo "Installing extension to $DEST..."

mkdir -p "$DEST"
cp -r ./* "$DEST"

echo "Extension installed!"
echo "Please restart GNOME Shell (Alt+F2, then type 'r' and Enter on X11, or logout/login on Wayland)."
echo "Then enable the extension using 'gnome-extensions-app' or 'gnome-extensions enable $UUID'."
