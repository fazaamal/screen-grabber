<template>
  <div class="screenshot-ui">
    <h1>Screenshot Grabber</h1>
    <form @submit.prevent="handleSubmit">
      <label>
        <input type="radio" value="local" v-model="backendMode" />
        Use {{ webUrl }}
      </label>
      <label>
        <input type="radio" value="remote" v-model="backendMode" />
        Use custom deployed backend
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
        Engine:
        <div class="radio-group">
          <label>
            <input type="radio" value="playwright" v-model="engine" />
            Playwright
          </label>
          <label>
            <input type="radio" value="patchright" v-model="engine" />
            Patchright
          </label>
        </div>
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
    <div v-if="imageSrc || openGraphData">
      <h2>Results</h2>
      <div v-if="imageSrc" class="screenshot-section">
        <h3>Screenshot</h3>
        <img
          :src="imageSrc"
          :alt="'Screenshot of ' + url"
          style="max-width: 100%; border: 1px solid #ccc"
        />
      </div>
      <div v-if="openGraphData" class="og-section">
        <h3>Open Graph Data</h3>
        <div class="og-preview">
          <div v-if="openGraphData.ogImage" class="og-image">
            <img
              :src="openGraphData.ogImage[0]?.url"
              :alt="openGraphData.ogTitle || 'Preview image'"
            />
          </div>
          <div class="og-content">
            <div v-if="openGraphData.ogTitle" class="og-title">
              {{ openGraphData.ogTitle }}
            </div>
            <div v-if="openGraphData.ogDescription" class="og-description">
              {{ openGraphData.ogDescription }}
            </div>
            <div v-if="openGraphData.ogUrl" class="og-url">
              {{ openGraphData.ogUrl }}
            </div>
          </div>
        </div>
        <details class="og-details">
          <summary>Raw Open Graph Data</summary>
          <pre>{{ JSON.stringify(openGraphData, null, 2) }}</pre>
        </details>
      </div>
      <div v-if="ogError" class="error">Open Graph Error: {{ ogError }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"

const webUrl = ref("")
onBeforeMount(() => {
  webUrl.value = window.location.origin + "/api/screenshot"
})
const url = ref("https://github.com")
const width = ref(1080)
const height = ref(1080)
const quality = ref(80)
const filetype = ref("jpeg")
const loading = ref(false)
const error = ref("")
const imageSrc = ref("")
const openGraphData = ref<any>(null)
const ogError = ref("")

const backendMode = ref<"local" | "remote">("local")
const remoteBaseUrl = ref("https://your-deployed-url.com")
const engine = ref<"patchright" | "playwright">("playwright")

const handleSubmit = async () => {
  loading.value = true
  error.value = ""
  imageSrc.value = ""
  openGraphData.value = null
  ogError.value = ""
  try {
    const params = new URLSearchParams({
      url: url.value,
      width: width.value.toString(),
      height: height.value.toString(),
      quality: quality.value.toString(),
      filetype: filetype.value,
      engine: engine.value,
    })
    let endpoint = ""
    if (backendMode.value === "local") {
      endpoint = `/api/screenshot?${params.toString()}`
    } else {
      let base = remoteBaseUrl.value.replace(/\/$/, "")
      endpoint = `${base}/api/screenshot?${params.toString()}`
    }
    // Fetch screenshot and OG data in parallel
    const screenshotPromise = fetch(endpoint)
    const ogPromise = fetch(`/api/og?url=${encodeURIComponent(url.value)}`)
    const [screenshotRes, ogRes] = await Promise.all([
      screenshotPromise,
      ogPromise,
    ])
    // Handle screenshot
    if (!screenshotRes.ok) {
      let errMsg = "Unknown error"
      try {
        const err = await screenshotRes.json()
        errMsg = err.error || errMsg
      } catch {}
      throw new Error(errMsg)
    }
    const blob = await screenshotRes.blob()
    imageSrc.value = URL.createObjectURL(blob)
    // Handle OG
    if (ogRes.ok) {
      const ogJson = await ogRes.json()
      if (ogJson.openGraph) {
        openGraphData.value = ogJson.openGraph
      } else if (ogJson.error) {
        ogError.value = ogJson.error
      }
    } else {
      try {
        const ogJson = await ogRes.json()
        ogError.value = ogJson.error || "Failed to fetch Open Graph data"
      } catch {
        ogError.value = "Failed to fetch Open Graph data"
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.screenshot-ui {
  max-width: 800px;
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
.radio-group {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}
.radio-group label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
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
.screenshot-section,
.og-section {
  margin-top: 2rem;
}
.og-preview {
  display: flex;
  gap: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  background: #fff;
  margin-bottom: 1rem;
}
.og-image img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
}
.og-content {
  flex: 1;
}
.og-title {
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}
.og-description {
  color: #666;
  margin-bottom: 0.5rem;
}
.og-url {
  color: #0070f3;
  font-size: 0.9rem;
}
.og-details {
  margin-top: 1rem;
}
.og-details pre {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.8rem;
}
</style>
