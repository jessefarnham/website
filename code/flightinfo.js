const AWS = require('aws-sdk')
const dynamo = new AWS.DynamoDB.DocumentClient({region: 'us-east-1'})

const aircraftTableName = process.env.aircraftTableName
const pollerTableName = process.env.pollerTableName
const flightXml = process.env.flightXml

const maxMisses = 5
const defaultTailNumber = 'N76616'

const configKey = 'pollerConfig'
const numMissesKey = 'numMisses'
const activeTailNumberKey = 'activeTailNumber'


function respondHttp(cb) {
    return function(err, resp) {
        if (result.err){
            cb(result.err)
        }
        else {
            cb(null, {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(result.resp)
            })
        }
    }
}

function update(evt, ctx, cb) {
    dynamo.put({
            Item: item,
            TableName: aircraftTableName},
            respondHttp(cb)
    )
}

function get(evt, ctx, cb) {
    const tailNumber = evt.pathParameters.tailNumber
    dynamo.get(
        {
            Key: {
                tailNumber: tailNumber
            },
            TableName: aircraftTableName
        },
        respondHttp(cb)
    )
}

function list(evt, ctx, cb) {
    dynamo.scan(
        {TableName: aircraftTableName},
        respondHttp(cb)
    )
}

// restructure as async
function _updateWithFlightXml(activeTailNumber) {
    let flightXmlResult
    if (activeTailNumber === defaultTailNumber) {
        flightXmlResult =  {err: null, lat: 1.0, long: 2.0}
    }
    else {
        flightXmlResult = {err: null, lat: null, long: null}
    }
    console.log('Called mock flightXML, result=' + JSON.stringify(flightXmlResult))
    if (!flightXmlResult.err && flightXmlResult.lat && flightXmlResult.long) {
        // call lambda
        _update({tailNumber: activeTailNumber, isFlying: true,
            lat: flightXmlResult.lat, long: flightXmlResult.long})
        //make async
        _resetNumMisses()
    }
    else {
        // make async
        _incrementNumMisses()
    }
    return flightXmlResult
}

function poll(evt, ctx, cb) {
    dynamo.get(
        {
            Key: {
                configKey: configKey
            },
            TableName: pollerTableName
        },
        (err, data) => {
            if (err) {
                cb(err)
            }
            else {
                console.log('poll(), current config settings=' + JSON.stringify(data.Item))
                const activeTailNumber = data.Item[activeTailNumberKey] || 'N76616'
                const prevNumMisses = data.Item[numMissesKey] || 0
                if (prevNumMisses < maxMisses) {
                    const flightXmlUpdateResult = _updateWithFlightXml(activeTailNumber)
                    console.log('poll(), flightXmlUpdateResult=' + JSON.stringify(flightXmlUpdateResult))
                    if (flightXmlUpdateResult.err) {
                        cb(err)
                    }
                    else {
                        cb(null, flightXmlUpdateResult)
                    }
                }
                else {
                    console.log('poll(), no-op')
                    cb(null, 'no-op, awaiting next startPolling call')
                }
            }
        }
    )
}

function setActiveTailNumber(evt, ctx, cb) {
    const tailNumber = evt.pathParameters.tailNumber
    dynamo.update({
            Key: {configKey: configKey},
            UpdateExpression: `SET ${activeTailNumberKey} = :t`,
            ExpressionAttributeValues: {':t': tailNumber},
            TableName: pollerTableName},
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

function startPolling(evt, ctx, cb) {
    // make async
    let result = _resetNumMisses()
    if (result.err) {
        cb(result.err)
    }
    else {
        cb(null, {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(result.resp)
        })
    }
}

function _resetNumMisses(cb) {
    dynamo.update({
            Key: {configKey: configKey},
            UpdateExpression: `SET ${numMissesKey} = :n`,
            ExpressionAttributeValues: {':n': 0},
            TableName: pollerTableName},
        cb
    )
}


function _incrementNumMisses(cb) {
    dynamo.update({
            Key: {configKey: configKey},
            UpdateExpression: `SET ${numMissesKey} = ${numMissesKey} + :n`,
            ExpressionAttributeValues: {':n': 1},
            TableName: pollerTableName},
        cb
    )
}

function setConfig(evt, ctx, cb) {
    item = JSON.parse(evt.body)
    item.configKey = configKey
    dynamo.put({
            Item: item,
            TableName: pollerTableName},
        respondHttp(cb)
    )
}

module.exports = {
    update,
    get,
    list,
    poll,
    setActiveTailNumber,
    startPolling,
    setConfig
}
