# Project Rules & Constraints: Monopoly / World Tycoon

## Build & Recompilation Guidelines
- **DO NOT** automatically recompile binaries, packages, or distributions (`build_exe.ps1`, `build_zip.ps1`, `build_mac.ps1`, `build_all.ps1`, `package_distribution.ps1`, etc.) after making code modifications.
- **DO NOT** execute production builds (`npm run build`) repeatedly or unprompted during incremental code editing, unless specifically instructed or strictly required for a final release check.
- Only compile executables or build release archives when explicitly and directly commanded by the user.

## Version Control & Git Operations
- **DO NOT** repeatedly commit or push files to the repository.
- **DO NOT** run `git commit` or `git push` automatically after completing tasks.
- Keep modifications staged or unstaged in the local working tree and wait for the user's explicit instruction to commit or push.

## Debug Mode & CI Release Policy
- **GitHub Actions Builds / Production Packages**: Debug mode must **NEVER** be accessible or visible in GitHub Actions builds or distributed binaries (`WorldTycoon.exe`, `WorldTycoon_Online_Game.zip`, `WorldTycoon-Mac.zip`). All debug UI triggers, shortcuts (`~`, `F2`), console cheat functions (`window.debug`, `window.WorldTycoonDebug`), and testing panels must be deactivated or stripped during CI builds.
- **Local Developer PC**: Debug mode must **ALWAYS** remain enabled and accessible on the local developer PC for development, testing, and troubleshooting.
