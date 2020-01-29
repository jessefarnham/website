const AWS = require('aws-sdk')
const dynamo = new AWS.DynamoDB.DocumentClient({region: 'us-east-1'})

const aircraftTableName = process.env.aircraftTableName
const pollerTableName = process.env.pollerTableName
const flightXml = process.env.flightXml

const maxMisses = 5
const defaultTailNumber = 'N76616'

const configKey = pollerConfig
const numMissesKey = 'numMisses'
const activeTailNumberKey = 'activeTailNumber'

function update(evt, ctx, cb) {
    let result = _update(JSON.parse(evt.body))
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

function _update(item) {
    let _err = null
    let _resp = null
    dynamo.put({
            Item: item,
            TableName: aircraftTableName},
        (err, resp) => {
            _err = err
            _resp = resp
        }
    )
    return {err: _err, resp: _resp}
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
        {TableName: aircraftTableName},
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
        _update({tailNumber: activeTailNumber, isFlying: true,
            lat: flightXmlResult.lat, long: flightXmlResult.long})
        _resetNumMisses()
    }
    else {
        _incrementNumMisses()
    }
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
                    console.log('poll(), flighXmlUpdateResult=' + JSON.stringify(flightXmlUpdateResult))
                    if (flightXmlResult.err) {
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
            Key: {configKey: activeTailNumberKey},
            UpdateExpression: `SET ${activeTailNumberKey} = ${tailNumber}`,
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
            body: JSON.stringify(resp)
        })
    }
}

function _resetNumMisses() {
    let _err = null
    let _resp = null
    dynamo.update({
            Key: {configKey: configKey},
            UpdateExpression: `SET ${numMissesKey} = 0`,
            TableName: pollerTableName},
        (err, resp) => {
            _err = err
            _resp = resp
        }
    )
    return {err: _err, resp: _resp}
    console.log('Called resetNumMisses, result=' + JSON.stringify(result))
}


function _incrementNumMisses() {
    let _err = null
    let _resp = null
    dynamo.update({
            Key: {configKey: configKey},
            UpdateExpression: `SET ${numMissesKey} = ${numMissesKey} + 1`,
            TableName: pollerTableName},
        (err, resp) => {
            _err = err
            _resp = resp
        }
    )
    let result =  {err: _err, resp: _resp}
    console.log('Called incrementNumMisses, result=' + JSON.stringify(result))
}

module.exports = {
    update,
    get,
    list,
    poll,
    setActiveTailNumber,
    startPolling
}
