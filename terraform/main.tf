terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── S3 bucket for cost snapshots ──────────────────────────────
resource "aws_s3_bucket" "cost_snapshots" {
  bucket        = "cost-snapshots-${data.aws_caller_identity.current.account_id}"
  force_destroy = true

  tags = {
    Project = "week1-cost-dashboard"
  }
}

resource "aws_s3_bucket_versioning" "cost_snapshots" {
  bucket = aws_s3_bucket.cost_snapshots.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "cost_snapshots" {
  bucket                  = aws_s3_bucket.cost_snapshots.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── SNS topic for alerts ───────────────────────────────────────
resource "aws_sns_topic" "cost_alerts" {
  name = "cost-alerts"
  tags = { Project = "week1-cost-dashboard" }
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.cost_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic_subscription" "slack" {
  count     = var.slack_webhook_url != "" ? 1 : 0
  topic_arn = aws_sns_topic.cost_alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}

# ── IAM role for Lambda (least privilege) ─────────────────────
resource "aws_iam_role" "lambda_role" {
  name = "cost-dashboard-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = { Project = "week1-cost-dashboard" }
}

resource "aws_iam_role_policy" "lambda_policy" {
  name = "cost-dashboard-lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["ce:GetCostAndUsage", "ce:GetCostForecast"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "${aws_s3_bucket.cost_snapshots.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = "sns:Publish"
        Resource = aws_sns_topic.cost_alerts.arn
      },
       {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:StopInstances"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ── Lambda function ────────────────────────────────────────────
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "cost_collector" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "cost-collector"
  role             = aws_iam_role.lambda_role.arn
  handler          = "lambda_function.handler"
  runtime          = "python3.11"
  timeout          = 60
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      S3_BUCKET    = aws_s3_bucket.cost_snapshots.bucket
      SNS_TOPIC    = aws_sns_topic.cost_alerts.arn
      BUDGET_LIMIT = tostring(var.budget_limit)
    }
  }

  tags = { Project = "week1-cost-dashboard" }
}

# ── EventBridge cron (6 AM UTC daily) ─────────────────────────
resource "aws_cloudwatch_event_rule" "daily_trigger" {
  name                = "cost-collector-daily"
  schedule_expression = "cron(0 6 * * ? *)"
  tags                = { Project = "week1-cost-dashboard" }
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.daily_trigger.name
  target_id = "CostCollectorLambda"
  arn       = aws_lambda_function.cost_collector.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cost_collector.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_trigger.arn
}

# ── Data sources ───────────────────────────────────────────────
data "aws_caller_identity" "current" {}
