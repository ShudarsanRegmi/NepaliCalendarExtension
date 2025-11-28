#!/bin/bash

echo "Testing improved dropdown extension..."

# Disable if running
gnome-extensions disable simple-gnome-extension@antigravity 2>/dev/null

# Copy files
cp -r . ~/.local/share/gnome-shell/extensions/simple-gnome-extension@antigravity/

# Enable extension
gnome-extensions enable simple-gnome-extension@antigravity

echo "Extension enabled! Check the top panel for the 🇳🇵 icon."
echo "Click on it and test the month and year dropdowns."
echo ""
echo "To see logs, run:"
echo "journalctl -f -o cat /usr/bin/gnome-shell | grep NepaliCalendar"
