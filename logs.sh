#!/bin/bash
echo "Monitoring logs for 'Simple Extension' and GNOME Shell errors..."
echo "Press Ctrl+C to stop."
echo "---------------------------------------------------------------"
journalctl -f -o cat | grep --line-buffered -E "gnome-shell|Simple Extension|simple-extension"
