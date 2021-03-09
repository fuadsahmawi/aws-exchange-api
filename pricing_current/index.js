var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = function(event, context, callback) {
    let currentMonth = (new Date().getMonth());
    let currentDay = new Date().getDate();
    let offset = 1614858960 - (new Date(2021, currentMonth, currentDay-1, 11, 56, 0).getTime()/1000.0);
    // let offset = 0;
    let timestampEnd = Math.floor(new Date().getTime()/1000.0) + offset;
    let timestampStart = (timestampEnd - 60);
    try {
        let assetSymbol = "TTK";
        var params = {
            "KeyConditionExpression": "assetSymbol = :assetSymbol AND #timestamp BETWEEN :timestampStart AND :timestampEnd",
            ExpressionAttributeNames: { "#timestamp": "timestamp" },
            "ExpressionAttributeValues": {
                ':assetSymbol': assetSymbol,
                ':timestampEnd': timestampEnd,
                ':timestampStart': timestampStart
            },
            "TableName": "pricing"
        };
        var result = dynamo.query(params).promise();
        
        result.then((data) => {
            if (data.Items[0] != null) {
                callback(null, data.Items[0]);
            } else {
                const response = {
                    statusCode: 400,
                    body: 'Invalid timestamp',
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