# Elmoorx Framework — Pull Request Checklist

## Description
<!-- Brief description of what this PR changes and why -->

## Type of change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactor / code quality
- [ ] Test addition / fix

## Checklist
- [ ] My code follows the project's TypeScript strict mode conventions
- [ ] I have run `npm run typecheck` and there are no new errors
- [ ] I have run `npm run lint` and addressed all errors (warnings OK)
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] New and existing unit tests pass locally with `npm run test`
- [ ] I have NOT added any `data/*.json` files (they are gitignored — runtime data only)
- [ ] If I added a new package, I registered it in root `package.json` workspaces
- [ ] If I changed a public API, I updated the package's `README.md`
- [ ] All `@elmoorx/*` dependencies in my package.json use `"workspace:^"`

## Security considerations
<!-- If this PR touches security-sensitive code (sanitizer, CSRF, auth,
     headers, crypto), describe what you considered and how you tested
     it. Otherwise write "N/A". -->

## Test plan
<!-- How did you verify this change works as expected? -->
1.
2.
3.
