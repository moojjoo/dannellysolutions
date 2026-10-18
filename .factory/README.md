# Factory integration

This repository supplies application-specific configuration only. The reusable policy and
sync prompt are maintained in
[`dannellysolutions-software-factory`](https://github.com/moojjoo/dannellysolutions-software-factory).

Use `.factory/application-contract.yml` with the Factory's
`.github/prompts/sync-application.prompt.md` prompt. Validate the contract against the
Factory schema before changing workflows or deployment settings.

The website's S3/CloudFront deployment remains application-owned. Test and Production
changes require explicit approval, and secrets must remain in GitHub Environments or AWS
Secrets Manager.
