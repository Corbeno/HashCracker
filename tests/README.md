# Hash Cracker E2E Tests

This directory contains End-to-End (E2E) tests for the Hash Cracker application, built using [Playwright](https://playwright.dev/).

## Prerequisites

Ensure you have installed the necessary dependencies:

```bash
npm install
npx playwright install --with-deps
```

## Running Tests

To run the full test suite:

```bash
npx playwright test
```

### Running in UI Mode (Interactive)

To explore tests, see time-travel debugging, and watch execution:

```bash
npx playwright test --ui
```

### Running Specific Tests

To run a specific test file:

```bash
npx playwright test tests/e2e.spec.ts
```

To run a specific test case by title:

```bash
npx playwright test -g "should extract hashes"
```

### Debugging

To run tests in debug mode with a step-by-step inspector:

```bash
npx playwright test --debug
```

## Viewing Reports

After a test run, an HTML report is generated if there are failures (or if configured). To view the report manually:

```bash
npx playwright show-report
```

## Directory Structure

- `e2e.spec.ts`: Main test file covering core application features (Home, Forms, Modals).
- `../playwright.config.ts`: Playwright configuration file (at project root).
