<template>
  <div id="videos" class="grid grid-cols-2 gap-2 p-2">
    <video ref="localVideo" class="bg-black w-full h-[300px]" autoplay muted playsinline></video>
    <video ref="remoteVideo" class="bg-black w-full h-[300px]" autoplay></video>
  </div>
</template>

<script lang="ts" setup>
let localStream: MediaStream;
let remoteStream: MediaStream;
let peerConnection: RTCPeerConnection;
let localVideo = ref<HTMLVideoElement|null>(null);
let remoteVideo = ref<HTMLVideoElement|null>(null);
let client;
let channel;
let token = null;
let uid = String(Math.floor(Math.random() * 10000))
let route = useRoute()

definePageMeta({
    validate: (route) => {
        return Boolean(route.query.room)
    }
})

let createPeerConnection = async (send: (data: string | Blob | ArrayBuffer, useBuffer?: boolean) => boolean, id: string) => {
    peerConnection = new RTCPeerConnection({
        iceServers: [
            {urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']},
        ]
    })
    remoteStream = new MediaStream()
    remoteVideo.value!.srcObject = remoteStream

    localStream.getTracks().forEach((track) => { 
        peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            send(JSON.stringify({
                type: 'candidate',
                data: {
                    id,
                    candidate: event.candidate
                }
            }))
        }
    }
}

let createOffer = async (send: (data: string | Blob | ArrayBuffer, useBuffer?: boolean) => boolean, id: string) => {
    await createPeerConnection(send, id)
    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    send(JSON.stringify({
        type: 'offer',
        data: {
            id,
            offer
        }
    }))
}

let createAnswer = async (send: (data: string | Blob | ArrayBuffer, useBuffer?: boolean) => boolean, id: string, offer) => {
    await createPeerConnection(send, id)

    await peerConnection.setRemoteDescription(offer)
    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    send(JSON.stringify({
        type: 'answer',
        data: {
            id,
            answer
        }
    }))
}

let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer)
    }
}

onMounted(async () => {
    const {status, data, send, open, close} = useWebSocket(`ws://${location.host}/api/websocket`, {
        onMessage(ws, event) {
            let message = JSON.parse(event.data)
            if (message.type === 'joined') {
                createOffer(send, message.data)
                return
            }

            if (message.type === 'offer') {
                createAnswer(send, message.data.id, message.data.offer)
                console.log(message.data.offer)
                return
            }

            if (message.type === 'answer') {
                addAnswer(message.data.answer)
                return
            }

            if (message.type === 'candidate') {
                if (peerConnection) {
                    peerConnection.addIceCandidate(message.data.candidate)
                    return
                }
            }
        }
    })
    send(JSON.stringify({type: 'channel', data: route.query.room}))

    localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: false})
    localVideo.value!.srcObject = localStream
})
</script>

<style>

</style>