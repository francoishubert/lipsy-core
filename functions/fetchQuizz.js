'use strict';

const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

module.exports.handler = async (event) => {

  const quizzId = event.pathParameters.quizzId;
  const userId = event.pathParameters.userId;

  var params = {
    TableName: 'LipsyQuizz',
    Key: {
      pk: quizzId,
      sk: `quizzOf${userId}`
    }
  };

  const body = await db.get(params).promise();
  const item = body.Item;
  if (item == undefined) {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({}, null, 2)
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      questionId: quizzId,
      question: item.question,
      answers: item.answers,
      correctAnswer: item.correctAnswer
    }, null, 2)
  };
};
