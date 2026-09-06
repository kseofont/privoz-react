# AGENTS.md

## Purpose

This file defines the rules for AI coding assistants working in this repository.

Follow these rules before proposing or making code changes.

---

## General Rules

- Read the relevant existing files before proposing changes.
- Base conclusions only on code that has actually been inspected.
- Never invent files, functions, components, APIs, dependencies, database fields, routes, or requirements.
- If required information is missing, explicitly say that it is unknown.
- Do not assume backend API behavior unless the API contract or implementation has been inspected.
- Prefer minimal changes over large refactors.
- Do not modify unrelated code.
- Preserve existing project conventions unless there is a clear reason to change them.
- Do not install or remove dependencies without explicit approval.
- Do not commit, push, merge, rebase, or reset Git automatically.
- Never modify generated files unless specifically requested.

---

## Project-Specific Guardrails

- Treat `package.json` and the inspected source code as the source of truth for project dependencies and scripts.
- Do not run `npm audit fix`, dependency upgrades, or package migrations unless explicitly requested.
- Do not modify `package-lock.json` unless an intentional dependency change requires it.
- Do not treat missing loading indicators, form resets, static JSON data, or prop drilling as bugs by themselves.
- Do not recommend replacing static data with an API unless project requirements actually require dynamic server data.
- Do not recommend Context, Redux, Zustand, memoization, or component extraction without identifying a concrete problem first.

## Before Changing Code

Before editing:

1. Read the target file.
2. Read directly related components, hooks, utilities, or configuration when needed.
3. Check existing project patterns before introducing a new pattern.
4. Explain briefly what will be changed.
5. Make the smallest change that solves the task.

Do not start a broad repository investigation when the task can be solved from an obvious existing file or command.

---

## React Rules

- Use functional components unless the existing code explicitly uses another pattern.
- Follow the Rules of Hooks.
- Hooks must be called at the top level of React components or custom hooks.
- Never move hooks such as `useNavigate`, `useState`, `useEffect`, or `useMemo` inside event handlers, conditions, or loops.
- Do not introduce state-management libraries unless explicitly requested.
- Prefer existing state-management patterns already used by the project.
- Do not introduce Context API simply to avoid passing a few props.
- Do not combine unrelated state values only for stylistic reasons.
- Avoid unnecessary `useEffect`.
- Do not add `useMemo` or `useCallback` unless there is a concrete reason.
- Do not optimize prematurely.

---

## Components

- Reuse existing components when appropriate.
- Keep component changes focused on the requested behavior.
- Do not split components solely because they are long.
- Extract logic only when it improves reuse, readability, testing, or separation of responsibilities.
- Preserve existing props and component APIs unless changing them is required.

---

## State

- Keep state as close as practical to where it is used.
- Do not duplicate derived state unnecessarily.
- Do not claim that separate state variables are a problem without showing a concrete issue.
- Do not reset component state before navigation unless there is an actual requirement for it.
- Remember that local component state disappears when the component unmounts.

---

## Effects

When reviewing `useEffect`:

- Check dependency correctness.
- Do not blindly add every referenced value to dependencies without considering behavior.
- Check whether the effect is actually needed.
- Avoid effects that create unnecessary state synchronization.
- Check cleanup for subscriptions, timers, listeners, WebSockets, and similar resources.

---

## Routing

- Respect the router version used by the project.
- Inspect existing routing configuration before adding routes.
- For React Router hooks such as `useNavigate`, follow the Rules of Hooks.
- Do not invent routes that are not present in the project.

---

## API and Axios

- Do not assume an API contract that has not been provided.
- `params` in Axios means query-string parameters.
- `data` means request body.
- Do not claim one is wrong unless the expected API contract is known.
- Handle HTTP errors separately from network/no-response errors when relevant.
- Avoid changing API payloads without verifying the backend contract.
- Error response shape does not prove request-body or query-parameter requirements.
- HTTP method conventions are not an API contract.
- Do not recommend changing Axios `params` to request `data`, or vice versa, without inspecting the API contract or backend implementation.

---

## Forms and Validation

