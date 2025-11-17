export default defineWebSocketHandler({
    open(peer) {
        // peer.send('Connected to ws')
    },

    close(peer, details) {
        console.log('closed ws')
    },

    error(peer, error) {
        console.log('error on ws')
    },

    message(peer, message) {
        const parsedData = JSON.parse(message.text())
        if (parsedData.type === 'offer') {
            peer.publish([...peer.topics][0], parsedData.data)
            return
        }

        if (parsedData.type === 'answer') {
            peer.publish([...peer.topics][0], parsedData.data)
            return
        }

        if (parsedData.type === 'candidate') {
            peer.publish([...peer.topics][0], parsedData.data)
            return
        }

        if (parsedData.type === 'channel') {
            let room = parsedData.data
            peer.subscribe(room)
            peer.publish(room, JSON.stringify({type: 'joined', data: peer.id}))
            return
        }
    },
})