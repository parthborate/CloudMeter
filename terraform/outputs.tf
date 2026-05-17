output "s3_bucket_name" {
  value = aws_s3_bucket.cost_snapshots.bucket
}

output "sns_topic_arn" {
  value = aws_sns_topic.cost_alerts.arn
}

output "lambda_function_name" {
  value = aws_lambda_function.cost_collector.function_name
}
