export default defineWebSocketHandler({
    open(peer) {
        console.log('new ws connection')
    },

    close(peer, details) {
        console.log('ws closed')
    },

    error(peer, error) {
        console.log('error on ws')
    },

    message(peer, message) {
        const parsedData = JSON.parse(message.text())
        if (parsedData.type === 'offer') {
            peer.publish([...peer.topics][0], JSON.stringify({type: 'offer', data:  parsedData.data}))
            return
        }

        if (parsedData.type === 'answer') {
            peer.publish([...peer.topics][0], JSON.stringify({type: 'answer', data:  {id: peer.id, ...parsedData.data}}))
            return
        }

        if (parsedData.type === 'candidate') {
            peer.publish([...peer.topics][0], JSON.stringify({type: 'candidate', data:  parsedData.data}))
            return
        }

        if (parsedData.type === 'channel') {
            let room = parsedData.data
            peer.subscribe(room)
            peer.publish(room, JSON.stringify({type: 'joined', data: peer.id}))
            return
        }

        if (parsedData.type === 'leave') {
            peer.publish([...peer.topics][0], JSON.stringify({type: 'leave', data: peer.id}))
            peer.unsubscribe([...peer.topics][0])
            peer.close()
            return
        }
    },
    upgrade(req) {
        return {
            headers: {
                "x-powered-by": "cross-ws",
            },
        };
    },
})