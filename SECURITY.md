# Security Policy

## Supported versions

Only the latest published version of each `@quickdrawjs/*` package receives
security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately via
[GitHub Security Advisories](https://github.com/quickdrawjs/quickdraw/security/advisories/new)
or email **promptifyapps@gmail.com**.

You can expect an acknowledgment within a few days. Once a fix ships we'll
credit you in the release notes unless you prefer otherwise.

## Scope notes

Quickdraw renders user-provided documents (snapshots and diffs). Anything that
lets a crafted document escape the canvas — script execution from text or
label records, prototype pollution through `applyDiff`/`loadSnapshot`, or
resource exhaustion that a host app can't guard against — is in scope and
taken seriously. The React Native package ships an embedded WebView page;
issues that let board content reach the host bridge beyond the documented
protocol are also in scope.
