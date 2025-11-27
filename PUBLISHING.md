# Publishing Guide: pgn-chess-tree

This guide explains how to publish `pgn-chess-tree` to npm.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-publish Checklist](#pre-publish-checklist)
3. [Publishing to npm](#publishing-to-npm)
4. [Version Management](#version-management)
5. [Publishing Updates](#publishing-updates)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### npm Account

1. Create an account at [npmjs.com](https://www.npmjs.com/signup)
2. Verify your email address
3. (Optional) Enable 2FA for security

### Login to npm

```bash
npm login
# Enter username, password, and email
# If 2FA enabled, enter OTP code

# Verify you're logged in
npm whoami
```

### Node.js & npm

```bash
# Check versions
node --version   # Should be 16+
npm --version    # Should be 8+
```

---

## Pre-publish Checklist

Before publishing, ensure everything is ready:

### 1. Update package.json

Edit `package.json` to set your details:

```json
{
  "name": "pgn-chess-tree",
  "version": "1.0.0",
  "description": "Python-chess compatible game tree API for PGN parsing",
  "author": "Zilin Du <zilin.du@gmail.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/zilin/pgn-chess-tree.git"
  },
  "bugs": {
    "url": "https://github.com/zilin/pgn-chess-tree/issues"
  },
  "homepage": "https://github.com/zilin/pgn-chess-tree#readme"
}
```

### 2. Check Package Name Availability

```bash
npm search pgn-chess-tree
# or
npm view pgn-chess-tree
# Should return 404 if name is available
```

If the name is taken, choose a different name or use a scoped package:
```json
{
  "name": "@zilin/pgn-chess-tree"
}
```

### 3. Build the Package

```bash
npm run build
```

Verify build output:
```bash
ls lib/
# Should show: index.js, index.d.ts, chess/, pgn/
```

### 4. Run Tests

```bash
npm test
```

All tests should pass.

### 5. Check What Will Be Published

```bash
npm pack --dry-run
```

This shows what files will be included. Should include:
- `lib/` (compiled JavaScript)
- `README.md`
- `package.json`

Should NOT include:
- `src/` (TypeScript source)
- `test/`
- `node_modules/`

### 6. Verify .npmignore

Check `.npmignore` excludes unnecessary files:

```
# Source files (use lib/)
src/

# Tests
test/

# TypeScript config
tsconfig*.json

# Development files
.gitignore
.editorconfig
```

### 7. Test Local Installation

```bash
# Create a tarball
npm pack

# In another directory, test installing it
cd /tmp
mkdir test-install && cd test-install
npm init -y
npm install /path/to/pgn-chess-tree-1.0.0.tgz

# Test it works
node -e "const { readGame } = require('pgn-chess-tree'); console.log(typeof readGame);"
# Should print: function
```

---

## Publishing to npm

### First-time Publish

```bash
# Final build and test
npm run build
npm test

# Publish!
npm publish
```

For scoped packages (`@username/pgn-chess-tree`), add `--access public`:
```bash
npm publish --access public
```

### Verify Publication

```bash
# Check on npm
npm view pgn-chess-tree

# Or visit
# https://www.npmjs.com/package/pgn-chess-tree
```

---

## Version Management

### Semantic Versioning

Follow [semver](https://semver.org/):
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

### Bumping Version

```bash
# Patch release (bug fixes)
npm version patch
# 1.0.0 → 1.0.1

# Minor release (new features)
npm version minor
# 1.0.0 → 1.1.0

# Major release (breaking changes)
npm version major
# 1.0.0 → 2.0.0

# Pre-release
npm version prerelease --preid=beta
# 1.0.0 → 1.0.1-beta.0
```

This automatically:
1. Updates `package.json` version
2. Creates a git commit (if in git repo)
3. Creates a git tag

### Manual Version Update

Edit `package.json`:
```json
{
  "version": "1.1.0"
}
```

---

## Publishing Updates

### Standard Release Process

```bash
# 1. Make your changes
# 2. Update tests
# 3. Run tests
npm test

# 4. Build
npm run build

# 5. Bump version
npm version patch  # or minor/major

# 6. Publish
npm publish

# 7. Push git tags (if using git)
git push --tags
```

### Publishing a Beta/Pre-release

```bash
# Bump to beta version
npm version prerelease --preid=beta
# Creates: 1.0.1-beta.0

# Publish with beta tag
npm publish --tag beta

# Users install with:
# npm install pgn-chess-tree@beta
```

### Publishing from CI/CD

For automated publishing (GitHub Actions, etc.):

1. Create npm token: npmjs.com → Account → Access Tokens → Generate
2. Add to CI secrets as `NPM_TOKEN`
3. In CI:
```bash
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
npm publish
```

---

## Troubleshooting

### "You must be logged in to publish"

```bash
npm login
```

### "Package name already exists"

Choose a different name or use scoped package:
```json
{
  "name": "@your-username/pgn-chess-tree"
}
```

### "You do not have permission to publish"

You're trying to update someone else's package. Check the package name.

### "Cannot publish over existing version"

You must bump the version before publishing again:
```bash
npm version patch
npm publish
```

### "Package is too large"

Check what's being included:
```bash
npm pack --dry-run
```

Add unnecessary files to `.npmignore`.

### "Missing README"

Ensure `README.md` exists in the package root.

### "402 Payment Required" (Scoped Package)

Scoped packages are private by default. Publish as public:
```bash
npm publish --access public
```

Or set in `package.json`:
```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

### Testing Before Publish

Use `npm link` to test locally:

```bash
# In package directory
npm link

# In a test project
cd /path/to/test-project
npm link pgn-chess-tree

# Now you can import and test
```

---

## Quick Reference

### First-time Setup

```bash
npm login
```

### Publish Workflow

```bash
# Build and test
npm run build
npm test

# Check what will be published
npm pack --dry-run

# Bump version
npm version patch  # or minor/major

# Publish
npm publish

# Push tags
git push --tags
```

### Useful Commands

```bash
# Check login status
npm whoami

# View package info
npm view pgn-chess-tree

# See all versions
npm view pgn-chess-tree versions

# Unpublish (within 72 hours only!)
npm unpublish pgn-chess-tree@1.0.0

# Deprecate a version
npm deprecate pgn-chess-tree@1.0.0 "Use 1.0.1 instead"
```

### Package Files

```
pgn-chess-tree/
├── package.json      # Package metadata (published)
├── README.md         # Documentation (published)
├── lib/              # Built JavaScript (published)
├── .npmignore        # Files to exclude from publish
│
├── src/              # TypeScript source (NOT published)
├── test/             # Tests (NOT published)
└── node_modules/     # Dependencies (NOT published)
```
