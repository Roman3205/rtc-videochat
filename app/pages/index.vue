<template>
  <div class="flex flex-col items-center justify-center h-screen">
    <h1 class="text-4xl font-bold mb-4 text-center">Welcome to the WebRTC Video Chat App</h1>
    <p class="text-lg mb-8 text-center">Connect with others through video chat using WebRTC technology.</p>
    <UFieldGroup size="xl">
        <UInput @keyup.enter="enterRoom" v-model="roomId" color="neutral" variant="outline" placeholder="Enter room id" />

        <UTooltip text="Enter the room">
        <UButton
        @click="enterRoom"
            color="neutral"
            variant="subtle"
            icon="i-lucide-arrow-right"
        />
        </UTooltip>
    </UFieldGroup>
    
  </div>
</template>

<script lang="ts" setup>
const roomId = ref('')

const enterRoom = () => {
    if (!roomId.value) return
    navigateTo(`/rooms/${roomId.value}`)
}
</script>

<style>

</style>