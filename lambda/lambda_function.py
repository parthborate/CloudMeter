import json
import os
import boto3
import statistics
from datetime import datetime, timedelta, date

ce = boto3.client('ce', region_name='us-east-1')
s3 = boto3.client('s3')
sns = boto3.client('sns')

BUCKET = os.environ['S3_BUCKET']
SNS_TOPIC = os.environ['SNS_TOPIC']
BUDGET_LIMIT = float(os.environ.get('BUDGET_LIMIT', '10'))


def get_costs_by_service(start: str, end: str) -> dict:
    resp = ce.get_cost_and_usage(
        TimePeriod={'Start': start, 'End': end},
        Granularity='DAILY',
        Metrics=['BlendedCost'],
        GroupBy=[{'Type': 'DIMENSION', 'Key': 'SERVICE'}]
    )
    result = {}
    for group in resp['ResultsByTime'][0]['Groups']:
        service = group['Keys'][0]
        amount = float(group['Metrics']['BlendedCost']['Amount'])
        if amount > 0:
            result[service] = round(amount, 4)
    return result


def get_month_forecast() -> dict:
    today = date.today()
    month_start = today.replace(day=1).isoformat()
    month_end = (today.replace(day=1) + timedelta(days=32)).replace(day=1).isoformat()

    # Actual spend so far
    actual_resp = ce.get_cost_and_usage(
        TimePeriod={'Start': month_start, 'End': today.isoformat()},
        Granularity='MONTHLY',
        Metrics=['BlendedCost']
    )
    actual = float(actual_resp['ResultsByTime'][0]['Total']['BlendedCost']['Amount'])

    # Forecast
    try:
        forecast_resp = ce.get_cost_forecast(
            TimePeriod={'Start': today.isoformat(), 'End': month_end},
            Metric='BLENDED_COST',
            Granularity='MONTHLY'
        )
        forecasted = float(forecast_resp['Total']['Amount'])
    except Exception:
        # If not enough data for forecast, project linearly
        days_elapsed = today.day
        days_in_month = 30
        forecasted = (actual / days_elapsed) * days_in_month

    return {
        'actual_so_far': round(actual, 2),
        'projected_total': round(actual + forecasted, 2),
        'budget': BUDGET_LIMIT,
        'over_budget': (actual + forecasted) > BUDGET_LIMIT
    }


def compute_z_score(values: list) -> float:
    if len(values) < 3:
        return 0.0
    mean = statistics.mean(values)
    stdev = statistics.stdev(values)
    if stdev < 0.001:
        return 0.0
    return (values[-1] - mean) / stdev


def handler(event, context):
    today = date.today()
    yesterday = today - timedelta(days=1)
    two_days_ago = today - timedelta(days=2)

    # Fetch costs for today and yesterday
    today_costs = get_costs_by_service(today.isoformat(),
                                       (today + timedelta(days=1)).isoformat())
    yesterday_costs = get_costs_by_service(yesterday.isoformat(),
                                           today.isoformat())

    # Build service comparison
    all_services = set(list(today_costs.keys()) + list(yesterday_costs.keys()))
    services = []
    flagged_services = []

    for svc in all_services:
        t = today_costs.get(svc, 0.0)
        y = yesterday_costs.get(svc, 0.0)

        if y > 0:
            delta_pct = round(((t - y) / y) * 100, 1)
        else:
            delta_pct = 100.0 if t > 0 else 0.0

        flagged = delta_pct > 20 and t > 0.10  # ignore tiny amounts

        entry = {
            'service': svc,
            'today': t,
            'yesterday': y,
            'delta_pct': delta_pct,
            'flagged': flagged
        }
        services.append(entry)

        if flagged:
            flagged_services.append(entry)

    # Sort by today's cost descending
    services.sort(key=lambda x: x['today'], reverse=True)
    top_movers = sorted(services, key=lambda x: abs(x['delta_pct']), reverse=True)[:5]

    forecast = get_month_forecast()

    snapshot = {
        'date': today.isoformat(),
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'services': services,
        'top_movers': top_movers,
        'forecast': forecast,
        'alerts': flagged_services
    }

    # Write to S3
    key = f"snapshots/{today.isoformat()}.json"
    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=json.dumps(snapshot),
        ContentType='application/json'
    )
    # Also overwrite latest.json
    s3.put_object(
        Bucket=BUCKET,
        Key='latest.json',
        Body=json.dumps(snapshot),
        ContentType='application/json'
    )

    # Send alerts if needed
    if flagged_services or forecast['over_budget']:
        lines = ["🚨 Cost alert from your AWS dashboard\n"]

        if forecast['over_budget']:
            lines.append(f"• Projected spend ${forecast['projected_total']} exceeds budget ${forecast['budget']}")

        for svc in flagged_services:
            lines.append(f"• {svc['service']}: +{svc['delta_pct']}% day-over-day (${svc['today']} today)")

        sns.publish(
            TopicArn=SNS_TOPIC,
            Subject='AWS Cost Alert',
            Message='\n'.join(lines)
        )

    print(f"Done. Snapshot written to s3://{BUCKET}/{key}")
    print(f"Services tracked: {len(services)}, Flagged: {len(flagged_services)}")
    return {'statusCode': 200, 'snapshot_date': today.isoformat()}
