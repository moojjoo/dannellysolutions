# Dannelly Solutions Inc. AWS Low-Cost Static Website

## Recommended lowest-cost professional setup

Use:
- S3 private bucket for the static website files
- CloudFront for HTTPS/CDN
- AWS Certificate Manager public SSL certificate in us-east-1
- Route 53 hosted zone only if you want AWS to manage DNS

Avoid for now:
- EC2, RDS, ECS, EKS, ALB, NAT Gateway
- A backend contact form unless you really need it

## Estimated monthly cost for a small business brochure site

Typical small traffic site: about $0.50 to $3/month plus domain registration.
Route 53 hosted zone is commonly the biggest fixed item at about $0.50/month. S3 and CloudFront are usually pennies to low dollars for low traffic.

## Manual deployment steps

1. Create an S3 bucket, for example:
   dannellysolutions-com-site

2. Upload these files:
   index.html
   styles.css
   script.js
   favicon.svg

3. Create an ACM certificate in us-east-1 for:
   dannellysolutions.com
   www.dannellysolutions.com

4. Create a CloudFront distribution:
   - Origin: your S3 bucket
   - Use Origin Access Control
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Alternate domain names: dannellysolutions.com and www.dannellysolutions.com
   - Certificate: the ACM certificate
   - Default root object: index.html

5. Point DNS:
   - dannellysolutions.com -> CloudFront distribution alias
   - www.dannellysolutions.com -> CloudFront distribution alias

6. Invalidate CloudFront after updates:
   /*

## Email

For professional email, use Google Workspace or Microsoft 365.
Suggested mailbox:
contact@dannellysolutions.com
robert.dannelly@dannellysolutions.com

## Contact form (Lambda + SES, lowest AWS cost)

The site now includes a contact form in index.html that posts JSON to a Lambda Function URL.

### 1) Configure Amazon SES (same region as Lambda)

1. Open Amazon SES and choose a region (recommended: us-east-1).
2. Verify a sender identity:
   - Preferred: your domain identity (best deliverability), or
   - Minimum: a specific sender address such as contact@dannellysolutions.com
3. If SES is still in sandbox mode:
   - Verify the recipient inbox too, or
   - Request production access.

### 2) Create Lambda function

1. Runtime: Node.js 20.x
2. Upload lambda/contact-handler.mjs from this repository and set Handler to:
   - contact-handler.handler
3. Add environment variables:
   - TO_EMAIL=robert.dannelly@dannellysolutions.com
   - FROM_EMAIL=robert.dannelly@dannellysolutions.com
   - ALLOWED_ORIGINS=https://dannellysolutions.com,https://www.dannellysolutions.com
   - MIN_SUBMIT_SECONDS=4
   - TURNSTILE_SECRET_KEY=REPLACE_WITH_TURNSTILE_SECRET
4. Lambda execution role permissions:
   - ses:SendEmail
   - CloudWatch Logs write permissions

If packaging manually from the repository root:
1. cd lambda
2. zip -j contact-handler.zip contact-handler.mjs
3. Upload contact-handler.zip in Lambda code settings

### Least-privilege IAM role hardening

Use the included IAM templates:
- lambda/iam-trust-policy-lambda.json
- lambda/iam-policy-contact-lambda-template.json

Before creating the policy, edit lambda/iam-policy-contact-lambda-template.json:
1. Set ses:FromAddress to your real sender address.
2. Update the CloudWatch Logs ARN with your region, account id, and Lambda function name.

Create role and policy with AWS CLI:
1. aws iam create-role --role-name dannelly-contact-lambda-role --assume-role-policy-document file://lambda/iam-trust-policy-lambda.json
2. aws iam create-policy --policy-name dannelly-contact-lambda-policy --policy-document file://lambda/iam-policy-contact-lambda-template.json
3. aws iam attach-role-policy --role-name dannelly-contact-lambda-role --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/dannelly-contact-lambda-policy

Assign the role to the Lambda function:
1. aws lambda update-function-configuration --function-name dannelly-contact-form --role arn:aws:iam::<ACCOUNT_ID>:role/dannelly-contact-lambda-role

Notes:
1. The ses:FromAddress condition limits send permissions to only your configured sender identity.
2. The log group resource limits write access to only this function's logs.
3. If your function creates a new log group automatically, allow that once or pre-create the log group first.

### 3) Enable Lambda Function URL

1. Auth type: NONE
2. CORS:
   - Allowed origins: https://dannellysolutions.com, https://www.dannellysolutions.com
   - Allowed methods: POST
   - Allowed headers: content-type
   - Max age: 86400

### 4) Wire endpoint into site

1. In index.html, find the form with id="contact-form".
2. Set data-endpoint to your Lambda Function URL.
3. Set Turnstile site key in the widget data-sitekey value.

### 4.1) Turnstile setup (recommended free bot protection)

1. Create a Cloudflare Turnstile widget for your domain(s).
2. Add both production hostnames in Turnstile allowed domains:
   - dannellysolutions.com
   - www.dannellysolutions.com
3. Put the site key in index.html data-sitekey.
4. Put the secret key in Lambda environment variable TURNSTILE_SECRET_KEY.

### 5) Backend payload contract

The frontend sends this payload:
- fullName (required)
- workEmail (required)
- companyName (required)
- serviceType (required)
- timeline (required)
- budgetRange (optional)
- projectSummary (required)
- contactPreference (optional)
- startedAt (required anti-spam timestamp)
- companySite (honeypot field, must be empty)
- turnstileToken (required; maps from cf-turnstile-response)

Backend should validate lengths/enums and reject bot-like submissions.
Backend includes a bot checker that rejects suspicious requests based on:
- Turnstile token verification (Cloudflare siteverify)
- Honeypot and timing checks
- User-agent bot signatures
- Subject/body spam keywords and suspicious link/pattern content
- Excessive repeated-word patterns in message content

### 6) Deploy and verify

1. Upload updated index.html, styles.css, and script.js to S3.
2. Invalidate CloudFront cache (/*).
3. Submit a test form from production and verify email delivery.
4. Confirm invalid submissions are rejected and errors are safe for users.

## Future upgrade path

If you need a real contact form later, add AWS Lambda + SES, or use a low-cost form service. Keeping the first version static avoids backend hosting cost.
