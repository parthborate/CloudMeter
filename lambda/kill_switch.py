import boto3
import os
import json

ec2 = boto3.client('ec2')
sns = boto3.client('sns')
SNS_TOPIC = os.environ['SNS_TOPIC']
BUDGET_LIMIT = float(os.environ.get('BUDGET_LIMIT', '10'))

def handler(event, context):
    # Only fires if projected spend > 120% of budget
    projected = event.get('projected_total', 0)
    if projected <= BUDGET_LIMIT * 1.2:
        return {'action': 'none', 'reason': 'within budget'}

    # Find all dev EC2 instances
    response = ec2.describe_instances(Filters=[
        {'Name': 'tag:Environment', 'Values': ['dev']},
        {'Name': 'instance-state-name', 'Values': ['running']}
    ])

    instance_ids = []
    for r in response['Reservations']:
        for i in r['Instances']:
            instance_ids.append(i['InstanceId'])

    if instance_ids:
        ec2.stop_instances(InstanceIds=instance_ids)
        msg = f"🛑 Kill switch activated. Stopped {len(instance_ids)} dev instance(s): {instance_ids}\nProjected spend ${projected} exceeded ${BUDGET_LIMIT * 1.2} threshold."
        sns.publish(TopicArn=SNS_TOPIC, Subject='Kill Switch Activated', Message=msg)

    return {'action': 'stopped', 'instances': instance_ids}
