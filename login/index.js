var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = function(event, context, callback) {
    var username = event.username;
    var password = event.password;
    if (username === "" || password === "" || username === undefined || password === undefined) {
        const response = {
                    statusCode: 400,
                    body: 'Wrong Username or password',
        };
        callback(JSON.stringify(response));
    }
    try {
        var params = {
            "Key": {
                "username": username, 
                "password": password
            },
            "ProjectionExpression": "username, email, firstName, lastName, nric, phoneNumber, address, accountKey",
            "TableName": "accounts"
        }
        var result = dynamo.get(params).promise();
        
        result.then((data) => {
            if (data.Item != null) {
                callback(null, data.Item);
            } else {
                const response = {
                    statusCode: 400,
                    body: 'Wrong Username or password',
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
