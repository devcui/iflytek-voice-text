const AudioWorker = () => {
    const transAudioData = {}
    transAudioData.transCode = (audioData) => {
        let output = transAudioData.to16Hz(audioData)
        output = transAudioData.to16BitPCM(output)
        output = Array.from(new Uint8Array(output.buffer))
        transAudioData.onmessage(output)
    }

    transAudioData.to16Hz = (audioData) => {
        let data = new Float32Array(audioData)
        let fitCount = Math.round(data.length * (16000 / 44100))
        let newData = new Float32Array(fitCount)
        let springFactor = (data.length - 1) / (fitCount - 1)
        newData[0] = data[0]
        for (let i = 1; i < fitCount - 1; i++) {
            let tmp = i * springFactor
            let before = Math.floor(tmp).toFixed()
            let after = Math.ceil(tmp).toFixed()
            let atPoint = tmp - before
            newData[i] = data[before] + (data[after] - data[before]) * atPoint
        }
        newData[fitCount - 1] = data[data.length - 1]
        return newData
    }


    transAudioData.to16BitPCM = (input) => {
        let dataLength = input.length * (16 / 8)
        let dataBuffer = new ArrayBuffer(dataLength)
        let dataView = new DataView(dataBuffer)
        let offset = 0
        for (let i = 0; i < input.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, input[i]))
            dataView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
        }
        return dataView
    }


    return transAudioData;
}