- Distinguish browser validation from application validation.
- `required`, `min`, and `max` attributes do not automatically make application-level validation unnecessary.
- Validate data when application logic requires it.
- Do not call normal controlled React input values an XSS vulnerability.
- React escapes rendered text by default.
- Treat `dangerouslySetInnerHTML` and raw HTML insertion separately.

---

## Security

- Do not invent security vulnerabilities.
- Every security finding must reference a concrete attack surface in the inspected code.
- Distinguish theoretical concerns from exploitable issues.
- Do not label something XSS, CSRF, injection, or authentication bypass without evidence.

---

## Code Review Rules

When asked for code review:

- Report only real issues supported by inspected code.
- Maximum requested findings is a maximum, not a quota.
- If only one real issue exists, return one issue.
- If no meaningful issue exists, say so.
- Do not manufacture findings to reach a requested count.
- Do not report ordinary style preferences as bugs.
- Quote or reference the exact code responsible for each finding.
- Clearly distinguish:
  - bug
  - potential bug
  - maintainability issue
  - performance issue
  - stylistic suggestion

For every reported issue provide:

1. File or code location.
2. Existing relevant code.
3. Why it is a real problem.
4. Minimal practical fix.

---

## Architecture Review

Do not recommend architectural changes without a concrete reason.

Avoid generic advice such as:

- "Use Redux."
- "Use Context."
- "Move everything into hooks."
- "Create a service layer."
- "Use microservices."
- "Split every large component."

Explain the actual problem first, then propose the smallest useful architectural improvement.

---

## Commands

Before guessing how the project runs:

1. Check `package.json`.
2. Use existing scripts.

Prefer obvious commands first.

Examples:

- `npm start`
- `npm test`
- `npm run build`

Do not perform unnecessary diagnostics before trying an existing documented script.

---

## Verification

After code changes, when practical:

1. Check the changed files.
2. Run the relevant existing test command.
3. Run the production build when appropriate.
4. Inspect `git diff`.
5. Report failures clearly.

Do not hide failed tests or build errors.

---

## Git

- Never commit automatically.
- Never push automatically.
- Never force-push automatically.
- Never merge branches automatically.
- Never reset or discard user changes.
- Check `git status` before potentially destructive Git operations.
- Preserve unrelated uncommitted work.

---

## Response Style

- Be concise and practical.
- Give the direct next action first.
- Avoid unnecessary repository exploration.
- Avoid generic tutorials unless requested.
- Clearly state uncertainty.
- Prefer evidence from actual project code over assumptions.

## Incomplete Context

- A symbol whose definition is not visible in the currently inspected fragment is unknown, not automatically undefined or broken.
- Never report a missing function, variable, component, hook, or dependency as a bug unless its absence has been verified in the relevant project scope.
- Do not invent behavior for helper functions whose implementation has not been inspected.
- Do not turn hypothetical behavior of unseen code into a finding.
- A valid finding must be demonstrable from the inspected code and known project facts.
- "If another function does X" or "if the project later changes Y" is not evidence of a current bug.

## Review Evidence Threshold

- Review the code as it exists now, not hypothetical future rewrites.
- Do not report a problem that only appears if requirements, data sources, component architecture, or helper implementations change in the future.
- Static imports should be treated as static unless inspected code shows otherwise.
- A large number of props is not by itself a performance problem.
- Simple derived calculations inside render are allowed and do not require `useMemo`, a hook, or extraction unless there is a concrete measured or structural reason.

## False Positive Avoidance

- Do not report expected conditional rendering as an error.
- A prop being `null` or `undefined` is not a runtime problem when the existing code explicitly handles that case.
- Simple calculations from props, such as subtraction, formatting, or derived display values, may remain inside a component and are not business-logic violations by themselves.
- Do not recommend extracting trivial calculations into utilities, hooks, or separate components without reuse or complexity.
- An unused prop is a maintainability issue, not a bug.
- Do not recommend removing an apparently unused prop until its callers and public component API have been inspected.
- Prefer returning zero findings over weak, hypothetical, or stylistic findings.
