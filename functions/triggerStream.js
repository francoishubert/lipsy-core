'use strict';

const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
const sns = new AWS.SNS();

module.exports.handler = async (event) => {

  const data = event.Records[0];
  const newImage = data.dynamodb.NewImage;
  const oldImage = data.dynamodb.OldImage;
  let userId;
  let endpointArn;

  const createNotif = async () => {
    userId = newImage.sk.S.substring(8);
    const params = {
      TableName: 'LipsyQuizz',
      Key: {
        pk: userId,
        sk: 'USER'
      },
      ProjectionExpression: "endpointArn, pk"
    };

    const response = await db.get(params).promise();
    if (response.Item.endpointArn != undefined) {
      var paramsSNSAtt = {
        EndpointArn: response.Item.endpointArn
      };
      const resp = await sns.getEndpointAttributes(paramsSNSAtt).promise();
      if (resp.Attributes.Enabled == "true") {
        let payload = {
          default: newImage.pk.S + " have just answered your last Quizz!",
          'APNS': {
            'aps': {
              'alert': newImage.pk.S + " have just answered your last Quizz!",
              'sound': 'default'
            }
          }
        };
        payload.APNS = JSON.stringify(payload.APNS);
        payload = JSON.stringify(payload);
        endpointArn =  await response.Item.endpointArn;
        console.log(endpointArn);
        console.log(payload);
        const paramsSNS = {
          Message: payload,
          MessageStructure: 'json',
          TargetArn: endpointArn
        };
        await sns.publish(paramsSNS).promise();
      } else {
        console.log("disabled");
      }
    } else {
      console.log("not found");
    }
  };

  if (data.dynamodb.NewImage.pk.S == "Anonymous") {
    await createNotif();
  } else if (data.eventName == "MODIFY" && newImage.sk.S.startsWith('friendOf')) {
    if (oldImage.lastQuizzAnswered == undefined && oldImage.detail == undefined) {
      console.log("in-first");
      await createNotif();
    } else if (oldImage.lastQuizzAnswered == undefined) {
      console.log("pass");
    } else if (newImage.lastQuizzAnswered.N != oldImage.lastQuizzAnswered.N) {
      await createNotif();
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "hello"
    }, null, 2)
  };
};
