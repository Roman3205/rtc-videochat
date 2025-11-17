<template>
  <div class="h-screen">
    <div id="videos" class="grid grid-cols-1 h-screen overflow-hidden relative">
        <video ref="localVideo" :class="{
            'bg-black h-[230px] rounded-lg object-cover absolute top-5 left-5': userJoined,
            'bg-black w-full h-full object-cover': !userJoined
        }" autoplay muted playsinline></video>
        <video v-show="userJoined" ref="remoteVideo" class="bg-black w-full h-full object-cover"  autoplay></video>
    </div>
    <div class="flex items-center gap-5 absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <UButton @click="toggleMic" class="rounded-full text-white cursor-pointer p-4 text-2xl" color="info" size="xl" :icon="micIcon"></UButton>
        <UButton @click="toggleCamera" class="rounded-full text-white cursor-pointer p-4 text-2xl" color="info" size="xl" :icon="cameraIcon"></UButton>
        <UButton @click="copyLink" class="rounded-full text-white cursor-pointer p-4 text-2xl" color="info" size="xl" icon="lucide:circle-plus"></UButton>
        <NuxtLink to="/">
            <UButton @click="leaveChannel" class="rounded-full text-white cursor-pointer p-4 text-2xl" color="error" size="xl" icon="lucide:phone"></UButton>
        </NuxtLink>
    </div>
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
const toast = useToast()
let route = useRoute()
let userJoined = ref(false)
const ws = ref<any>({})
const cameraOff = ref(false)
const micOff = ref(false)
const constraints = {
    video: {
        width: {
            min: 640,
            ideal: 1920,
            max: 1920
        },
        height: {
            min: 480,
            ideal: 1080,
            max: 1080
        }
    },
    audio: true
}

let cameraIcon = computed(() => {
    return cameraOff.value ? 'lucide:camera-off' : 'lucide:camera'
})

let micIcon = computed(() => {
    return micOff.value ? 'lucide:mic-off' : 'lucide:mic'
})

let createPeerConnection = async (send: (data: string | Blob | ArrayBuffer, useBuffer?: boolean) => boolean) => {
    peerConnection = new RTCPeerConnection({
        iceServers: [
            {urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']},
        ]
    })
    remoteStream = new MediaStream()
    remoteVideo.value!.srcObject = remoteStream
    userJoined.value = true

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia(constraints)
        localVideo.value!.srcObject = localStream
    }

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
                data: event.candidate
            }))
        }
    }
}

let userLeft = () => {
    if (peerConnection) {
        peerConnection.getReceivers().forEach((receiver) => {
            receiver.track?.stop()
        })
        peerConnection.close()
    }
    remoteVideo.value!.srcObject = null
    userJoined.value = false
}

let createOffer = async (send: (data: string | Blob | ArrayBuffer, useBuffer?: boolean) => boolean) => {
    await createPeerConnection(send)
    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    send(JSON.stringify({
        type: 'offer',
        data: offer
    }))
}

let createAnswer = async (send: (data: string | Blob | ArrayBuffer, useBuffer?: boolean) => boolean, offer) => {
    await createPeerConnection(send)

    await peerConnection.setRemoteDescription(offer)
    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    send(JSON.stringify({
        type: 'answer',
        data: answer
    }))
}

let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer)
    }
}

let leaveChannel = () => {
    if (ws.value) {
        ws.value.send(JSON.stringify({type: 'leave'}))
    }

    if (!userJoined.value) {
        localStream.getTracks().forEach((track) => {
            track.stop()
        })
    }
}

let toggleCamera = async () => {
    let videoTrack = localStream.getVideoTracks()[0]
    if (!videoTrack) return
    if(videoTrack.enabled) {
        videoTrack.enabled = false
        cameraOff.value = true
    } else {
        videoTrack.enabled = true
        cameraOff.value = false
    }
}

let toggleMic = async () => {
    let audioTrack = localStream.getAudioTracks()[0]
    if (!audioTrack) return
    if(audioTrack.enabled) {
        audioTrack.enabled = false
        micOff.value = true
    } else {
        audioTrack.enabled = true
        micOff.value = false
    }
}

let copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    toast.add({title: 'Link copied to clipboard', color: 'success'})
}

onMounted(async () => {
    window.addEventListener("beforeunload", leaveChannel);
    const {status, data, send, open, close} = useWebSocket(`ws://${location.host}/api/websocket`, {
        onMessage(ws, event) {
            let message = JSON.parse(event.data)
            if (message.type === 'joined') {
                createOffer(send)
                return
            }

            if (message.type === 'offer') {
                createAnswer(send, message.data)
                return
            }

            if (message.type === 'answer') {
                addAnswer(message.data)
                toast.add({title: `User ${message.data.id} joined the call.`, color: 'info'})
                return
            }

            if (message.type === 'candidate') {
                if (peerConnection) {
                    peerConnection.addIceCandidate(message.data)
                    return
                }
            }

            if (message.type === 'leave') {
                userLeft()
                toast.add({title: `User ${message.data} left the call.`, color: 'info'})
                return
            }
        }
    })
    
    ws.value = {status, data, send, open, close}

    send(JSON.stringify({type: 'channel', data: route.params.id}))

    localStream = await navigator.mediaDevices.getUserMedia(constraints)
    localVideo.value!.srcObject = localStream
})

onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", leaveChannel);
});
</script>

<style>

</style>