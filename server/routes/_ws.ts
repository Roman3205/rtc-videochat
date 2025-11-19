type User = {
    id: string,
    room: string
}

const users:User[] = [];

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

        switch (parsedData.type) {
            case 'offer':
                peer.publish([...peer.topics][0], JSON.stringify({type: 'offer', data:  parsedData.data}))
                break

            case 'answer':
                peer.publish([...peer.topics][0], JSON.stringify({type: 'answer', data:  {id: peer.id, ...parsedData.data}}))
                break

            case 'candidate':
                peer.publish([...peer.topics][0], JSON.stringify({type: 'candidate', data:  parsedData.data}))
                break

            case 'channel':
                let room = parsedData.data
                let userInRoom = users.filter(u => u.room === room)
                if (userInRoom.length == 2) {
                    peer.close(4001, 'Room is full')
                    break
                }

                peer.send(JSON.stringify({type: 'channel', data: peer.id}))
                
                peer.subscribe(room)
                peer.publish(room, JSON.stringify({type: 'joined', data: peer.id}))
                users.push({id: peer.id, room: room})
                break

            case 'leave':
                peer.publish([...peer.topics][0], JSON.stringify({type: 'leave', data: peer.id}))
                let user = users.findIndex(u => u.id === peer.id)
                users.splice(user, 1)
                peer.unsubscribe([...peer.topics][0])
                peer.close()
                break
        }
    },
    upgrade(req) {
        return {
            headers: {
                // "x-powered-by": "cross-ws",
            },
        };
    },
})