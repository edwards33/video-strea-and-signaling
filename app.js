const Hexnut = require('hexnut')
const handle = require('hexnut-handle')

const express = require('express')
const port = 3000
const app = express()

app.use(express.static(__dirname + '/public'))

app.get('/', (req, res) => {
    res.render('index.ejs')
})

const server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}! Go to http://localhost:${port}/`)
})

const wsApp = new Hexnut({
    server
})

const sendJsonMiddleware = (ctx, next) => {
    if (ctx.isConnection) {
        ctx.sendJson = data => ctx.send(JSON.stringify(data))
    }
    return next()
}

//sendToAll

const sendJsonToAllMiddleware = (ctx, next) => {
    if (ctx.isConnection) {
        ctx.sendJsonToAll = data => ctx.sendToAll(JSON.stringify(data))
    }
    return next()
}

const parseJsonMessages = (ctx, next) => {
    if (ctx.isMessage) {
        try {
            const parsed = JSON.parse(ctx.message)
            ctx.message = parsed
        } catch (ex) {
            // Skip if messages can't be parsed
        }
    }
    return next()
}

wsApp.use(sendJsonMiddleware)
wsApp.use(parseJsonMessages)
wsApp.use(sendJsonToAllMiddleware)


wsApp.use(handle.connect(ctx => {
    ctx.messageCount = 0
    console.log('{ type: welcome, payload: You connected }')
    ctx.sendJson({ type: 'welcome', payload: {text: 'You connected!' }})
}))

wsApp.use(handle.message(ctx => {
    ctx.messageCount += 1
    console.info(ctx.message)

    if(ctx.message.type === 'ready'){
        ctx.sendJsonToAll({ type: 'announce', payload: {text: 'response to: ' + ctx.message.payload.text}})
    }

    if(ctx.message.type === 'send'){
        ctx.sendJsonToAll({
            type: 'message',
            payload: {
                text: ctx.message.payload.text,
                author: ctx.message.payload.author
            }
        })
    }

}))

wsApp.start()