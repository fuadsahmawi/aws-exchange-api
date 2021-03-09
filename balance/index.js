var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = function(event, context, callback) {
    var accountKey = event.accountKey;
    if (accountKey === "" || accountKey === undefined) {
        const response = {
            statusCode: 400,
            body: 'Invalid accountKey',
        };
        callback(JSON.stringify(response));
    }
    try {
        var params = {
            "Key": {
                "accountKey": accountKey
            },
            "TableName": "wallets"
        }
        var result = dynamo.get(params).promise();
        
        result.then((data) => {
            if (data.Item != null) {
                callback(null, data.Item);
            } else {
                const response = {
                    statusCode: 400,
                    body: 'Invalid accountKey',
                };
                callback(JSON.stringify(response));
            }
        });
    } catch (error) {
        const response = {
            statusCode: 500,
            body: 'Unable to fetch from DB',
        };
        callback(JSON.stringify(response));
    }
};