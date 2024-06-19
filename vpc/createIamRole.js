import { IAMClient, CreateRoleCommand, AttachRolePolicyCommand, PutRolePolicyCommand } from "@aws-sdk/client-iam";

const iamClient = new IAMClient({ region: process.env.AWS_REGION });

export const createIamRole = async () => {
  const roleName = 'EC2SSMRole';
  const assumeRolePolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'ec2.amazonaws.com'
        },
        Action: 'sts:AssumeRole'
      }
    ]
  };

  try {
    const createRoleCommand = new CreateRoleCommand({
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy)
    });
    await iamClient.send(createRoleCommand);

    const attachRolePolicyCommand = new AttachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'
    });
    await iamClient.send(attachRolePolicyCommand);

    const putRolePolicyCommand = new PutRolePolicyCommand({
      RoleName: roleName,
      PolicyName: 'EC2SSMPolicy',
      PolicyDocument: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['ssm:SendCommand'],
            Resource: '*'
          }
        ]
      })
    });
    await iamClient.send(putRolePolicyCommand);

    console.log(`Created IAM Role ${roleName} for SSM`);
    return roleName;
  } catch (err) {
    console.error("Error creating IAM Role", err);
    throw err;
  }
};
