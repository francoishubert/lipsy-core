'use strict';

const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

const createFriend = async (friendId) => {
  const params = {
    TableName: "LipsyQuizz",
    Item: {
      pk: friendId,
      sk: "FRIEND",
      detail: Date.now()
    },
    ConditionExpression: "attribute_not_exists(pk)"
  };
  try {
    await db.put(params).promise();
  }
  catch(error) {
    console.log(error);
  }
};

const setQuizzTimestamp = async (friendId, friendUserId, quizzTimestamp) => {
  const params = {
    TableName: "LipsyQuizz",
    Key: {
      pk: friendId,
      sk: friendUserId
    },
    AttributeUpdates: {
      "lastQuizzAnswered": {
        Action: "PUT",
        Value: quizzTimestamp.last
      }
    }
  };
  await db.update(params).promise();
};

const updateFriendScore = async (friendId, userId, rightAnswer, wrongAnswer, quizzTimestamp) => {
  const friendUserId = `friendOf${userId}`;
  const params = {
    TableName: "LipsyQuizz",
    Key: {
      pk: friendId,
      sk: friendUserId
    },
    UpdateExpression: "ADD questionAnswered :q, rightAnswer :r, wrongAnswer :w, detail :b",
    ExpressionAttributeValues:{
      ":b": rightAnswer,
      ":q": 1,
      ":r": rightAnswer,
      ":w": wrongAnswer,
      ":v_sub": quizzTimestamp.last
    },
    ConditionExpression: "lastQuizzAnswered <> :v_sub"
  };
  try {
    await db.update(params).promise();
    await setQuizzTimestamp(friendId, friendUserId, quizzTimestamp);
  }
  catch(error) {
    await setQuizzTimestamp(friendId, friendUserId, quizzTimestamp);
    return "quizz already answered";
  }
};

const setFriendConsecutiveAnswer = async (friendId, friendUserId, quizzTimestamp, action) => {
  const params = {
    TableName: "LipsyQuizz",
    Key: {
      pk: friendId,
      sk: friendUserId
    },
    AttributeUpdates: {
      "consecutiveAnswer": {
        Action: action,
        Value: 1
      }
    }
  };
  await db.update(params).promise();
};

const updateFriendConsecutiveAnswer = async (friendId, userId, quizzTimestamp) => {
  const friendUserId = `friendOf${userId}`;
  console.log(quizzTimestamp.previous);
  const params = {
    TableName: "LipsyQuizz",
    Key: {
      pk: friendId,
      sk: friendUserId
    },
    UpdateExpression: "ADD consecutiveAnswer :a",
    ExpressionAttributeValues:{
      ":a": 1,
      ":t": quizzTimestamp.previous,
      ":v_sub": quizzTimestamp.last
    },
    ConditionExpression: "lastQuizzAnswered = :t AND NOT contains (lastQuizzAnswered, :v_sub)"
  };
  try {
    await db.update(params).promise();
    await setFriendConsecutiveAnswer(friendId, friendUserId, quizzTimestamp, "ADD");
  }
  catch(error) {
    await setFriendConsecutiveAnswer(friendId, friendUserId, quizzTimestamp, "PUT");
  }
};

const getQuizzTimestamps = async (userId) => {
  const quizzUserId = `quizzOf${userId}`;
  var params = {
    TableName: 'LipsyQuizz',
    Limit: "2",
    IndexName: 'sk-detail-index',
    KeyConditionExpression: 'sk = :hkey',
    ExpressionAttributeValues: {
      ':hkey': quizzUserId
    },
    ScanIndexForward: false
  };
  const body = await db.query(params).promise();
  if (body.Items.length < 2) {
    return {
      last: body.Items[0].detail,
      previous: 0
    };
  }
  return {
    last: body.Items[0].detail,
    previous: body.Items[1].detail
  };
};

module.exports.handler = async (event) => {

  const data = JSON.parse(event.body);
  const friendId = data.friendId.trim();
  const userId = data.userId;
  const rightAnswer = data.rightAnswer;
  const wrongAnswer = data.wrongAnswer;
  let result;

  if (friendId == "Anonymous") {
    const fdId = `friendOf${userId}`;
    const params = {
      TableName: 'LipsyQuizz',
      Key: {
        pk: "Anonymous",
        sk: fdId
      },
      AttributeUpdates: {
        'detail': {
          Action: "ADD",
          Value: 1
        }
      }
    };
    await db.update(params).promise();
  } else {
    const quizzTimestamp = await getQuizzTimestamps(userId);
    await updateFriendConsecutiveAnswer(friendId, userId, quizzTimestamp);

    const updateFriendScorePromise = updateFriendScore(friendId, userId, rightAnswer, wrongAnswer, quizzTimestamp);
    const createFriendPromise = createFriend(friendId);

    await createFriendPromise;
    result = await updateFriendScorePromise;
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      questionId: result
    }, null, 2)
  };
};
