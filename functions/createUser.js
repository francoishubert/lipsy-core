'use strict';

const uniqid = require('uniqid');
const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

module.exports.handler = async (event) => {

  const data = JSON.parse(event.body);
  let userId = "u" + uniqid();
  const externalId = data.externalId;
  let name;
  if (data.name == "") {
    name = "NONE";
  } else {
    name = data.name;
  }

  const params = {
    TableName: "LipsyQuizz",
    Item: {
      pk: userId,
      sk: "USER",
      detail: Date.now()
    },
    ConditionExpression: "attribute_not_exists(pk)"
  };

  const params2 = {
    TableName: "LipsyQuizz",
    Item: {
      pk: userId,
      sk: externalId,
      detail: Date.now(),
      name: name
    }
  };

  const params3 = {
    TableName: 'LipsyQuizz',
    IndexName: 'sk-detail-index',
    KeyConditionExpression: 'sk = :hkey',
    ExpressionAttributeValues: {
      ':hkey': externalId
    }
  };


  const updateName = async (user) => {
    const paramsUpdateName = {
      TableName: "LipsyQuizz",
      Key: {
        pk: user,
        sk: externalId
      },
      AttributeUpdates: {
        "name": {
          Action: "PUT",
          Value: name
        }
      }
    };
    await db.update(paramsUpdateName).promise();
  }

  try {
    const response = await db.query(params3).promise();
    if (response.Count == 0) {
      await db.put(params).promise();
      await db.put(params2).promise();
    } else {
      if (response.Items[0].name != name) {
        await updateName(response.Items[0].pk);
      }
      userId = response.Items[0].pk;
    }
  }
  catch(error) {
    console.log(error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      userId: userId
    }, null, 2)
  };
};
