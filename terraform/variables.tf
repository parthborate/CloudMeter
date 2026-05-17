variable "aws_region" {
  default = "us-east-1"
}

variable "budget_limit" {
  description = "Monthly budget in USD"
  default     = 10
}

variable "alert_email" {
  description = "Email to receive cost alerts"
  type        = string
}

variable "slack_webhook_url" {
  description = "Slack incoming webhook URL (optional)"
  type        = string
  default     = ""
}
