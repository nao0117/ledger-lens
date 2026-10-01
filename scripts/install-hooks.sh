#!/bin/sh
# scripts/pre-commit を .git/hooks に配置する（husky を使わずに済ませるため）
set -e
root=$(git rev-parse --show-toplevel)
cp "$root/scripts/pre-commit" "$root/.git/hooks/pre-commit"
chmod +x "$root/.git/hooks/pre-commit"
echo "pre-commit フックを配置しました。"
