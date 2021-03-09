var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = function(event, context, callback) {
    var accountKey = event.accountKey;
    var assetSymbol = "TTK";
    var orderType = event.orderType;
    var assetAmount = event.assetAmount;
    if (accountKey === "" || orderType === "" || assetAmount === "" || accountKey === undefined || orderType === undefined || assetAmount === undefined ) {
        const response = {
            statusCode: 400,
            body: 'Request body parameters invalid/missing',
        };
        callback(JSON.stringify(response));
    }
    assetAmount = Number(assetAmount);
    if (assetAmount <= 0) {
        const response = {
            statusCode: 400,
            body: 'assetAmount must be more than 0',
        };
        callback(JSON.stringify(response));
    }
    var currentPrice = 0;
    getCurrentAssetPrice().then((value) => {
        currentPrice = value;
        if (currentPrice == 0) {
            const response = {
                statusCode: 400,
                body: 'Invalid timestamp',
            };
            callback(JSON.stringify(response));
        }
        var assetTotalPrice = Math.round(((currentPrice * assetAmount) + Number.EPSILON) * 100) / 100;
        
        try {
            var params = {
                "Key": {
                    "accountKey": accountKey
                },
                "TableName": "wallets"
            };
            var result = dynamo.get(params).promise();
            
            result.then((data) => {
                if (data.Item != null) {
                    var transactionId = Math.floor(100000 + Math.random() * 900000);
                    var timestamp = Math.floor(new Date().getTime()/1000.0);
                    if ("BUY" == orderType.toUpperCase()) {
                        if (data.Item.cashBalance >= assetTotalPrice) {
                            var assetBalance = data.Item.assetBalance + assetAmount;
                            var cashBalance = Math.round(((data.Item.cashBalance - assetTotalPrice) + Number.EPSILON) * 100) / 100;
                            params = {
                                TransactItems: [{
                                    Put: {
                                        TableName : 'transactions',
                                        Item: {
                                            "accountKey": accountKey,
                                            "transactionId": transactionId,
                                            "timestamp": timestamp,
                                            "assetSymbol": assetSymbol,
                                            "orderType": "BUY",
                                            "assetAmount": assetAmount,
                                            "assetPrice": currentPrice,
                                            "cashAmount": assetTotalPrice
                                        }
                                    }
                                }, {
                                    Update: {
                                        TableName: "wallets",
                                        Key: {
                                          "accountKey": accountKey
                                        },
                                        UpdateExpression: "SET cashBalance = :cashBalance, assetBalance = :assetBalance",
                                        ExpressionAttributeValues: {
                                          ":cashBalance": cashBalance,
                                          ":assetBalance": assetBalance
                                        }
                                    }
                                }]
                            };
                            dynamo.transactWrite(params).promise();
                        } else {
                            const response = {
                                statusCode: 400,
                                body: 'Insufficient cash',
                            };
                            callback(JSON.stringify(response));
                        }
                    } else if ("SELL" == orderType.toUpperCase()) {
                        if (assetAmount <= data.Item.assetBalance) {
                            assetBalance = data.Item.assetBalance - assetAmount;
                            cashBalance = Math.round(((data.Item.cashBalance + assetTotalPrice) + Number.EPSILON) * 100) / 100;
                            params = {
                                TransactItems: [{
                                    Put: {
                                        TableName : 'transactions',
                                        Item: {
                                            "accountKey": accountKey,
                                            "transactionId": transactionId,
                                            "timestamp": timestamp,
                                            "assetSymbol": assetSymbol,
                                            "orderType": "SELL",
                                            "assetAmount": assetAmount,
                                            "assetPrice": currentPrice,
                                            "cashAmount": assetTotalPrice
                                        }
                                    }
                                }, {
                                    Update: {
                                        TableName: "wallets",
                                        Key: {
                                          "accountKey": accountKey
                                        },
                                        UpdateExpression: "SET cashBalance = :cashBalance, assetBalance = :assetBalance",
                                        ExpressionAttributeValues: {
                                          ":cashBalance": cashBalance,
                                          ":assetBalance": assetBalance
                                        }
                                    }
                                }]
                            };
                            dynamo.transactWrite(params).promise();
                        } else {
                            const response = {
                            statusCode: 400,
                            body: 'Insufficient assets',
                            };
                            callback(JSON.stringify(response));
                        }
                    } else {
                        const response = {
                            statusCode: 400,
                            body: 'orderType must either be buy or sell',
                        };
                        callback(JSON.stringify(response));
                    }
                } else {
                    const response = {
                        statusCode: 400,
                        body: 'Invalid accountKey',
                    };
                    callback(JSON.stringify(response));
                }
                const response = {
                    accountKey: accountKey,
                    transactionId: transactionId,
                    assetSymbol: assetSymbol,
                    assetAmount: assetAmount,
                    assetPrice: currentPrice,
                    cashAmount: assetTotalPrice,
                    orderType: orderType,
                    timestamp: timestamp,
                    assetBalance: assetBalance,
                    cashBalance: cashBalance
                };
                callback(null, response);
            });
        } catch (error) {
            const response = {
                statusCode: 500,
                body: 'Unable to fetch from DB',
            };
            callback(JSON.stringify(response));
        }
    });
};

async function getCurrentAssetPrice () {
    let currentMonth = (new Date().getMonth());
    let currentDay = new Date().getDate();
    let offset = 1614858960 - (new Date(2021, currentMonth, currentDay-1, 11, 56, 0).getTime()/1000.0);
    // let offset = 0;
    let timestampEnd = Math.floor(new Date().getTime()/1000.0) + offset;
    let timestampStart = (timestampEnd - 60);
    var price;
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
        
        await result.then((data) => {
            if (data.Items[0] != null) {
                price = data.Items[0].price;
            } else {
                price = 0;
            }
        });
    } catch (error) {
        return 0;
    }
    return price;
}