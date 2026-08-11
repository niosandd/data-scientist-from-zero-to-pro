import { type KeeperFormValues } from './types';

export const awsFormValues: KeeperFormValues = {
  name: 'my-aws-keeper',
  description: 'AWS production keeper',
  type: 'aws',
  awsRegion: 'us-east-1',
  awsAssumeRoleArn: 'arn:aws:iam::123456789012:role/my-role',
  awsKmsKeyId: 'key-abc',
  isActive: false,
};
