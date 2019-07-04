'use strict';

const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
const sns = new AWS.SNS();

module.exports.handler = async (event) => {

  const data = JSON.parse(event.body);
  const userId = data.userId;
  const externalId = data.externalId;
  const deviceToken = data.deviceToken;

  const paramsSNS = {
    PlatformApplicationArn: 'arn:aws:sns:us-east-1:919018827940:app/APNS/Lipsy',
    Token: deviceToken
  };

  const response = await sns.createPlatformEndpoint(paramsSNS).promise();
  const endpointArn = response.EndpointArn;

  const paramsSubs = {
    Protocol: 'application',
    TopicArn: 'arn:aws:sns:us-east-1:919018827940:lipsyNotification',
    Endpoint: endpointArn
  };

  await sns.subscribe(paramsSubs).promise();

  const params = {
    TableName: "LipsyQuizz",
    Key: {
      pk: userId,
      sk: 'USER'
    },
    AttributeUpdates: {
      "endpointArn": {
        Action: "PUT",
        Value: endpointArn
      }
    }
  };

  await db.update(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({
      messages: "hello"
    }, null, 2)
  };
};
