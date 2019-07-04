'use strict';

const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

module.exports.handler = async (event) => {

  let randomQuestions;

  var params = {
    TableName : 'LipsyRandomQuestion',
  };

  const response = await db.scan(params).promise();
  randomQuestions = response.Items;
  console.log(randomQuestions)

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      questions: randomQuestions
    }, null, 2)
  };
};
