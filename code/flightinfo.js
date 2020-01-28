const AWS = require('aws-sdk')
const dynamo = new AWS.DynamoDB.DocumentClient({region: 'us-east-1'})

const tableName = process.env.aircraftTableName

function update(evt, ctx, cb) {
    const item = JSON.parse(evt.body)
    dynamo.put({
        Item: item,
        TableName: tableName},
        (err, resp) => {
            if (err) {
                cb(err)
            }
            else {
                cb(null, {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(resp)
                })
            }
        }
    )
}

function get(evt, ctx, cb) {
    const tailNumber = evt.pathParameters.tailnumber
    dynamo.get(
        {
            Key: {
                tailNumber: tailNumber
            },
            TableName: tableName
        },
        (err, data) => {
            if (err) {
                cb(err)
            }
            else {
                const flightInfo = data.Item
                cb(null, {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(flightInfo)
                })
            }
        }
    )
}

function list(evt, ctx, cb) {
    dynamo.scan(
        {TableName: tableName},
        (err, data) => {
            if (err) {
                cb(err)
            }
            else {
                const flightInfos = data.Items
                cb(null, {
                    statusCode: 200,
                    headers : {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(flightInfos)
                })
            }
        }
    )


}

module.exports = {
    update,
    get,
    list
}