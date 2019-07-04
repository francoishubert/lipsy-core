'use strict';

const uniqid = require('uniqid');
const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

const createQuizz  =  async (id) => {
  const params = {
    TableName: "LipsyQuizz",
    Item: {
      pk: id,
      sk: "QUIZZ",
      detail: Date.now()
    }
  };
  await db.put(params).promise();
};

const createQuizzDetails  =  async (id, userId, quizz) => {
  const params = {
    TableName: "LipsyQuizz",
    Item: {
      pk: id,
      sk: userId,
      question: quizz.question,
      answers: quizz.answers,
      correctAnswer: quizz.correctAnswer,
      detail: Date.now()
    }
  };
  await db.put(params).promise();
};

module.exports.handler = async (event) => {

  const data = JSON.parse(event.body);
  const quizz = data.quizz;
  const userId = `quizzOf${data.userId}`;
  const id = "q" + uniqid();

  const createQuizzPromise = createQuizz(id);
  const createQuizzDetailsPromise = createQuizzDetails(id, userId, quizz);

  const create = await createQuizzPromise;
  const createDetails = await createQuizzDetailsPromise;

  return {
    statusCode: 200,
    body: JSON.stringify({
      quizzId: id,
      url: "https://www.lipsy.co/quizz"
    }, null, 2)
  };
};
