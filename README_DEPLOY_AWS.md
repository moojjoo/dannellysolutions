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

## Future upgrade path

If you need a real contact form later, add AWS Lambda + SES, or use a low-cost form service. Keeping the first version static avoids backend hosting cost.
