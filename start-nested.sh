#!/bin/bash
echo "Starting Nested GNOME Shell..."
echo "This allows you to test the extension without restarting your main session."
echo "Press Ctrl+C in this terminal to close the nested shell."
echo "---------------------------------------------------------------"

# Set the window size for the nested shell
export MUTTER_DEBUG_DUMMY_MODE_SPECS=1280x720

# Run nested shell
dbus-run-session -- gnome-shell --nested --wayland
