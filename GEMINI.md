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

## Clean Code Principles (Mandatory Global Standard)
Always apply Robert C. Martin's ("Uncle Bob") Clean Code principles globally across all code modifications, refactorings, and new features:
1. **Meaningful & Searchable Names**:
   - Use intention-revealing names (`elapsedTimeInDays`, `isPlayerBankrupt`).
   - Use verbs for functions/methods (`calculateRent`, `renderCornerHUDs`) and nouns for classes/objects (`PlayerState`, `PropertyManager`).
   - Avoid cryptic abbreviations, disinformation, and redundant suffixes (`Data`, `Info`).
2. **Small Functions with Single Responsibility (SRP)**:
   - Functions should do **exactly one thing** and do it cleanly (aim for < 20–30 lines).
   - Maintain one level of abstraction per function. Don't mix high-level business logic with low-level DOM or byte manipulations.
   - Restrict argument count: 0 is ideal, 1–2 is good, 3+ requires a structured parameter object.
3. **Modularity & Architecture**:
   - Break large/monolithic files (> 500 lines) into focused, single-responsibility submodules.
   - Use backwards-compatible barrel facades (`export * from '...'`) to ensure existing callers remain uninterrupted.
   - Respect the **Law of Demeter**: modules should not know about the internal mechanics of foreign objects (avoid deep property chains like `a.b.c.d.action()`).
4. **Code Quality & Self-Documentation**:
   - Code must explain itself. Refactor unclear logic into well-named helper functions instead of explaining messy code with comments.
   - Avoid side effects in query functions.
   - Handle errors explicitly and avoid passing or returning `null` where possible.
   - Maintain unit tests and verify changes before completion.

