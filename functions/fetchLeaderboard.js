'use strict';

const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

module.exports.handler = async (event) => {

  const userId = event.pathParameters.userId;
  const id = `friendOf${userId}`;

  var params = {
    TableName: 'LipsyQuizz',
    Limit: "30",
    IndexName: 'sk-detail-index',
    KeyConditionExpression: 'sk = :hkey',
    ExpressionAttributeValues: {
      ':hkey': id
    },
    ScanIndexForward: false
  };

  let totalAnswers = 0;
  let anonymousAnswers = 0;
  let body = await db.query(params).promise();
  body.Items.forEach((item) => {
    if (item.pk == "Anonymous") {
      anonymousAnswers = item.detail;
      totalAnswers += item.detail;
    } else {
      totalAnswers += item.questionAnswered;
    }
  });
  const cleanedArray = body.Items.filter(item => item.pk != "Anonymous");
  const newBody = { Items: cleanedArray };

  return {
    statusCode: 200,
    body: JSON.stringify({
      leaderBoard: newBody,
      totalAnswers: totalAnswers,
      anonymousAnswers: anonymousAnswers
    }, null, 2)
  };
};
