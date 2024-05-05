const aws = require('aws-sdk');
const { nanoid } = require('nanoid');

const ses = new aws.SES({ region: 'us-east-1' });
const documentClient = new aws.DynamoDB.DocumentClient({ region: 'us-east-1' });
const sqs = new aws.SQS({ region: 'us-east-1' });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

exports.createOrder = async (event) => {
  const ORDER_TABLE_NAME = process.env.ORDER_TABLE_NAME;
  const ORDER_PROCESSING_QUEUE_URL = process.env.ORDER_PROCESSING_QUEUE_URL;
  const { body } = event;
  const { orderName, items } = JSON.parse(body);
  const orderId = nanoid();

  const order = {
    orderId,
    orderName,
    orderItems: items,
  };

  const putParams = {
    TableName: ORDER_TABLE_NAME,
    Item: order,
  };
  // persist order in dynamoDb

  await documentClient.put(putParams).promise();

  console.log(`Order ${orderId} created`);

  // add the persisted order in the queue which will notify the administrator

  const { MessageId } = await sqs
    .sendMessage({
      QueueUrl: ORDER_PROCESSING_QUEUE_URL,
      MessageBody: JSON.stringify({ order, admin: ADMIN_EMAIL }),
    })
    .promise();

  console.log(`Message ${MessageId} sent to queue`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      order,
      messageId: MessageId,
    }),
  };
};
