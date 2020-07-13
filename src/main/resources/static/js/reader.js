const url = "wss://iat-api.xfyun.cn/v2/iat?authorization=YXBpX2tleT0iMjBmM2ZkNWI4N2U4YTM3MzE3M2FjYmU5ZjliYmEwODMiLCBhbGdvcml0aG09ImhtYWMtc2hhMjU2IiwgaGVhZGVycz0iaG9zdCBkYXRlIHJlcXVlc3QtbGluZSIsIHNpZ25hdHVyZT0idTR1Y0h6RTE0WjVvYU5wdFFaODArbTVUNkxrSWlmUGdxNDdaU1VIY3hwVT0i&date=Mon, 13 Jul 2020 12:50:28 GMT&host=iat-api.xfyun.cn";

const Reader = ({lang, accent, appId, audioWorker}) => {
    const reader = {
        status: 'null',
        language: lang || 'zh-cn',
        accent: accent || 'mandarin',
        appId: appId || '5efa9b44',
        audioData: [],
        resultText: '',
        resultTextTemp: '',
        audioWorker: audioWorker || null,
        audioContext: null,
        scriptProcessor: null,
        mediaSource: null,
        webSocket: null,
    };

    reader.setResultText = ({resultText, resultTextTemp} = {}) => {
        reader.onTextChange && reader.onTextChange(resultTextTemp || resultText || '');
        resultText !== undefined && (reader.resultText = resultText);
        resultTextTemp !== undefined && (reader.resultTextTemp = resultTextTemp)
    };

    reader.toBase64 = (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return window.btoa(binary)
    };

    reader.webSocketSend = () => {
        if (reader.webSocket.readyState !== 1) {
            return
        }
        let audioData = reader.audioData.splice(0, 1280);
        const params = {
            common: {
                app_id: reader.appId,
            },
            business: {
                language: reader.language, //小语种可在控制台--语音听写（流式）--方言/语种处添加试用
                domain: 'iat',
                accent: reader.accent, //中文方言可在控制台--语音听写（流式）--方言/语种处添加试用
                vad_eos: 5000,
                dwa: 'wpgs', //为使该功能生效，需到控制台开通动态修正功能（该功能免费）
            },
            data: {
                status: 0,
                format: 'audio/L16;rate=16000',
                encoding: 'raw',
                audio: reader.toBase64(audioData),
            },
        };
        reader.webSocket.send(JSON.stringify(params));
        this.handlerInterval = setInterval(() => {
            // websocket未连接
            if (reader.webSocket.readyState !== 1) {
                reader.audioData = [];
                clearInterval(this.handlerInterval);
                return
            }
            if (reader.audioData.length === 0) {
                if (reader.status === 'end') {
                    reader.webSocket.send(
                        JSON.stringify({
                            data: {
                                status: 2,
                                format: 'audio/L16;rate=16000',
                                encoding: 'raw',
                                audio: '',
                            },
                        })
                    );
                    reader.audioData = [];
                    clearInterval(this.handlerInterval)
                }
                return false
            }
            audioData = reader.audioData.splice(0, 1280);
            // 中间帧
            reader.webSocket.send(
                JSON.stringify({
                    data: {
                        status: 1,
                        format: 'audio/L16;rate=16000',
                        encoding: 'raw',
                        audio: reader.toBase64(audioData),
                    },
                })
            )
        }, 40)
    };
    reader.result = (resultData) => {
        // 识别结束
        let jsonData = JSON.parse(resultData);
        if (jsonData.data && jsonData.data.result) {
            let data = jsonData.data.result;
            let str = '';
            let ws = data.ws;
            for (let i = 0; i < ws.length; i++) {
                str = str + ws[i].cw[0].w
            }
            // 开启wpgs会有此字段(前提：在控制台开通动态修正功能)
            // 取值为 "apd"时表示该片结果是追加到前面的最终结果；取值为"rpl" 时表示替换前面的部分结果，替换范围为rg字段
            if (data.pgs) {
                if (data.pgs === 'apd') {
                    // 将resultTextTemp同步给resultText
                    reader.setResultText({
                        resultText: reader.resultTextTemp,
                    })
                }
                // 将结果存储在resultTextTemp中
                reader.setResultText({
                    resultTextTemp: reader.resultText + str,
                })
            } else {
                reader.setResultText({
                    resultText: reader.resultText + str,
                })
            }
        }
        if (jsonData.code === 0 && jsonData.data.status === 2) {
            reader.webSocket.close()
        }
        if (jsonData.code !== 0) {
            reader.webSocket.close();
            console.log(`${jsonData.code}:${jsonData.message}`)
        }
    };

    reader.setStatus = (status) => {
        reader.onWillStatusChange && reader.status !== status && reader.onWillStatusChange(this.status, status);
        reader.status = status
    };

    reader.connectWebSocket = () => {
        if ('WebSocket' in window) {
            reader.webSocket = new WebSocket(url)
        } else if ('MozWebSocket' in window) {
            reader.webSocket = new MozWebSocket(url)
        } else {
            alert('浏览器不支持WebSocket');
            return
        }
        reader.setStatus("init");
        reader.webSocket.onopen = (e) => {
            reader.setStatus('ing');
            // 重新开始录音
            setTimeout(() => {
                reader.webSocketSend()
            }, 500)
        };
        reader.webSocket.onmessage = e => {
            reader.result(e.data)
        };
        reader.webSocket.onerror = e => {
            reader.recorderStop()
        };
        reader.webSocket.onclose = e => {
            reader.recorderStop()
        }
    };

    reader.recorderInit = () => {
        getMediaSuccess = (stream) => {
            console.log('getMediaSuccess')
            console.log(stream)
            // 创建一个用于通过JavaScript直接处理音频
            this.scriptProcessor = reader.audioContext.createScriptProcessor(0, 1, 1)
            this.scriptProcessor.onaudioprocess = e => {
                console.log(e)
                // 去处理音频数据
                if (this.status === 'ing') {
                    console.log(e.inputBuffer.getChannelData(0))
                    reader.audioWorker.onmessage(e.inputBuffer.getChannelData(0))
                }
            }
            // 创建一个新的MediaStreamAudioSourceNode 对象，使来自MediaStream的音频可以被播放和操作
            this.mediaSource = reader.audioContext.createMediaStreamSource(stream)
            // 连接
            this.mediaSource.connect(this.scriptProcessor)
            this.scriptProcessor.connect(reader.audioContext.destination)
            reader.connectWebSocket()
        };

        getMediaFail = (e) => {
            alert('请求麦克风失败');
            console.log(e)
            reader.audioContext && reader.audioContext.close();
            reader.audioContext = undefined;
            // 关闭websocket
            if (reader.webSocket && reader.webSocket.readyState === 1) {
                reader.webSocket.close()
            }
        }
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia;

        try {
            reader.audioContext = new (window.AudioContext || window.webkitAudioContext)()
            reader.audioContext.resume();
            if (!reader.audioContext) {
                alert("浏览器不支持WebAudioAPI接口!");
                return
            }
        } catch (e) {
            if (!reader.audioContext) {
                alert("浏览器不支持WebAudioAPI接口!");
                return
            }
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            })
                .then(stream => {
                    getMediaSuccess(stream)
                })
                .catch(e => {
                    getMediaFail(e)
                })
        } else if (navigator.getUserMedia) {
            navigator.getUserMedia({
                    audio: true,
                    video: false,
                },
                stream => {
                    getMediaSuccess(stream)
                },
                function (e) {
                    getMediaFail(e)
                }
            )
        } else {
            if (navigator.userAgent.toLowerCase().match(/chrome/) && location.origin.indexOf('https://') < 0) {
                alert('chrome下获取浏览器录音功能，因为安全性问题，需要在localhost或127.0.0.1或https下才能获取权限')
            } else {
                alert('无法获取浏览器录音功能，请升级浏览器或使用chrome')
            }
            reader.audioContext && reader.audioContext.close();
        }
    };


    reader.audioData.onmessage = (event) => {
        reader.audioData.push(...event.data)
    };

    reader.recorderStart = () => {
        if (!reader.audioContext) {
            reader.recorderInit();
        } else {
            reader.audioContext.resume();
            reader.connectWebSocket()
        }
    };


    reader.startListen = () => {
        reader.recorderStart();
        reader.setResultText({
            resultText: '',
            resultTextTemp: ''
        })
    };

    reader.stopListen = () => {
        reader.recorderStop()
    };
    reader.recorderStop = () => {
        if (!(/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgen))) {
            reader.audioContext && reader.audioContext.suspend()
        }
        reader.setStatus('end')
    }
    return reader;
};
