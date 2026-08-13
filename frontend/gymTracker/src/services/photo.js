// Reads an image file and returns a downscaled JPEG data URL small enough to
// live inside the IndexedDB meta store and JSON backups.
export function imageFileToDataUrl(file, maxSize = 512) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type?.startsWith('image/')) {
            reject(new Error('Unsupported file type. Please choose an image.'))
            return
        }
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error || new Error('Could not read image'))
        reader.onload = () => {
            const img = new Image()
            img.onerror = () => reject(new Error('Could not load image'))
            img.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight))
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(img.naturalWidth * scale)
                canvas.height = Math.round(img.naturalHeight * scale)
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Could not process image'))
                    return
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                resolve(canvas.toDataURL('image/jpeg', 0.8))
            }
            img.src = reader.result
        }
        reader.readAsDataURL(file)
    })
}
