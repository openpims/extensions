#!/bin/bash

# Fix macOS Info.plist - Add LSApplicationCategoryType
# Required for App Store submission

PLIST=".output/safari-app/OpenPIMS/macOS (App)/Info.plist"

if [ -f "$PLIST" ]; then
    echo "Adding LSApplicationCategoryType to macOS App Info.plist..."
    /usr/libexec/PlistBuddy -c "Add :LSApplicationCategoryType string public.app-category.utilities" "$PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :LSApplicationCategoryType public.app-category.utilities" "$PLIST"
    echo "✅ LSApplicationCategoryType set to: public.app-category.utilities"
else
    echo "❌ Error: Info.plist not found at $PLIST"
    exit 1
fi
