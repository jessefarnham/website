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


function respondHttp(cb, extractor) {
    return function(err, resp) {
        if (err){
            cb(err)
        }
        else {
            let _extractor = extractor || function(resp) {return resp};
            cb(null, {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(_extractor(resp))
            })
        }
    }
}

function update(evt, ctx, cb) {
    let item = JSON.parse(evt.body)
    _update(item, cb)
}

function _update(item, cb) {
    console.log('update(), item=' + JSON.stringify(item))
    dynamo.put({
            Item: item,
            TableName: aircraftTableName},
            respondHttp(cb)
    )
}

function get(evt, ctx, cb) {
    const tailNumber = evt.pathParameters.tailNumber;
    _get(tailNumber, cb)
}

function _get(tailNumber, cb) {
    dynamo.get(
        {
            Key: {
                tailNumber: tailNumber
            },
            TableName: aircraftTableName
        },
        respondHttp(cb, function(resp) {return resp.Item})
    )
}

function list(evt, ctx, cb) {
    dynamo.scan(
        {TableName: aircraftTableName},
        respondHttp(cb)
    )
}

function _updateWithFlightXml(activeTailNumber, cb) {
    let flightXmlResult
    if (activeTailNumber === defaultTailNumber) {
        flightXmlResult =  {err: null, lat: 1.0, long: 2.0}
    }
    else {
        flightXmlResult = {err: null, lat: null, long: null}
    }
    console.log('Called mock flightXML, result=' + JSON.stringify(flightXmlResult))
    let payload
    let numMissOperation
    if (!flightXmlResult.err && flightXmlResult.lat && flightXmlResult.long) {
        console.log('Aircraft is flying')
        payload = {tailNumber: activeTailNumber, isFlying: true,
                   lat: flightXmlResult.lat, long: flightXmlResult.long}
        numMissOperation = _resetNumMisses
    }
    else {
        console.log('Aircraft not flying or flightXmlError')
        payload = {tailNumber: activeTailNumber, isFlying: false,
            lat: null, long: null}
        numMissOperation = _incrementNumMisses
    }
    let callback = function(err, updateResp) {
        if (err){
            _incrementNumMisses(cb)
            cb(err)
        }
        else {
            numMissOperation(cb)
        }
    }
    _update(payload, callback)
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
                const activeTailNumber = data.Item[activeTailNumberKey] || defaultTailNumber
                const prevNumMisses = data.Item[numMissesKey] || 0
                if (prevNumMisses < maxMisses) {
                    console.log('poll(), calling updateWithFlightXml')
                    _updateWithFlightXml(activeTailNumber, cb)
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
        respondHttp(cb)
    )
}

function getActiveFlightInfo(evt, ctx, cb) {
    dynamo.get(
        {
            Key: {
                configKey: configKey
            },
            TableName: pollerTableName
        },
        function (err, resp) {
            if (err) {
                cb(err)
            }
            else {
                _get(resp.Item.activeTailNumber || defaultTailNumber, cb)
            }
        }
    )
}

function startPolling(evt, ctx, cb) {
    console.log('startPolling')
    _resetNumMisses(cb)
}

function _resetNumMisses(cb) {
    console.log('resetNumMisses()')
    dynamo.update({
            Key: {configKey: configKey},
            UpdateExpression: `SET ${numMissesKey} = :n`,
            ExpressionAttributeValues: {':n': 0},
            TableName: pollerTableName},
        cb
    )
}


function _incrementNumMisses(cb) {
    console.log('incrementNumMisses()')
    dynamo.update({
            Key: {configKey: configKey},
            UpdateExpression: `SET ${numMissesKey} = ${numMissesKey} + :n`,
            ExpressionAttributeValues: {':n': 1},
            TableName: pollerTableName},
        cb
    )
}

function setConfig(evt, ctx, cb) {
    let item = JSON.parse(evt.body)
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
    getActiveFlightInfo,
    setActiveTailNumber,
    startPolling,
    setConfig
}

