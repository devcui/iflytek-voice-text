package com.yunzainfo.cloud.voice.web;

import com.yunzainfo.cloud.voice.utils.Btoa;
import com.yunzainfo.cloud.voice.utils.Crypto;
import com.yunzainfo.cloud.voice.utils.Gtm;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Controller
@RequestMapping("/ws")
public class WsController {

    @ResponseBody
    @RequestMapping(method = RequestMethod.GET, value = "/url")
    public Map<String, String> url() throws Exception {
        String url = "wss://iat-api.xfyun.cn/v2/iat";
        String host = "iat-api.xfyun.cn";
        String apiKey = "20f3fd5b87e8a373173acbe9f9bba083";
        String apiSecret = "89955531891aad42d23e91bb536c61b8";
        String date = Gtm.toGMTString(new Date());
        String algorithm = "hmac-sha256";
        String headers = "host date request-line";
        String signatureOrigin = "host: " + host + "\ndate: " + date + "\nGET /v2/iat HTTP/1.1";
        String signatureSha = Crypto.HMACSHA256(signatureOrigin, apiSecret);
        String signature = Base64.getEncoder().encodeToString(signatureSha.getBytes());
        String authorizationOrigin = "api_key=" + apiKey + ", algorithm=" + algorithm + ", headers=" + headers + ", signature=" + signature + "";
        String authorization = Btoa.botaEncodePassword(authorizationOrigin);
        String connectUrl = url + "?authorization=" + authorization + "&date=" + date + "&host=" + host;
        Map<String, String> result = new HashMap<>();
        result.put("url", connectUrl);
        return result;
    }

}
