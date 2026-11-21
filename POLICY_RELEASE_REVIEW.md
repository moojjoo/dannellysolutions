# Issue #6: owner and counsel review before release

This repository review checklist is not part of the website. The current S3 workflow excludes all Markdown files. Do not merge to master or dispatch the workflow until Robert approves publishing; pushes to master sync to the production website and invalidate CloudFront.

## Confirm before merging

- Counsel and owner review scope, geographic audiences/applicable obligations, headings, effective/update date, privacy requests channel/response process and any business details required in the public notice. This is factual draft copy, not legal advice or a claim of compliance.
- Confirm actual inquiry handling and retention for AWS, Lambda logs, SES and the receiving mailbox; confirm hosting/log configuration and data handling. No guessed retention, recipient identifier, geographic guarantee, or third-party transfer claim is in the public draft.
- Confirm deployed Turnstile hostname/site configuration, pre-clearance or other cookie use, purpose and disclosures. Check the approved privacy addendum link. The form verification implementation is unchanged; do not enable or switch Cloudflare settings as part of publishing this PR.
- Confirm GA4 destinations/data-sharing and check active Enhanced Measurement settings. Verify no form field text, search parameters, URL/query PII, advertising/personalization features, or cross-product tagging are collected. Disable unwanted settings only under separate approved scope. The local opt-in gate does not control provider-side settings.
- Decide whether to replace the links to the separate RecruiterReply and Blogger sites with their own verified notices; no unverified policy URL is claimed here.
- Browser acceptance in a clean and previously tagged profile on apex and www: no Google Analytics requests, including the tag loader, before consent or after rejection on a fresh load. After acceptance, verify the optional analytics request and cookie attributes. Withdraw while idle and while script load is in flight; verify no subsequent analytics sends, expected first-party cookie cleanup, saved choice, and no impact to a partially typed contact inquiry. Also verify 320px width, Enter/Tab, focus indicators, the no-JavaScript notice/link path, browser storage unavailable, multiple tabs, and no optional analytics requests on the policy pages. Flush older content only through the normal approved deployment process.
- Use synthetic test data and an isolated test or approved deployment; do not submit live contact requests unprompted.

## References

- Google: https://developers.google.com/tag-platform/security/guides/privacy
- Google: https://developers.google.com/tag-platform/security/guides/customize-cookies
- Google: https://support.google.com/analytics/answer/9216061
- Cloudflare: https://developers.cloudflare.com/turnstile/additional-configuration/pre-clearance-support/
- Cloudflare: https://www.cloudflare.com/turnstile-privacy-policy/
