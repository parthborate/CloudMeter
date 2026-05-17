# Financial Smoke Alarm

## Overview

Financial Smoke Alarm is a serverless FinOps tool that monitors AWS spending in real time, detects cost anomalies, and protects you from budget overruns through automated alerts and an optional kill switch. It pairs an AWS Lambda backend with a React-based dashboard to give you actionable visibility into your daily cloud spend.

The system pulls cost data from AWS Cost Explorer, computes day-over-day deltas, forecasts month-end spend, publishes JSON snapshots to S3, and renders them in a clean, dark-themed dashboard. If projected spend exceeds your budget threshold, a separate Lambda can automatically stop tagged dev EC2 instances to prevent runaway costs.

## Features

- **Daily cost snapshots** — Aggregates AWS spend by service and writes JSON snapshots to S3.
- **Anomaly detection** — Flags services with >20% day-over-day cost increases.
- **Budget forecasting** — Projects month-end spend using AWS Cost Explorer's forecast API (with a linear fallback).
- **SNS alerts** — Publishes cost alerts to an SNS topic when budgets are breached or services spike.
- **Automated kill switch** — Stops `Environment=dev` tagged EC2 instances when projected spend exceeds 120% of budget.
- **Interactive dashboard** — React + Recharts UI with KPIs, top movers, forecast bars, and budget tracking.
- **Serverless architecture** — Lambda + S3 + SNS on the backend; static React app deployable to Cloudflare Pages or any static host.

## Installation

### Prerequisites

- Python 3.9+ (for Lambda functions)
- Node.js 18+ and npm (for the dashboard)
- AWS account with Cost Explorer enabled
- AWS CLI configured with appropriate IAM permissions

### Backend (Lambda)

1. Create an S3 bucket to store cost snapshots.
2. Create an SNS topic for alert notifications.
3. Deploy `lambda/lambda_function.py` as a Lambda function with the following environment variables:
   - `S3_BUCKET` — Your snapshot bucket name
   - `SNS_TOPIC` — ARN of your SNS topic
   - `BUDGET_LIMIT` — Monthly budget ceiling in USD (default: `10`)
4. Attach an IAM role with permissions for `ce:GetCostAndUsage`, `ce:GetCostForecast`, `s3:PutObject`, and `sns:Publish`.
5. Schedule the function via EventBridge (e.g., daily at 8 AM UTC).

For the kill switch, deploy `lambda/kill_switch.py` separately with `ec2:DescribeInstances`, `ec2:StopInstances`, and `sns:Publish` permissions.

### Dashboard

```bash
cd dashboard
npm install
```

Update the `PRESIGNED_URL` constant in `src/App.jsx` with a presigned S3 URL pointing to your `latest.json` snapshot.

## Usage

### Run the dashboard locally

```bash
cd dashboard
npm run dev
```

The dev server starts on `http://localhost:5173`.

### Build for production

```bash
cd dashboard
npm run build
```

Output is emitted to `dashboard/dist/` and can be deployed to any static host (Cloudflare Pages, Netlify, S3, etc.).

### Lint

```bash
cd dashboard
npm run lint
```

### Invoke the Lambda manually

```bash
aws lambda invoke \
  --function-name financial-smoke-alarm \
  --payload '{}' \
  response.json
```

## Examples

### Snapshot JSON structure

The Lambda writes snapshots in this shape to `s3://<BUCKET>/latest.json`:

```json
{
  "date": "2025-01-15",
  "generated_at": "2025-01-15T08:00:00Z",
  "services": [
    {
      "service": "Amazon EC2",
      "today": 2.45,
      "yesterday": 1.80,
      "delta_pct": 36.1,
      "flagged": true
    }
  ],
  "top_movers": [ /* sorted by |delta_pct| */ ],
  "forecast": {
    "actual_so_far": 4.32,
    "projected_total": 12.50,
    "budget": 10.0,
    "over_budget": true
  },
  "alerts": [ /* services exceeding 20% increase */ ]
}
```

### Sample SNS alert

```
🚨 Cost alert from your AWS dashboard

• Projected spend $12.50 exceeds budget $10.0
• Amazon EC2: +36.1% day-over-day ($2.45 today)
```

### Kill switch trigger payload

```json
{
  "projected_total": 13.50
}
```

When `projected_total > BUDGET_LIMIT * 1.2`, all running EC2 instances tagged `Environment=dev` are stopped and a notification is published to SNS.

## Project Structure

```
.
├── dashboard/                  # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx             # Main dashboard component
│   │   └── main.jsx            # React entry point
│   ├── eslint.config.js
│   ├── vite.config.js
│   └── package.json
├── lambda/                     # AWS Lambda handlers
│   ├── lambda_function.py      # Daily cost snapshot + alerting
│   └── kill_switch.py          # Auto-stop dev instances over budget
├── package.json                # Root deps (axios, recharts)
└── package-lock.json
```

## License

Released under the [MIT License](https://opensource.org/licenses/MIT).
