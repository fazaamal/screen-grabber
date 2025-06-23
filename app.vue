<template>
  <div class="screenshot-ui">
    <h1>Screenshot Grabber</h1>
    <form @submit.prevent="handleSubmit">
      <label>
        <input type="radio" value="local" v-model="backendMode" />
        Use local backend
      </label>
      <label>
        <input type="radio" value="remote" v-model="backendMode" />
        Use deployed backend
      </label>
      <label v-if="backendMode === 'remote'">
        Remote base URL:
        <input
          v-model="remoteBaseUrl"
          type="text"
          placeholder="https://your-deployed-url.com"
          :disabled="backendMode !== 'remote'"
          required
        />
      </label>
      <label>
        URL:
        <input
          v-model="url"
          type="text"
          placeholder="https://example.com"
          required
        />
      </label>
      <label>
        Width:
        <input
          v-model.number="width"
          type="number"
          min="100"
          max="3840"
          required
        />
      </label>
      <label>
        Height:
        <input
          v-model.number="height"
          type="number"
          min="100"
          max="3840"
          required
        />
      </label>
      <label>
        Quality:
        <input
          v-model.number="quality"
          type="number"
          min="1"
          max="100"
          required
        />
      </label>
      <label>
        Filetype:
        <select v-model="filetype">
          <option value="jpeg">JPEG</option>
          <option value="png">PNG</option>
        </select>
      </label>
      <button type="submit">Take Screenshot</button>
    </form>
    <div v-if="loading">Loading...</div>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="imageSrc">
      <h2>Screenshot Result</h2>
      <img
        :src="imageSrc"
        :alt="'Screenshot of ' + url"
        style="max-width: 100%; border: 1px solid #ccc"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"

const url = ref("https://github.com")
const width = ref(1080)
const height = ref(1080)
const quality = ref(80)
const filetype = ref("jpeg")
const loading = ref(false)
const error = ref("")
const imageSrc = ref("")

const backendMode = ref<"local" | "remote">("local")
const remoteBaseUrl = ref("https://your-deployed-url.com")

const handleSubmit = async () => {
  loading.value = true
  error.value = ""
  imageSrc.value = ""
  try {
    const params = new URLSearchParams({
      url: url.value,
      width: width.value.toString(),
      height: height.value.toString(),
      quality: quality.value.toString(),
      filetype: filetype.value,
    })
    let endpoint = ""
    if (backendMode.value === "local") {
      endpoint = `/api/screenshot?${params.toString()}`
    } else {
      let base = remoteBaseUrl.value.replace(/\/$/, "")
      endpoint = `${base}/api/screenshot?${params.toString()}`
    }
    const res = await fetch(endpoint)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Unknown error")
    }
    const blob = await res.blob()
    imageSrc.value = URL.createObjectURL(blob)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.screenshot-ui {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fafbfc;
  box-shadow: 0 2px 8px #0001;
}
form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
label {
  display: flex;
  flex-direction: column;
  font-weight: 500;
}
button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  background: #0070f3;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background: #0059c9;
}
.error {
  color: #c00;
  margin-top: 1rem;
}
</style>
