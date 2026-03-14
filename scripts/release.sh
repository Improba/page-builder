#!/usr/bin/env bash
set -euo pipefail

# Release script for @improba/page-builder.
# Bumps version (major/minor/patch), commits, creates tag release-vX.Y.Z, pushes branch and tag.
# Usage: ./scripts/release.sh [major|minor|patch]   (default: patch)

BUMP="${1:-patch}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

case "$BUMP" in
  major|minor|patch) ;;
  *)
    echo "Usage: $0 [major|minor|patch]" >&2
    echo "  default: patch" >&2
    exit 1
    ;;
esac

if ! grep -q '"name": "@improba/page-builder"' package.json 2>/dev/null; then
  echo "Error: run from repository root (package.json must be @improba/page-builder)." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree is not clean. Commit or stash changes first." >&2
  exit 1
fi

echo "Bumping version ($BUMP)..."
npm version "$BUMP" --no-git-tag-version
VERSION=$(node -p "require('./package.json').version")
TAG="release-v${VERSION}"

echo "Version is now $VERSION. Committing and tagging $TAG..."
git add package.json package-lock.json
git commit -m "chore(release): $TAG"
git tag "$TAG"

echo "Pushing branch and tag..."
git push origin HEAD
git push origin "$TAG"

echo "Done. Tag $TAG pushed; CI will run quality gate and publish to npm."
