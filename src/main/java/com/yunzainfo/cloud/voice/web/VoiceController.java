package com.yunzainfo.cloud.voice.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

@Controller
public class VoiceController {

    @RequestMapping(value = "index", method = RequestMethod.GET)
    public String index() {
        return "index";
    }

    @RequestMapping(value = "index2", method = RequestMethod.GET)
    public String index2() {
        return "index2";
    }


}
